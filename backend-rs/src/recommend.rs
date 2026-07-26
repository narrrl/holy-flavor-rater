//! Flavor recommendations: "tasters like you also liked X".
//!
//! User-based collaborative filtering (CF) with a Bayesian-popularity fallback for
//! cold-start users. Kept pure (no DB) so the scoring math is unit-testable; the
//! route handler loads the rating matrix and calls [`recommend`].
//!
//! At the current scale (tens of users, hundreds of ratings) this runs in-process
//! per request in well under a millisecond. If the dataset grows by orders of
//! magnitude, move the call behind a scheduled job that precomputes per-user results
//! — the math here is unchanged.
//!
//! # Two rating sources
//!
//! The community's own 1–10 ratings are the primary signal. On top of that sits
//! [`ExternalSignals`] — anonymous shop reviews ingested from reviews.io by the
//! `sync_reviews` job (~26k of them vs. our few hundred). They are *not* mixed into
//! the rating matrix, for two reasons:
//!
//! 1. They are 1–5 stars and heavily inflated (72% are 5★, store average 4.6), so
//!    feeding them in raw would drag the global mean up and rank flavors by how
//!    much shop traffic they get rather than how good they are.
//! 2. Most external reviewers leave one or two reviews, all 5★ — zero variance, so
//!    the Pearson and adjusted-cosine maths below divide by zero and discard them
//!    anyway.
//!
//! Instead they feed in two places where they're statistically sound:
//! - as an **informed Bayesian prior** in [`popularity`], replacing the flat global
//!   mean, so a flavor with three community ratings is shrunk toward what a few
//!   thousand buyers thought of it rather than toward the catalog average;
//! - as a **co-occurrence layer** in [`similar_flavors`], where "the same anonymous
//!   buyer liked both" is meaningful even when every rating they left was 5★.

use std::collections::{HashMap, HashSet};

/// One cell of the user×flavor rating matrix.
#[derive(Clone, Copy, Debug)]
pub struct RatingInput {
    pub user_id: i32,
    pub flavor_id: i32,
    pub score: f64,
}

/// Where a recommendation came from — drives the frontend copy ("cf" → "tasters like
/// you", "popular" → "popular in the community").
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecSource {
    /// Collaborative filtering over similar users.
    Cf,
    /// Cold-start / fallback Bayesian-popularity ranking.
    Popular,
    /// Popularity ranking for a flavor nobody here has rated yet — the score comes
    /// entirely from anonymous shop reviews.
    Shop,
}

impl RecSource {
    pub fn as_str(self) -> &'static str {
        match self {
            RecSource::Cf => "cf",
            RecSource::Popular => "popular",
            RecSource::Shop => "shop",
        }
    }
}

#[derive(Clone, Debug)]
pub struct Recommendation {
    pub flavor_id: i32,
    pub predicted_score: f64,
    /// Number of similar users whose ratings backed this (CF), or the flavor's total
    /// rating count (popularity). Surfaced as the "N tasters" reason.
    pub contributing_neighbours: i64,
    /// Anonymous shop reviews backing this flavor, if any. Zero when the external
    /// feed hasn't been synced or doesn't cover the flavor.
    pub external_reviews: i64,
    pub source: RecSource,
}

// --- External (shop-review) signal -------------------------------------------

/// One anonymous shop review, already resolved to a flavor.
#[derive(Clone, Copy, Debug)]
pub struct ExternalInput {
    /// Opaque per-reviewer key (a truncated salted hash of the upstream reviewer
    /// id). Only equality matters — it exists so we can tell "one buyer rated both
    /// of these" from "two unrelated buyers".
    pub reviewer: u64,
    pub flavor_id: i32,
    /// Upstream rating on its native 1–5 star scale.
    pub stars: i32,
}

/// Aggregate stats for one flavor's shop reviews.
#[derive(Clone, Copy, Debug, Default)]
pub struct ExternalStat {
    pub count: i64,
    /// Mean rating, rescaled to the internal 1–10 scale.
    pub mean: f64,
}

/// Below this many shop reviews a flavor's external signal is treated as noise.
const EXT_MIN_REVIEWS: i64 = 3;
/// Pseudo-observations of prior strength contributed per shop review. Well under
/// 1: a shop review is much weaker evidence than a deliberate community rating.
const EXT_PRIOR_PER_REVIEW: f64 = 0.4;
/// Ceiling on external prior strength, in pseudo-observations. Without it a flavor
/// with 3,000 shop reviews would pin its own score and ignore the community.
const EXT_PRIOR_MAX: f64 = 12.0;
/// How much of a flavor's deviation from the external mean carries onto the
/// internal scale. 1.0 = as-is; shop ratings are compressed near the top, so this
/// deliberately does not try to stretch them out.
const EXT_SPREAD: f64 = 1.0;
/// Stars at or above this count as "liked" for co-occurrence. 4★+ is the standard
/// positive-sentiment cut for 5-star shop reviews.
const EXT_LIKE_STARS: i32 = 4;
/// Minimum shared likers before external co-occurrence similarity is trusted.
const EXT_MIN_COOC: i64 = 3;
/// Confidence ramp on shared likers: confidence is `min(shared, K)/K`.
const EXT_SIM_CONF_K: f64 = 8.0;
/// Confidence ramp on internal co-raters, same shape.
const INT_SIM_CONF_K: f64 = 5.0;
/// Cap on how much the external co-occurrence layer can weigh relative to the
/// community's own adjusted-cosine similarity, at equal confidence.
const EXT_SIM_WEIGHT: f64 = 0.6;

