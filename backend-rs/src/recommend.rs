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
}

impl RecSource {
    pub fn as_str(self) -> &'static str {
        match self {
            RecSource::Cf => "cf",
            RecSource::Popular => "popular",
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
    pub source: RecSource,
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

/// Recommend up to `limit` flavors for `target`, given the full rating matrix.
pub fn recommend(target: i32, ratings: &[RatingInput], limit: usize) -> Vec<Recommendation> {
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
        return popularity(&target_rated, ratings, limit);
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
            source: RecSource::Cf,
        })
        .collect();

    // No confident CF candidates → fall back to popularity.
    if recs.is_empty() {
        return popularity(&target_rated, ratings, limit);
    }

    sort_recs(&mut recs);
    recs.truncate(limit);
    recs
}

/// Bayesian-average popularity ranking over flavors the target hasn't rated. Damps
/// flavors with few ratings toward the global mean so one 10/10 can't top the chart.
fn popularity(
    target_rated: &HashSet<i32>,
    ratings: &[RatingInput],
    limit: usize,
) -> Vec<Recommendation> {
    let global_mean = mean(ratings.iter().map(|r| r.score));
    let mut agg: HashMap<i32, (f64, i64)> = HashMap::new(); // flavor -> (sum, count)
    for r in ratings {
        if target_rated.contains(&r.flavor_id) {
            continue;
        }
        let e = agg.entry(r.flavor_id).or_insert((0.0, 0));
        e.0 += r.score;
        e.1 += 1;
    }

    let mut recs: Vec<Recommendation> = agg
        .into_iter()
        .map(|(flavor_id, (sum, count))| Recommendation {
            flavor_id,
            predicted_score: (BAYES_C * global_mean + sum) / (BAYES_C + count as f64),
            contributing_neighbours: count,
            source: RecSource::Popular,
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
    /// Adjusted-cosine similarity in (0, 1]. Higher = more alike.
    pub similarity: f64,
    /// How many users rated both this flavor and the target (the confidence count).
    pub co_raters: i64,
}

/// Flavors most similar to `target_flavor`, by **adjusted cosine** over the user
/// rating vectors (each user's ratings mean-centred to cancel rater bias). Pure (no
/// DB) and computed on demand; at current scale this is sub-millisecond.
///
/// Returns only positively-correlated flavors sharing at least [`MIN_CORATERS`]
/// raters with the target, ranked by similarity. Empty if the target has too few
/// raters to compare against.
pub fn similar_flavors(
    target_flavor: i32,
    ratings: &[RatingInput],
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

    let Some(target_vec) = by_flavor.get(&target_flavor) else {
        return Vec::new();
    };

    let mut sims: Vec<SimilarFlavor> = Vec::new();
    for (&f, f_vec) in &by_flavor {
        if f == target_flavor {
            continue;
        }
        // co-rated users
        let (mut num, mut dt, mut df, mut co) = (0.0, 0.0, 0.0, 0i64);
        for (&u, &a) in target_vec {
            if let Some(&b) = f_vec.get(&u) {
                num += a * b;
                dt += a * a;
                df += b * b;
                co += 1;
            }
        }
        if (co as usize) < MIN_CORATERS {
            continue;
        }
        let den = dt.sqrt() * df.sqrt();
        if den == 0.0 {
            continue;
        }
        let sim = num / den;
        if sim <= 0.0 {
            continue; // only positively-correlated flavors
        }
        sims.push(SimilarFlavor {
            flavor_id: f,
            similarity: sim,
            co_raters: co,
        });
    }

    // Deterministic: similarity desc, then more co-raters, then flavor id.
    sims.sort_by(|a, b| {
        b.similarity
            .partial_cmp(&a.similarity)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.co_raters.cmp(&a.co_raters))
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
        let recs = recommend(1, &ratings, 10);
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

        let recs = recommend(1, &ratings, 10);
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
        let recs = recommend(1, &ratings, 1);
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
        let sims = similar_flavors(1, &ratings, 10);
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
        assert!(similar_flavors(1, &ratings, 10).is_empty());
    }

    #[test]
    fn similar_flavors_unknown_target_is_empty() {
        let ratings = vec![r(10, 1, 9.0), r(11, 1, 8.0)];
        assert!(similar_flavors(999, &ratings, 10).is_empty());
    }
}