/// Map an upstream 1–5 star rating onto the internal 1–10 scale, endpoints aligned
/// (1★→1.0, 3★→5.5, 5★→10.0).
fn stars_to_internal(stars: i32) -> f64 {
    1.0 + (stars.clamp(1, 5) as f64 - 1.0) * 9.0 / 4.0
}

/// Precomputed aggregates over the shop-review feed. Built once per request (or
/// once per cache refresh) and shared by [`recommend`] and [`similar_flavors`].
#[derive(Clone, Debug, Default)]
pub struct ExternalSignals {
    per_flavor: HashMap<i32, ExternalStat>,
    /// Mean of every shop review on the internal scale — the recentring anchor.
    mean: f64,
    /// flavor -> distinct reviewers who *liked* it (>= [`EXT_LIKE_STARS`]).
    likers: HashMap<i32, i64>,
    /// Unordered flavor pair (low, high) -> reviewers who liked both.
    cooc: HashMap<(i32, i32), i64>,
    /// flavor -> the flavors it shares at least one liker with (co-occurrence
    /// adjacency, so [`similar_flavors`] doesn't scan every pair).
    neighbours: HashMap<i32, HashSet<i32>>,
}

impl ExternalSignals {
    /// Aggregate raw shop reviews. Duplicate (reviewer, flavor) pairs are collapsed
    /// to that reviewer's mean for the flavor — the feed can carry several reviews
    /// from one buyer for one product (repeat orders, per-variant reviews) and
    /// counting them repeatedly would let a single buyer weight the co-occurrence
    /// graph.
    pub fn build(rows: &[ExternalInput]) -> Self {
        // (reviewer, flavor) -> (sum of internal-scale scores, count)
        let mut per_pair: HashMap<(u64, i32), (f64, i64)> = HashMap::new();
        for row in rows {
            let e = per_pair
                .entry((row.reviewer, row.flavor_id))
                .or_insert((0.0, 0));
            e.0 += stars_to_internal(row.stars);
            e.1 += 1;
        }

        let mut per_flavor: HashMap<i32, ExternalStat> = HashMap::new();
        let mut likers: HashMap<i32, i64> = HashMap::new();
        let mut liked_by_reviewer: HashMap<u64, Vec<i32>> = HashMap::new();
        let mut total = 0.0;
        let mut n = 0i64;

        // Same "liked" cut as EXT_LIKE_STARS, expressed on the internal scale.
        let like_threshold = stars_to_internal(EXT_LIKE_STARS);

        for ((reviewer, flavor_id), (sum, count)) in &per_pair {
            let score = sum / *count as f64;
            let e = per_flavor.entry(*flavor_id).or_default();
            // Accumulate the sum in `mean` first, divide once at the end.
            e.mean += score;
            e.count += 1;
            total += score;
            n += 1;
            if score >= like_threshold {
                *likers.entry(*flavor_id).or_insert(0) += 1;
                liked_by_reviewer
                    .entry(*reviewer)
                    .or_default()
                    .push(*flavor_id);
            }
        }
        for stat in per_flavor.values_mut() {
            if stat.count > 0 {
                stat.mean /= stat.count as f64;
            }
        }

        let mut cooc: HashMap<(i32, i32), i64> = HashMap::new();
        let mut neighbours: HashMap<i32, HashSet<i32>> = HashMap::new();
        for liked in liked_by_reviewer.values() {
            // A buyer who liked 40 products (a reviewer of whole bundles) says
            // little about any specific pair, and contributes O(n²) pairs. Skip.
            if liked.len() < 2 || liked.len() > MAX_BASKET {
                continue;
            }
            for (i, &a) in liked.iter().enumerate() {
                for &b in &liked[i + 1..] {
                    if a == b {
                        continue;
                    }
                    let key = if a < b { (a, b) } else { (b, a) };
                    *cooc.entry(key).or_insert(0) += 1;
                    neighbours.entry(a).or_default().insert(b);
                    neighbours.entry(b).or_default().insert(a);
                }
            }
        }

        Self {
            per_flavor,
            mean: if n == 0 { 0.0 } else { total / n as f64 },
            likers,
            cooc,
            neighbours,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.per_flavor.is_empty()
    }

    /// Shop-review stats for one flavor, or `None` if it has none.
    pub fn stat(&self, flavor_id: i32) -> Option<ExternalStat> {
        self.per_flavor.get(&flavor_id).copied()
    }

    /// Every flavor the feed covers with at least [`EXT_MIN_REVIEWS`] reviews.
    fn ranked_flavors(&self) -> impl Iterator<Item = i32> + '_ {
        self.per_flavor
            .iter()
            .filter(|(_, s)| s.count >= EXT_MIN_REVIEWS)
            .map(|(&f, _)| f)
    }

    /// Cosine similarity over the binary "was liked by" vectors of two flavors,
    /// plus the number of shared likers backing it. `None` below
    /// [`EXT_MIN_COOC`] shared likers.
    fn cooc_similarity(&self, a: i32, b: i32) -> Option<(f64, i64)> {
        let key = if a < b { (a, b) } else { (b, a) };
        let shared = *self.cooc.get(&key)?;
        if shared < EXT_MIN_COOC {
            return None;
        }
        let na = *self.likers.get(&a)? as f64;
        let nb = *self.likers.get(&b)? as f64;
        if na <= 0.0 || nb <= 0.0 {
            return None;
        }
        // Cosine (not raw count) so a flavor everyone buys doesn't look similar to
        // everything simply by being everywhere.
        Some((shared as f64 / (na * nb).sqrt(), shared))
    }
}

/// Reviewers who liked more than this many distinct flavors are dropped from the
/// co-occurrence graph (bulk/bundle reviewers — high pair count, low signal).
const MAX_BASKET: usize = 25;

/// The Bayesian prior to shrink a flavor's community score toward: normally the
/// catalog mean, but the shop-review consensus where we have enough of it.
/// Returns `(prior_mean, prior_strength, external_review_count)`.
fn prior_for(flavor_id: i32, internal_mean: f64, external: &ExternalSignals) -> (f64, f64, i64) {
    match external.stat(flavor_id) {
        Some(stat) if stat.count >= EXT_MIN_REVIEWS => {
            // Recentre: what matters is how this flavor sits *relative to* other
            // shop-reviewed flavors, not its absolute (inflated) star average.
            let deviation = (stat.mean - external.mean) * EXT_SPREAD;
            let prior_mean = (internal_mean + deviation).clamp(1.0, 10.0);
            let strength = BAYES_C + (EXT_PRIOR_PER_REVIEW * stat.count as f64).min(EXT_PRIOR_MAX);
            (prior_mean, strength, stat.count)
        }
        Some(stat) => (internal_mean, BAYES_C, stat.count),
        None => (internal_mean, BAYES_C, 0),
    }
}

// --- Tunables ----------------------------------------------------------------
/// Below this many of their own ratings a user is "cold" → popularity fallback.
const MIN_PROFILE: usize = 5;
/// A neighbour must share at least this many co-rated flavors to be trusted.
const MIN_OVERLAP: usize = 3;
/// Significance-weighting cap: similarity is scaled by `min(overlap, K)/K`.
const SIG_K: f64 = 5.0;
/// A CF candidate needs at least this many contributing neighbours.
const MIN_NEIGHBOURS: i64 = 2;
/// Bayesian prior strength for the popularity fallback.
const BAYES_C: f64 = 5.0;

/// Recommend up to `limit` flavors for `target`, given the full rating matrix and
/// the anonymous shop-review signal (pass `&ExternalSignals::default()` for none).
pub fn recommend(
    target: i32,
    ratings: &[RatingInput],
    external: &ExternalSignals,
    limit: usize,
) -> Vec<Recommendation> {
    if limit == 0 {
        return Vec::new();
    }

    // user -> (flavor -> score)
    let mut by_user: HashMap<i32, HashMap<i32, f64>> = HashMap::new();
    for r in ratings {
        by_user
            .entry(r.user_id)
            .or_default()
            .insert(r.flavor_id, r.score);
    }

    let target_ratings = by_user.get(&target).cloned().unwrap_or_default();
    let target_rated: HashSet<i32> = target_ratings.keys().copied().collect();

    // Cold start: too thin a profile to trust similarity → popularity.
    if target_ratings.len() < MIN_PROFILE {
        return popularity(&target_rated, ratings, external, limit);
    }

    let means: HashMap<i32, f64> = by_user
        .iter()
        .map(|(&u, rs)| (u, mean(rs.values().copied())))
        .collect();
    let target_mean = *means.get(&target).unwrap_or(&0.0);

    // Similarity (positive Pearson, significance-weighted) to each other user.
    let mut sims: HashMap<i32, f64> = HashMap::new();
    for (&v, v_ratings) in &by_user {
        if v == target {
            continue;
        }
        let v_mean = *means.get(&v).unwrap_or(&0.0);
        let common: Vec<i32> = target_ratings
            .keys()
            .filter(|f| v_ratings.contains_key(f))
            .copied()
            .collect();
        if common.len() < MIN_OVERLAP {
            continue;
        }
        let (mut num, mut du, mut dv) = (0.0, 0.0, 0.0);
        for f in &common {
            let a = target_ratings[f] - target_mean;
            let b = v_ratings[f] - v_mean;
            num += a * b;
            du += a * a;
            dv += b * b;
        }
        let den = du.sqrt() * dv.sqrt();
        if den == 0.0 {
            continue;
        }
        let mut sim = num / den;
        if sim <= 0.0 {
            continue; // only positively-correlated tasters
        }
        sim *= (common.len().min(SIG_K as usize) as f64) / SIG_K;
        sims.insert(v, sim);
    }

    // Predict a score for every flavor the target hasn't rated, from its neighbours.
    let mut acc: HashMap<i32, (f64, f64, i64)> = HashMap::new(); // flavor -> (num, |sim| sum, count)
    for (&v, &sim) in &sims {
        let v_mean = *means.get(&v).unwrap_or(&0.0);
        for (&f, &score) in &by_user[&v] {
            if target_rated.contains(&f) {
                continue;
            }
            let e = acc.entry(f).or_insert((0.0, 0.0, 0));
            e.0 += sim * (score - v_mean);
            e.1 += sim.abs();
            e.2 += 1;
        }
    }

    let mut recs: Vec<Recommendation> = acc
        .into_iter()
        .filter(|(_, (_, den, count))| *count >= MIN_NEIGHBOURS && *den > 0.0)
        .map(|(flavor_id, (num, den, count))| Recommendation {
            flavor_id,
            predicted_score: (target_mean + num / den).clamp(1.0, 10.0),
            contributing_neighbours: count,
            external_reviews: external.stat(flavor_id).map(|s| s.count).unwrap_or(0),
            source: RecSource::Cf,
        })
        .collect();

    // No confident CF candidates → fall back to popularity.
    if recs.is_empty() {
        return popularity(&target_rated, ratings, external, limit);
    }

    sort_recs(&mut recs);
    recs.truncate(limit);

    // CF only ever proposes flavors the target's neighbours have rated, which at
    // our scale rarely fills the shelf. Top up from the (now shop-informed)
    // popularity ranking rather than returning a half-empty row.
    if recs.len() < limit {
        let mut seen: HashSet<i32> = target_rated.clone();
        seen.extend(recs.iter().map(|r| r.flavor_id));
        for extra in popularity(&seen, ratings, external, limit - recs.len()) {
            recs.push(extra);
        }
    }
    recs
}

/// Bayesian-average popularity ranking over flavors the target hasn't rated. Damps
/// flavors with few ratings toward a prior so one 10/10 can't top the chart.
///
/// The prior is the catalog mean when we know nothing else, and the shop-review
/// consensus for that specific flavor where the feed has enough of it — see
/// [`prior_for`]. That is where the external data earns its keep: a flavor with two
/// community ratings stops being shrunk toward "average catalog item" and starts
/// being shrunk toward what a few thousand buyers actually thought of it.
///
/// Flavors with no community ratings at all are included too (ranked purely on
/// their prior, tagged [`RecSource::Shop`]) — otherwise a freshly-synced flavor
/// could never be discovered.
fn popularity(
    target_rated: &HashSet<i32>,
    ratings: &[RatingInput],
    external: &ExternalSignals,
    limit: usize,
) -> Vec<Recommendation> {
    // With no community ratings at all, anchor on the external scale instead of
    // `mean()`'s 0.0, which would put every prior at the bottom of the range.
    let internal_mean = if ratings.is_empty() {
        if external.is_empty() {
            0.0
        } else {
            external.mean
        }
    } else {
        mean(ratings.iter().map(|r| r.score))
    };

    let mut agg: HashMap<i32, (f64, i64)> = HashMap::new(); // flavor -> (sum, count)
    for r in ratings {
        if target_rated.contains(&r.flavor_id) {
            continue;
        }
        let e = agg.entry(r.flavor_id).or_insert((0.0, 0));
        e.0 += r.score;
        e.1 += 1;
    }
    // Shop-reviewed flavors nobody here has rated are candidates too.
    for flavor_id in external.ranked_flavors() {
        if target_rated.contains(&flavor_id) {
            continue;
        }
        agg.entry(flavor_id).or_insert((0.0, 0));
    }

    let mut recs: Vec<Recommendation> = agg
        .into_iter()
        .map(|(flavor_id, (sum, count))| {
            let (prior_mean, prior_strength, external_reviews) =
                prior_for(flavor_id, internal_mean, external);
            Recommendation {
                flavor_id,
                predicted_score: (prior_strength * prior_mean + sum)
                    / (prior_strength + count as f64),
                contributing_neighbours: count,
                external_reviews,
                source: if count == 0 {
                    RecSource::Shop
                } else {
                    RecSource::Popular
                },
            }
        })
        .collect();
    sort_recs(&mut recs);
    recs.truncate(limit);
    recs
}

/// Deterministic ordering: predicted score desc, then more neighbours, then flavor id.
fn sort_recs(recs: &mut [Recommendation]) {
    recs.sort_by(|a, b| {
        b.predicted_score
            .partial_cmp(&a.predicted_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.contributing_neighbours.cmp(&a.contributing_neighbours))
            .then(a.flavor_id.cmp(&b.flavor_id))
    });
}

fn mean(values: impl Iterator<Item = f64>) -> f64 {
    let (sum, n) = values.fold((0.0, 0i64), |(s, n), v| (s + v, n + 1));
    if n == 0 {
        0.0
    } else {
        sum / n as f64
    }
}

// --- Item-based CF: "people who liked this flavor also liked…" ---------------
/// A flavor co-rated needs at least this many shared raters with the target to be
/// trusted — similarity over 1 shared user is noise.
const MIN_CORATERS: usize = 2;

/// One flavor similar to a target flavor.
#[derive(Clone, Debug)]
pub struct SimilarFlavor {
    pub flavor_id: i32,
    /// Blended, confidence-discounted similarity in (0, 1]. Higher = more alike.
    /// Not a raw correlation: a pair backed by little evidence scores low even if
    /// the evidence it has agrees perfectly. Meant for ranking, not for display as
    /// a "% match".
    pub similarity: f64,
    /// How many users rated both this flavor and the target (the confidence count).
    pub co_raters: i64,
    /// How many anonymous shop reviewers liked both this flavor and the target.
    pub external_co_reviewers: i64,
}

/// Flavors most similar to `target_flavor`, blending two independent signals:
///
/// - **adjusted cosine** over the community's rating vectors (each user's ratings
///   mean-centred to cancel rater bias), and
/// - **co-occurrence cosine** over anonymous shop reviewers who liked both flavors.
///
/// Each contributes in proportion to its own confidence (how many raters back it),
/// with the external side capped at [`EXT_SIM_WEIGHT`] of the community's pull. A
/// candidate qualifies on either signal, so shop data extends coverage to flavor
/// pairs the community hasn't co-rated yet — but a *negative* community
/// correlation vetoes the pair outright, no matter what the shop data says: our own
/// tasters disagreeing is stronger evidence than strangers buying both.
///
/// Pure (no DB) and computed on demand; at current scale this is sub-millisecond.
/// Empty if the target has too little of either signal to compare against.
pub fn similar_flavors(
    target_flavor: i32,
    ratings: &[RatingInput],
    external: &ExternalSignals,
    limit: usize,
) -> Vec<SimilarFlavor> {
    if limit == 0 {
        return Vec::new();
    }

    // user -> mean of their ratings (for mean-centring)
    let mut by_user: HashMap<i32, Vec<f64>> = HashMap::new();
    for r in ratings {
        by_user.entry(r.user_id).or_default().push(r.score);
    }
    let user_mean: HashMap<i32, f64> = by_user
        .iter()
        .map(|(&u, vs)| (u, mean(vs.iter().copied())))
        .collect();

    // flavor -> (user -> mean-centred score)
    let mut by_flavor: HashMap<i32, HashMap<i32, f64>> = HashMap::new();
    for r in ratings {
        let centred = r.score - user_mean.get(&r.user_id).copied().unwrap_or(0.0);
        by_flavor
            .entry(r.flavor_id)
            .or_default()
            .insert(r.user_id, centred);
    }

    let empty_vec = HashMap::new();
    let target_vec = by_flavor.get(&target_flavor).unwrap_or(&empty_vec);

    // Candidates: anything the community co-rated with the target, plus anything a
    // shop reviewer liked alongside it.
    let mut candidates: HashSet<i32> = by_flavor.keys().copied().collect();
    if let Some(ext_neighbours) = external.neighbours.get(&target_flavor) {
        candidates.extend(ext_neighbours.iter().copied());
    }
    candidates.remove(&target_flavor);

    let mut sims: Vec<SimilarFlavor> = Vec::new();
    for f in candidates {
        // --- community side: adjusted cosine over mean-centred ratings ---
        let mut internal: Option<(f64, i64)> = None;
        let mut vetoed = false;
        if let Some(f_vec) = by_flavor.get(&f) {
            let (mut num, mut dt, mut df, mut co) = (0.0, 0.0, 0.0, 0i64);
            for (&u, &a) in target_vec {
                if let Some(&b) = f_vec.get(&u) {
                    num += a * b;
                    dt += a * a;
                    df += b * b;
                    co += 1;
                }
            }
            let den = dt.sqrt() * df.sqrt();
            if (co as usize) >= MIN_CORATERS && den != 0.0 {
                let sim = num / den;
                if sim > 0.0 {
                    internal = Some((sim, co));
                } else {
                    // Our own tasters actively disagree about these two — that
                    // outranks any amount of shop co-purchase.
                    vetoed = true;
                }
            }
        }
        if vetoed {
            continue;
        }

        // --- shop side: co-occurrence cosine over "liked both" ---
        let ext = external.cooc_similarity(target_flavor, f);

        let (int_sim, int_co) = internal.unwrap_or((0.0, 0));
        let (ext_sim, ext_co) = ext.unwrap_or((0.0, 0));
        if internal.is_none() && ext.is_none() {
            continue;
        }

        // Weight each side by its own confidence, so a pair backed by 8 community
        // co-raters isn't overruled by 3 shop reviewers, and vice versa.
        let int_conf = (int_co.min(INT_SIM_CONF_K as i64) as f64) / INT_SIM_CONF_K;
        let ext_conf = EXT_SIM_WEIGHT * (ext_co.min(EXT_SIM_CONF_K as i64) as f64) / EXT_SIM_CONF_K;
        if int_conf + ext_conf <= 0.0 {
            continue;
        }
        // Divide by the *maximum* achievable confidence, not the confidence we
        // actually have. Normalising by the latter would let three shop buyers with
        // a coincidentally perfect 1.0 co-occurrence outrank eight of our own
        // tasters at 0.9 — thin evidence has to shrink the score toward zero, not
        // just decide how the two sides are averaged.
        let similarity = (int_sim * int_conf + ext_sim * ext_conf) / (1.0 + EXT_SIM_WEIGHT);
        if similarity <= 0.0 {
            continue;
        }

        sims.push(SimilarFlavor {
            flavor_id: f,
            similarity,
            co_raters: int_co,
            external_co_reviewers: ext_co,
        });
    }

    // Deterministic: similarity desc, then more co-raters, then more shop
    // reviewers, then flavor id.
    sims.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.co_raters.cmp(&a.co_raters))
            .then(b.external_co_reviewers.cmp(&a.external_co_reviewers))
            .then(a.flavor_id.cmp(&b.flavor_id))
    });
    sims.truncate(limit);
    sims
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(user_id: i32, flavor_id: i32, score: f64) -> RatingInput {
        RatingInput {
            user_id,
            flavor_id,
            score,
        }
    }

    #[test]
    fn cold_start_user_gets_popularity() {
        // Target (1) has only 1 rating → cold. Others rate flavors 10/20.
        let ratings = vec![
            r(1, 100, 9.0),
            r(2, 10, 9.0),
            r(2, 20, 4.0),
            r(3, 10, 8.0),
            r(3, 20, 5.0),
        ];
        let recs = recommend(1, &ratings, &ExternalSignals::default(), 10);
        assert!(!recs.is_empty());
        assert!(recs.iter().all(|x| x.source == RecSource::Popular));
        // Flavor 10 (avg ~8.5) should outrank flavor 20 (avg ~4.5).
        assert_eq!(recs[0].flavor_id, 10);
        // Already-rated flavor 100 is excluded.
        assert!(recs.iter().all(|x| x.flavor_id != 100));
    }

    #[test]
    fn cf_recommends_what_similar_tasters_liked() {
        // Target (1) has a full profile (>= MIN_PROFILE ratings). Users 2 & 4 share
        // its taste and both loved flavor 99, which the target hasn't tried. User 3
        // is an opposite-taste decoy who rated 99 low — must be filtered out.
        let mut ratings = vec![
            // target's profile
            r(1, 1, 9.0),
            r(1, 2, 8.0),
            r(1, 3, 7.0),
            r(1, 4, 9.0),
            r(1, 5, 6.0),
            // similar taster 2 (agrees, plus loves 99)
            r(2, 1, 9.0),
            r(2, 2, 8.0),
            r(2, 3, 7.0),
            r(2, 4, 9.0),
            r(2, 99, 10.0),
            // similar taster 4 (>= MIN_OVERLAP, also loves 99) → 2nd neighbour for 99
            r(4, 1, 9.0),
            r(4, 2, 8.0),
            r(4, 3, 7.0),
            r(4, 99, 10.0),
        ];
        // opposite-taste user rates 99 low — negative correlation, must be filtered
        ratings.push(r(3, 1, 1.0));
        ratings.push(r(3, 2, 2.0));
        ratings.push(r(3, 3, 3.0));
        ratings.push(r(3, 99, 1.0));

        let recs = recommend(1, &ratings, &ExternalSignals::default(), 10);
        assert!(!recs.is_empty(), "expected CF recommendations");
        assert!(recs.iter().any(|x| x.source == RecSource::Cf));
        // The standout shared pick (99) should be recommended.
        let top = &recs[0];
        assert_eq!(top.flavor_id, 99);
        assert!(top.contributing_neighbours >= MIN_NEIGHBOURS);
        assert!(top.predicted_score > 7.0);
    }

    #[test]
    fn excludes_already_rated_and_respects_limit() {
        let ratings = vec![
            r(1, 1, 9.0),
            r(1, 2, 8.0),
            r(1, 3, 7.0),
            r(1, 4, 6.0),
            r(1, 5, 5.0),
            r(2, 1, 9.0),
            r(2, 2, 8.0),
            r(2, 3, 7.0),
            r(2, 6, 9.0),
            r(2, 7, 8.0),
            r(3, 1, 9.0),
            r(3, 2, 8.0),
            r(3, 3, 7.0),
            r(3, 6, 9.0),
            r(3, 7, 8.0),
        ];
        let recs = recommend(1, &ratings, &ExternalSignals::default(), 1);
        assert_eq!(recs.len(), 1);
        // never recommend a flavor the target already rated
        assert!(recs.iter().all(|x| ![1, 2, 3, 4, 5].contains(&x.flavor_id)));
    }

    #[test]
    fn similar_flavors_finds_co_liked() {
        // Flavors 1 & 2 move together (users who like one like the other); flavor 3
        // moves opposite. Target = flavor 1 → expect 2 ranked above (or instead of) 3.
        let ratings = vec![
            r(10, 1, 9.0),
            r(10, 2, 9.0),
            r(10, 3, 2.0),
            r(11, 1, 8.0),
            r(11, 2, 8.0),
            r(11, 3, 3.0),
            r(12, 1, 3.0),
            r(12, 2, 2.0),
            r(12, 3, 9.0),
        ];
        let sims = similar_flavors(1, &ratings, &ExternalSignals::default(), 10);
        assert!(!sims.is_empty(), "expected similar flavors");
        assert_eq!(sims[0].flavor_id, 2, "flavor 2 moves with flavor 1");
        assert!(sims[0].co_raters >= MIN_CORATERS as i64);
        // The anti-correlated flavor 3 is filtered out (negative similarity).
        assert!(sims.iter().all(|s| s.flavor_id != 3));
    }

    #[test]
    fn similar_flavors_needs_min_coraters() {
        // Only one shared rater between flavor 1 and 2 → below MIN_CORATERS → empty.
        let ratings = vec![r(10, 1, 9.0), r(10, 2, 9.0), r(11, 1, 8.0), r(12, 2, 7.0)];
        assert!(similar_flavors(1, &ratings, &ExternalSignals::default(), 10).is_empty());
    }

    #[test]
    fn similar_flavors_unknown_target_is_empty() {
        let ratings = vec![r(10, 1, 9.0), r(11, 1, 8.0)];
        assert!(similar_flavors(999, &ratings, &ExternalSignals::default(), 10).is_empty());
    }

    // --- external (shop-review) signal ---------------------------------------

    fn e(reviewer: u64, flavor_id: i32, stars: i32) -> ExternalInput {
        ExternalInput {
            reviewer,
            flavor_id,
            stars,
        }
    }

    /// `n` reviewers each leaving one `stars` review for `flavor`, ids offset so
    /// separate calls don't collide.
    fn bulk(flavor: i32, stars: i32, n: u64, offset: u64) -> Vec<ExternalInput> {
        (0..n).map(|i| e(offset + i, flavor, stars)).collect()
    }

    #[test]
    fn stars_map_onto_the_internal_scale_endpoints() {
        assert_eq!(stars_to_internal(1), 1.0);
        assert_eq!(stars_to_internal(3), 5.5);
        assert_eq!(stars_to_internal(5), 10.0);
        // Out-of-range input is clamped, never extrapolated.
        assert_eq!(stars_to_internal(0), 1.0);
        assert_eq!(stars_to_internal(9), 10.0);
    }

    #[test]
    fn external_prior_breaks_ties_between_thinly_rated_flavors() {
        // Two flavors, one community rating each, identical score → the community
        // data alone cannot separate them. The shop feed can: flavor 20 is loved,
        // flavor 10 is mediocre.
        let ratings = vec![r(2, 10, 8.0), r(3, 20, 8.0)];
        let mut rows = bulk(10, 3, 40, 0);
        rows.extend(bulk(20, 5, 40, 1_000));
        let external = ExternalSignals::build(&rows);

        let recs = recommend(1, &ratings, &external, 10);
        assert_eq!(
            recs[0].flavor_id, 20,
            "shop-loved flavor should win the tie"
        );
        assert!(recs[0].predicted_score > recs[1].predicted_score);
        assert_eq!(recs[0].external_reviews, 40);
    }

    #[test]
    fn external_prior_cannot_overturn_a_solid_community_verdict() {
        // The shop adores flavor 10; twelve of our own tasters think it's poor.
        // The prior is capped, so the community verdict must still win.
        let mut ratings: Vec<RatingInput> = (2..14).map(|u| r(u, 10, 2.0)).collect();
        ratings.extend((2..14).map(|u| r(u, 20, 8.0)));
        let mut rows = bulk(10, 5, 3_000, 0);
        rows.extend(bulk(20, 3, 5, 10_000));
        let external = ExternalSignals::build(&rows);

        let recs = recommend(1, &ratings, &external, 10);
        assert_eq!(
            recs[0].flavor_id, 20,
            "12 community ratings must outweigh the shop prior"
        );
    }

    #[test]
    fn unrated_flavor_surfaces_from_shop_reviews_alone() {
        // Flavor 99 has no community ratings at all — without external data it
        // could never be recommended.
        let ratings = vec![r(2, 10, 6.0), r(3, 10, 6.0)];
        let external = ExternalSignals::build(&bulk(99, 5, 50, 0));

        let recs = recommend(1, &ratings, &external, 10);
        let shop = recs
            .iter()
            .find(|x| x.flavor_id == 99)
            .expect("shop-only flavor should be a candidate");
        assert_eq!(shop.source, RecSource::Shop);
        assert_eq!(shop.contributing_neighbours, 0);
        assert_eq!(shop.external_reviews, 50);
    }

    #[test]
    fn external_reviews_below_the_floor_are_ignored() {
        // Two reviews is under EXT_MIN_REVIEWS → no prior, no candidacy.
        let ratings = vec![r(2, 10, 6.0), r(3, 10, 6.0)];
        let external = ExternalSignals::build(&bulk(99, 5, 2, 0));
        let recs = recommend(1, &ratings, &external, 10);
        assert!(recs.iter().all(|x| x.flavor_id != 99));
    }

    #[test]
    fn repeat_reviews_from_one_buyer_count_once() {
        // The feed carries several reviews from one buyer for one product (repeat
        // orders, per-variant reviews); they must not inflate the count.
        let rows = vec![e(1, 10, 5), e(1, 10, 5), e(1, 10, 5), e(2, 10, 5)];
        let external = ExternalSignals::build(&rows);
        assert_eq!(external.stat(10).unwrap().count, 2);
    }

    #[test]
    fn shop_co_occurrence_finds_pairs_the_community_has_not_co_rated() {
        // Nobody here has rated flavor 2 alongside flavor 1, so adjusted cosine has
        // nothing to say. Five shop buyers liked both → similarity from the shop
        // layer alone.
        let ratings = vec![r(10, 1, 9.0), r(11, 1, 8.0)];
        let mut rows: Vec<ExternalInput> = Vec::new();
        for i in 0..5 {
            rows.push(e(i, 1, 5));
            rows.push(e(i, 2, 5));
        }
        // A flavor liked by unrelated buyers — shares no reviewer with the target.
        rows.extend(bulk(3, 5, 5, 100));
        let external = ExternalSignals::build(&rows);

        let sims = similar_flavors(1, &ratings, &external, 10);
        assert_eq!(sims.len(), 1, "only the co-liked flavor qualifies");
        assert_eq!(sims[0].flavor_id, 2);
        assert_eq!(sims[0].co_raters, 0);
        assert_eq!(sims[0].external_co_reviewers, 5);
    }

    #[test]
    fn shop_co_occurrence_needs_min_shared_likers() {
        // Two shared likers is under EXT_MIN_COOC → not enough to claim similarity.
        let ratings = vec![r(10, 1, 9.0)];
        let mut rows: Vec<ExternalInput> = Vec::new();
        for i in 0..2 {
            rows.push(e(i, 1, 5));
            rows.push(e(i, 2, 5));
        }
        let external = ExternalSignals::build(&rows);
        assert!(similar_flavors(1, &ratings, &external, 10).is_empty());
    }

    #[test]
    fn low_star_shop_reviews_do_not_create_co_occurrence() {
        // "Bought both" is not "liked both": 2★ pairs must not link the flavors.
        let ratings = vec![r(10, 1, 9.0)];
        let mut rows: Vec<ExternalInput> = Vec::new();
        for i in 0..6 {
            rows.push(e(i, 1, 2));
            rows.push(e(i, 2, 2));
        }
        let external = ExternalSignals::build(&rows);
        assert!(similar_flavors(1, &ratings, &external, 10).is_empty());
    }

    #[test]
    fn community_disagreement_vetoes_shop_co_occurrence() {
        // Our tasters are anti-correlated on flavors 1 and 3 (see
        // `similar_flavors_finds_co_liked`), yet plenty of shop buyers liked both.
        // The community veto must hold.
        let ratings = vec![
            r(10, 1, 9.0),
            r(10, 3, 2.0),
            r(11, 1, 8.0),
            r(11, 3, 3.0),
            r(12, 1, 3.0),
            r(12, 3, 9.0),
        ];
        let mut rows: Vec<ExternalInput> = Vec::new();
        for i in 0..20 {
            rows.push(e(i, 1, 5));
            rows.push(e(i, 3, 5));
        }
        let external = ExternalSignals::build(&rows);
        let sims = similar_flavors(1, &ratings, &external, 10);
        assert!(sims.iter().all(|s| s.flavor_id != 3));
    }

    #[test]
    fn bulk_reviewers_are_excluded_from_the_co_occurrence_graph() {
        // One buyer who liked 30 products says nothing about any specific pair.
        let rows: Vec<ExternalInput> = (1..=30).map(|f| e(7, f, 5)).collect();
        let external = ExternalSignals::build(&rows);
        assert!(external.cooc_similarity(1, 2).is_none());
    }

    #[test]
    fn community_similarity_still_outranks_a_shop_only_pair() {
        // Flavor 2 is backed by the community; flavor 4 only by shop co-purchase,
        // where four buyers liked both and nothing else — a perfect 1.0 cosine.
        // The community-backed pair must still rank first.
        //
        // (Each user rates a third flavor: with only two ratings each, mean-centring
        // makes every user trivially anti-correlated and adjusted cosine degenerates
        // to -1.)
        let ratings = vec![
            r(10, 1, 9.0),
            r(10, 2, 9.0),
            r(10, 5, 3.0),
            r(11, 1, 8.0),
            r(11, 2, 8.0),
            r(11, 5, 2.0),
            r(12, 1, 3.0),
            r(12, 2, 2.0),
            r(12, 5, 9.0),
        ];
        let mut rows: Vec<ExternalInput> = Vec::new();
        for i in 0..4 {
            rows.push(e(i, 1, 5));
            rows.push(e(i, 4, 5));
        }
        let external = ExternalSignals::build(&rows);
        let sims = similar_flavors(1, &ratings, &external, 10);
        assert_eq!(sims[0].flavor_id, 2);
        assert!(sims.iter().any(|s| s.flavor_id == 4));
    }

    #[test]
    fn empty_external_signal_changes_nothing() {
        let ratings = vec![
            r(1, 100, 9.0),
            r(2, 10, 9.0),
            r(2, 20, 4.0),
            r(3, 10, 8.0),
            r(3, 20, 5.0),
        ];
        let none = ExternalSignals::default();
        assert!(none.is_empty());
        let a = recommend(1, &ratings, &none, 10);
        let b = recommend(1, &ratings, &ExternalSignals::build(&[]), 10);
        assert_eq!(a.len(), b.len());
        for (x, y) in a.iter().zip(b.iter()) {
            assert_eq!(x.flavor_id, y.flavor_id);
            assert_eq!(x.predicted_score, y.predicted_score);
        }
    }
}
