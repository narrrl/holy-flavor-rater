//! Assembly of `FlavorOut` (with nested ratings/replies) from entity models,
//! batching related lookups to avoid N+1. Mirrors FlavorSerializer +
//! RatingSerializer behaviour.

use std::collections::{BTreeMap, HashMap};

use sea_orm::{
    ColumnTrait, ConnectionTrait, DbBackend, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
    Statement,
};
use serde_json::Value;

use crate::dto::{
    ActivityOut, FlavorOut, NotificationOut, ProfileCommentOut, RatingOut, ReplyOut,
    TicketMessageOut, TicketOut, UserOut,
};
use crate::entities::prelude::*;
use crate::entities::{
    category, flavor, notification, profile_comment, rating, reply, ticket, ticket_message, user,
};
use crate::error::ApiResult;
use crate::media::{flavor_image_list, flavor_primary_image, image_field_url};
use crate::state::AppState;
use crate::web::RequestCtx;

/// Comma-join i32 ids for an inlined SQL `IN (...)` list. Safe: ints only.
fn id_list(ids: &[i32]) -> String {
    ids.iter()
        .map(|i| i.to_string())
        .collect::<Vec<_>>()
        .join(",")
}

/// Optional avatar → absolute media URL (empty path treated as absent).
fn avatar_url(ctx: &RequestCtx, media: &str, avatar: &Option<String>) -> Option<String> {
    avatar
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|a| image_field_url(ctx, media, a))
}

/// Django JSONField (list) stored as TEXT → Vec<String>, tolerating null/non-array.
fn json_string_list(v: &Option<Value>) -> Vec<String> {
    match v {
        Some(Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(|s| s.to_string()))
            .collect(),
        _ => Vec::new(),
    }
}

fn empty_distribution() -> BTreeMap<String, i64> {
    (1..=10).map(|i| (i.to_string(), 0i64)).collect()
}

/// Build `ReplyOut`s for a flat list of replies, resolving each author's
/// username (StringRelatedField). Mirrors `ReplySerializer`.
pub async fn build_replies(
    state: &AppState,
    replies: Vec<reply::Model>,
) -> ApiResult<Vec<ReplyOut>> {
    if replies.is_empty() {
        return Ok(Vec::new());
    }
    let mut user_ids: Vec<i32> = replies.iter().map(|r| r.user_id).collect();
    user_ids.sort_unstable();
    user_ids.dedup();
    let users = User::find()
        .filter(user::Column::Id.is_in(user_ids))
        .all(&state.db)
        .await?;
    let names: HashMap<i32, String> = users.into_iter().map(|u| (u.id, u.username)).collect();
    Ok(replies
        .into_iter()
        .map(|rp| ReplyOut {
            id: rp.id,
            user: names.get(&rp.user_id).cloned().unwrap_or_default(),
            rating: rp.rating_id,
            text: rp.text,
            created_at: crate::datetime::drf_iso(&rp.created_at),
        })
        .collect())
}

/// Build `RatingOut`s for a flat list of ratings, preserving input order and
/// resolving flavor/category/author/replies. Mirrors `RatingSerializer`.
/// Used by the rating list/feed/recent/retrieve/create endpoints.
pub async fn build_ratings(
    state: &AppState,
    ctx: &RequestCtx,
    viewer_id: Option<i32>,
    ratings: Vec<rating::Model>,
) -> ApiResult<Vec<RatingOut>> {
    let media = &state.config.media_url;
    if ratings.is_empty() {
        return Ok(Vec::new());
    }

    let flavor_ids: Vec<i32> = ratings.iter().map(|r| r.flavor_id).collect();
    let rating_ids: Vec<i32> = ratings.iter().map(|r| r.id).collect();
    let (mut counts_by_rating, mut mine_by_rating) =
        load_reactions(state, &rating_ids, viewer_id).await?;

    let flavors = Flavor::find()
        .filter(flavor::Column::Id.is_in(flavor_ids))
        .all(&state.db)
        .await?;
    let flavor_map: HashMap<i32, flavor::Model> = flavors.into_iter().map(|f| (f.id, f)).collect();

    let category_ids: Vec<i32> = flavor_map.values().map(|f| f.category_id).collect();
    let cats = Category::find()
        .filter(category::Column::Id.is_in(category_ids))
        .all(&state.db)
        .await?;
    let cat_map: HashMap<i32, (String, String)> =
        cats.into_iter().map(|c| (c.id, (c.name, c.slug))).collect();

    let replies = Reply::find()
        .filter(reply::Column::RatingId.is_in(rating_ids))
        .order_by_asc(reply::Column::CreatedAt)
        .all(&state.db)
        .await?;

    let mut user_ids: Vec<i32> = ratings.iter().map(|r| r.user_id).collect();
    user_ids.extend(replies.iter().map(|r| r.user_id));
    user_ids.sort_unstable();
    user_ids.dedup();
    let users = User::find()
        .filter(user::Column::Id.is_in(user_ids))
        .all(&state.db)
        .await?;
    let user_map: HashMap<i32, user::Model> = users.into_iter().map(|u| (u.id, u)).collect();

    let mut replies_by_rating: HashMap<i32, Vec<ReplyOut>> = HashMap::new();
    for rp in &replies {
        let username = user_map
            .get(&rp.user_id)
            .map(|u| u.username.clone())
            .unwrap_or_default();
        replies_by_rating
            .entry(rp.rating_id)
            .or_default()
            .push(ReplyOut {
                id: rp.id,
                user: username,
                rating: rp.rating_id,
                text: rp.text.clone(),
                created_at: crate::datetime::drf_iso(&rp.created_at),
            });
    }

    let mut out = Vec::with_capacity(ratings.len());
    for r in &ratings {
        let user = user_map.get(&r.user_id);
        let username = user.map(|u| u.username.clone()).unwrap_or_default();
        let user_avatar = user
            .and_then(|u| u.avatar.as_deref())
            .filter(|s| !s.is_empty())
            .map(|a| image_field_url(ctx, media, a));

        let fl = flavor_map.get(&r.flavor_id);
        let (cat_name, cat_slug) = fl
            .and_then(|f| cat_map.get(&f.category_id))
            .cloned()
            .unwrap_or_default();
        let flavor_image = fl.and_then(|f| {
            if let Some(img) = f.image.as_deref().filter(|s| !s.is_empty()) {
                Some(image_field_url(ctx, media, img))
            } else {
                f.image_url.clone()
            }
        });

        out.push(RatingOut {
            id: r.id,
            user: username,
            user_id: r.user_id,
            user_avatar,
            flavor: r.flavor_id,
            flavor_name: fl.map(|f| f.name.clone()).unwrap_or_default(),
            flavor_image,
            category_name: cat_name,
            category_slug: cat_slug,
            is_available: fl.map(|f| f.is_available).unwrap_or(false),
            is_legacy: fl.map(|f| f.is_legacy).unwrap_or(false),
            score: r.score,
            comment: r.comment.clone(),
            created_at: crate::datetime::drf_iso(&r.created_at),
            replies: replies_by_rating.remove(&r.id).unwrap_or_default(),
            reactions: counts_by_rating.remove(&r.id).unwrap_or_default(),
            my_reactions: mine_by_rating.remove(&r.id).unwrap_or_default(),
        });
    }
    Ok(out)
}

/// Build the community activity feed: recent new-flavor drops + flavors crossing
/// rating-count milestones, merged newest-first. There's no persistent event
/// table — items are synthesized from `flavor.created_at` and the crossing
/// rating's timestamp, so the feed is correct without a writer job.
pub async fn build_activity(state: &AppState, ctx: &RequestCtx) -> ApiResult<Vec<ActivityOut>> {
    const MILESTONES: &[i64] = &[25, 50, 100, 250, 500, 1000];
    const DROP_LIMIT: u64 = 40;
    let media = &state.config.media_url;

    // Recent catalog drops, newest first.
    let drops = Flavor::find()
        .order_by_desc(flavor::Column::CreatedAt)
        .limit(DROP_LIMIT)
        .all(&state.db)
        .await?;

    // Milestone candidates: flavors at/over the smallest threshold.
    let rows = state
        .db
        .query_all(Statement::from_string(
            state.db.get_database_backend(),
            format!(
                "SELECT flavor_id AS fid, COUNT(*) AS c FROM api_rating \
                 GROUP BY flavor_id HAVING c >= {} ORDER BY c DESC",
                MILESTONES[0]
            ),
        ))
        .await?;
    let milestone_counts: Vec<(i32, i64)> = rows
        .into_iter()
        .filter_map(|r| {
            Some((
                r.try_get::<i32>("", "fid").ok()?,
                r.try_get::<i64>("", "c").ok()?,
            ))
        })
        .collect();

    if drops.is_empty() && milestone_counts.is_empty() {
        return Ok(Vec::new());
    }

    // Resolve flavors + categories for both sets up front (two queries).
    let mut needed: Vec<i32> = drops.iter().map(|f| f.id).collect();
    needed.extend(milestone_counts.iter().map(|(fid, _)| *fid));
    needed.sort_unstable();
    needed.dedup();
    let flavors = Flavor::find()
        .filter(flavor::Column::Id.is_in(needed))
        .all(&state.db)
        .await?;
    let flavor_map: HashMap<i32, flavor::Model> = flavors.into_iter().map(|f| (f.id, f)).collect();
    let cat_ids: Vec<i32> = flavor_map.values().map(|f| f.category_id).collect();
    let cats = Category::find()
        .filter(category::Column::Id.is_in(cat_ids))
        .all(&state.db)
        .await?;
    let cat_map: HashMap<i32, (String, String)> =
        cats.into_iter().map(|c| (c.id, (c.name, c.slug))).collect();

    let flavor_image = |f: &flavor::Model| -> Option<String> {
        if let Some(img) = f.image.as_deref().filter(|s| !s.is_empty()) {
            Some(image_field_url(ctx, media, img))
        } else {
            f.image_url.clone()
        }
    };

    // (sort_key, item) — sort_key is the event's raw timestamp.
    let mut items = Vec::new();

    for f in &drops {
        let (cn, cs) = cat_map.get(&f.category_id).cloned().unwrap_or_default();
        items.push((
            f.created_at,
            ActivityOut {
                kind: "new_flavor".into(),
                id: format!("flavor-{}", f.id),
                created_at: crate::datetime::drf_iso(&f.created_at),
                flavor_id: f.id,
                flavor_name: f.name.clone(),
                flavor_image: flavor_image(f),
                category_name: cn,
                category_slug: cs,
                milestone: None,
                rating_count: None,
            },
        ));
    }

    for (fid, count) in &milestone_counts {
        let Some(f) = flavor_map.get(fid) else {
            continue;
        };
        // Highest threshold this flavor has crossed (one item per flavor).
        let Some(threshold) = MILESTONES.iter().rev().copied().find(|m| *m <= *count) else {
            continue;
        };
        // Event time = timestamp of the rating that crossed the threshold.
        let crossing = Rating::find()
            .filter(rating::Column::FlavorId.eq(*fid))
            .order_by_asc(rating::Column::CreatedAt)
            .offset((threshold - 1) as u64)
            .limit(1)
            .one(&state.db)
            .await?;
        let Some(crossing) = crossing else { continue };
        let (cn, cs) = cat_map.get(&f.category_id).cloned().unwrap_or_default();
        items.push((
            crossing.created_at,
            ActivityOut {
                kind: "milestone".into(),
                id: format!("milestone-{fid}-{threshold}"),
                created_at: crate::datetime::drf_iso(&crossing.created_at),
                flavor_id: f.id,
                flavor_name: f.name.clone(),
                flavor_image: flavor_image(f),
                category_name: cn,
                category_slug: cs,
                milestone: Some(threshold),
                rating_count: Some(*count),
            },
        ));
    }

    items.sort_by(|a, b| b.0.cmp(&a.0));
    Ok(items.into_iter().map(|(_, a)| a).collect())
}

/// Batch-load reactions for a set of ratings. Returns `(counts, mine)`:
/// `counts[rating_id][kind] = n`, and `mine[rating_id]` the kinds `viewer_id`
/// reacted with (empty/absent for anonymous callers). One grouped query for
/// counts, plus one for the viewer's own rows.
pub async fn load_reactions(
    state: &AppState,
    rating_ids: &[i32],
    viewer_id: Option<i32>,
) -> ApiResult<(
    HashMap<i32, BTreeMap<String, i64>>,
    HashMap<i32, Vec<String>>,
)> {
    let mut counts: HashMap<i32, BTreeMap<String, i64>> = HashMap::new();
    let mut mine: HashMap<i32, Vec<String>> = HashMap::new();
    if rating_ids.is_empty() {
        return Ok((counts, mine));
    }
    let ids = id_list(rating_ids);
    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Sqlite,
            format!(
                "SELECT rating_id, kind, COUNT(*) AS n FROM rating_reaction \
                 WHERE rating_id IN ({ids}) GROUP BY rating_id, kind"
            ),
        ))
        .await?;
    for row in rows {
        let rid: i32 = row.try_get("", "rating_id")?;
        let kind: String = row.try_get("", "kind")?;
        let n: i64 = row.try_get("", "n")?;
        counts.entry(rid).or_default().insert(kind, n);
    }
    if let Some(uid) = viewer_id {
        let rows = state
            .db
            .query_all(Statement::from_string(
                DbBackend::Sqlite,
                format!(
                    "SELECT rating_id, kind FROM rating_reaction \
                     WHERE user_id = {uid} AND rating_id IN ({ids})"
                ),
            ))
            .await?;
        for row in rows {
            let rid: i32 = row.try_get("", "rating_id")?;
            let kind: String = row.try_get("", "kind")?;
            mine.entry(rid).or_default().push(kind);
        }
    }
    Ok((counts, mine))
}

/// Per-flavor rating rollup accumulated in a single pass over the loaded ratings,
/// replacing the previous O(flavors × ratings) re-scan.
struct RatingAgg {
    sum: i64,
    n: i64,
    followed_sum: i64,
    followed_n: i64,
    dist: BTreeMap<String, i64>,
    /// The viewer's own score for this flavor, if they rated it.
    viewer_score: Option<i32>,
}

impl Default for RatingAgg {
    fn default() -> Self {
        RatingAgg {
            sum: 0,
            n: 0,
            followed_sum: 0,
            followed_n: 0,
            dist: empty_distribution(),
            viewer_score: None,
        }
    }
}

impl RatingAgg {
    fn average(&self) -> Option<f64> {
        (self.n > 0).then(|| self.sum as f64 / self.n as f64)
    }
    fn followed_average(&self) -> Option<f64> {
        (self.followed_n > 0).then(|| self.followed_sum as f64 / self.followed_n as f64)
    }
}

/// Build `FlavorOut`s.
///
/// `include_ratings` controls whether each flavor carries its full nested
/// `ratings` array. The aggregate rollup (average / followed-average /
/// distribution / the viewer's own score) is always computed cheaply in one
/// pass over the loaded rows, so callers that only render those fields
/// (`newest`, `followed_top`, the dashboard's "missing flavors" — which loads
/// *every* unrated flavor) pass `false` and skip allocating a `RatingOut` per
/// rating plus the rating-author user lookup. `list`/`top`/detail pass `true`
/// because their UI reads the nested reviews (counts, comment previews, the
/// featured review).
///
/// `include_replies` further controls whether each nested rating carries its
/// replies: only the flavor *detail* view needs them, so it alone pays for the
/// reply query + reply-author lookups. It implies `include_ratings`.
pub async fn build_flavors(
    state: &AppState,
    ctx: &RequestCtx,
    flavors: Vec<flavor::Model>,
    viewer_id: Option<i32>,
    followed_ids: &[i32],
    include_ratings: bool,
    include_replies: bool,
) -> ApiResult<Vec<FlavorOut>> {
    let media = &state.config.media_url;
    if flavors.is_empty() {
        return Ok(Vec::new());
    }

    let flavor_ids: Vec<i32> = flavors.iter().map(|f| f.id).collect();
    let category_ids: Vec<i32> = flavors.iter().map(|f| f.category_id).collect();

    // Categories
    let cats = Category::find()
        .filter(crate::entities::category::Column::Id.is_in(category_ids))
        .all(&state.db)
        .await?;
    let cat_map: HashMap<i32, (String, String)> =
        cats.into_iter().map(|c| (c.id, (c.name, c.slug))).collect();

    // Ratings for these flavors (RatingSerializer order: -created_at)
    let ratings = Rating::find()
        .filter(rating::Column::FlavorId.is_in(flavor_ids.clone()))
        .order_by_desc(rating::Column::CreatedAt)
        .all(&state.db)
        .await?;

    // Replies (order: created_at asc) — only loaded for the detail view.
    let include_replies = include_replies && include_ratings;
    let replies = if include_replies {
        let rating_ids: Vec<i32> = ratings.iter().map(|r| r.id).collect();
        if rating_ids.is_empty() {
            Vec::new()
        } else {
            Reply::find()
                .filter(reply::Column::RatingId.is_in(rating_ids))
                .order_by_asc(reply::Column::CreatedAt)
                .all(&state.db)
                .await?
        }
    } else {
        Vec::new()
    };

    // Users referenced by ratings + replies — only needed to fill the nested
    // rating/reply author fields, so skip the lookup entirely when the caller
    // doesn't want the nested ratings.
    let user_map: HashMap<i32, user::Model> = if include_ratings {
        let mut user_ids: Vec<i32> = ratings.iter().map(|r| r.user_id).collect();
        user_ids.extend(replies.iter().map(|r| r.user_id));
        user_ids.sort_unstable();
        user_ids.dedup();
        if user_ids.is_empty() {
            HashMap::new()
        } else {
            User::find()
                .filter(user::Column::Id.is_in(user_ids))
                .all(&state.db)
                .await?
                .into_iter()
                .map(|u| (u.id, u))
                .collect()
        }
    } else {
        HashMap::new()
    };

    // Replies grouped by rating id
    let mut replies_by_rating: HashMap<i32, Vec<ReplyOut>> = HashMap::new();
    for rp in &replies {
        let username = user_map
            .get(&rp.user_id)
            .map(|u| u.username.clone())
            .unwrap_or_default();
        replies_by_rating
            .entry(rp.rating_id)
            .or_default()
            .push(ReplyOut {
                id: rp.id,
                user: username,
                rating: rp.rating_id,
                text: rp.text.clone(),
                created_at: crate::datetime::drf_iso(&rp.created_at),
            });
    }

    // Flavor lookup for per-rating flavor fields
    let flavor_map: HashMap<i32, &flavor::Model> = flavors.iter().map(|f| (f.id, f)).collect();
    let followed_set: std::collections::HashSet<i32> = followed_ids.iter().copied().collect();

    // Single pass over ratings: build the nested RatingOut grouped by flavor AND
    // accumulate average / followed-average / distribution / the viewer's own
    // score per flavor.
    let mut ratings_by_flavor: HashMap<i32, Vec<RatingOut>> = HashMap::new();
    let mut agg_by_flavor: HashMap<i32, RatingAgg> = HashMap::new();
    for r in &ratings {
        // Nested RatingOut: only built when the caller will ship it. The
        // aggregate accumulation below always runs (it's the cheap part).
        if include_ratings {
            let user = user_map.get(&r.user_id);
            let username = user.map(|u| u.username.clone()).unwrap_or_default();
            let user_avatar = user
                .and_then(|u| u.avatar.as_deref())
                .filter(|s| !s.is_empty())
                .map(|a| image_field_url(ctx, media, a));

            let fl = flavor_map.get(&r.flavor_id);
            let (cat_name, cat_slug) = fl
                .and_then(|f| cat_map.get(&f.category_id))
                .cloned()
                .unwrap_or_default();
            let flavor_image = fl.and_then(|f| {
                if let Some(img) = f.image.as_deref().filter(|s| !s.is_empty()) {
                    Some(image_field_url(ctx, media, img))
                } else {
                    f.image_url.clone()
                }
            });

            ratings_by_flavor
                .entry(r.flavor_id)
                .or_default()
                .push(RatingOut {
                    id: r.id,
                    user: username,
                    user_id: r.user_id,
                    user_avatar,
                    flavor: r.flavor_id,
                    flavor_name: fl.map(|f| f.name.clone()).unwrap_or_default(),
                    flavor_image,
                    category_name: cat_name,
                    category_slug: cat_slug,
                    is_available: fl.map(|f| f.is_available).unwrap_or(false),
                    is_legacy: fl.map(|f| f.is_legacy).unwrap_or(false),
                    score: r.score,
                    comment: r.comment.clone(),
                    created_at: crate::datetime::drf_iso(&r.created_at),
                    replies: replies_by_rating.remove(&r.id).unwrap_or_default(),
                    // Reactions surface on the community feed, not the flavor detail
                    // ratings list — keep this path's payload light.
                    reactions: std::collections::BTreeMap::new(),
                    my_reactions: Vec::new(),
                });
        }

        let a = agg_by_flavor.entry(r.flavor_id).or_default();
        if (1..=10).contains(&r.score) {
            *a.dist.get_mut(&r.score.to_string()).unwrap() += 1;
        }
        a.sum += r.score as i64;
        a.n += 1;
        if followed_set.contains(&r.user_id) {
            a.followed_sum += r.score as i64;
            a.followed_n += 1;
        }
        if Some(r.user_id) == viewer_id {
            a.viewer_score = Some(r.score);
        }
    }

    let mut out = Vec::with_capacity(flavors.len());
    for f in &flavors {
        let (cat_name, cat_slug) = cat_map.get(&f.category_id).cloned().unwrap_or_default();
        let local_paths = json_string_list(&f.local_image_paths);
        let image_urls = json_string_list(&f.image_urls);
        let agg = agg_by_flavor.remove(&f.id);
        let user_rating = viewer_id.and(agg.as_ref().and_then(|a| a.viewer_score));
        out.push(FlavorOut {
            id: f.id,
            name: f.name.clone(),
            category: f.category_id,
            category_name: cat_name,
            category_slug: cat_slug,
            description: f.description.clone(),
            average_rating: agg.as_ref().and_then(RatingAgg::average),
            followed_average_rating: agg.as_ref().and_then(RatingAgg::followed_average),
            user_rating,
            ratings: ratings_by_flavor.remove(&f.id).unwrap_or_default(),
            image_url: flavor_primary_image(
                ctx,
                media,
                f.main_image_path.as_deref(),
                &local_paths,
                f.image.as_deref(),
                f.image_url.as_deref(),
            ),
            image_urls: flavor_image_list(
                ctx,
                media,
                &local_paths,
                f.image.as_deref(),
                &image_urls,
            ),
            is_available: f.is_available,
            is_legacy: f.is_legacy,
            shop_url: f.shop_url.clone(),
            rating_distribution: agg.map(|a| a.dist).unwrap_or_else(empty_distribution),
        });
    }
    Ok(out)
}

/// `following`/`followers`/`unread` counts keyed by user id, from raw aggregate
/// queries. Used by `build_users` to avoid N+1.
async fn social_counts(
    state: &AppState,
    ids: &[i32],
) -> ApiResult<(HashMap<i32, i64>, HashMap<i32, i64>, HashMap<i32, i64>)> {
    let mut following: HashMap<i32, i64> = HashMap::new();
    let mut followers: HashMap<i32, i64> = HashMap::new();
    let mut unread: HashMap<i32, i64> = HashMap::new();
    if ids.is_empty() {
        return Ok((following, followers, unread));
    }
    let list = id_list(ids);
    let backend = DbBackend::Sqlite;

    let q = |sql: String| Statement::from_string(backend, sql);

    for row in state
        .db
        .query_all(q(format!(
            "SELECT from_user_id AS uid, COUNT(*) AS c FROM api_user_following \
             WHERE from_user_id IN ({list}) GROUP BY from_user_id"
        )))
        .await?
    {
        following.insert(row.try_get("", "uid")?, row.try_get("", "c")?);
    }
    for row in state
        .db
        .query_all(q(format!(
            "SELECT to_user_id AS uid, COUNT(*) AS c FROM api_user_following \
             WHERE to_user_id IN ({list}) GROUP BY to_user_id"
        )))
        .await?
    {
        followers.insert(row.try_get("", "uid")?, row.try_get("", "c")?);
    }
    for row in state
        .db
        .query_all(q(format!(
            "SELECT recipient_id AS uid, COUNT(*) AS c FROM api_notification \
             WHERE recipient_id IN ({list}) AND is_read = 0 GROUP BY recipient_id"
        )))
        .await?
    {
        unread.insert(row.try_get("", "uid")?, row.try_get("", "c")?);
    }
    Ok((following, followers, unread))
}

/// Set of user ids that `viewer` follows, restricted to `ids`.
async fn following_of(state: &AppState, viewer: Option<i32>, ids: &[i32]) -> ApiResult<Vec<i32>> {
    let Some(v) = viewer else {
        return Ok(Vec::new());
    };
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let list = id_list(ids);
    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Sqlite,
            format!(
                "SELECT to_user_id AS uid FROM api_user_following \
                 WHERE from_user_id = {v} AND to_user_id IN ({list})"
            ),
        ))
        .await?;
    rows.into_iter()
        .map(|r| r.try_get("", "uid").map_err(Into::into))
        .collect()
}

/// Build `UserOut`s (mirrors `UserSerializer`), batching social counts and the
/// viewer's follow set. `viewer` is the authenticated request user, if any.
pub async fn build_users(
    state: &AppState,
    ctx: &RequestCtx,
    users: Vec<user::Model>,
    viewer: Option<i32>,
) -> ApiResult<Vec<UserOut>> {
    let media = &state.config.media_url;
    if users.is_empty() {
        return Ok(Vec::new());
    }
    let ids: Vec<i32> = users.iter().map(|u| u.id).collect();
    let (following, followers, unread) = social_counts(state, &ids).await?;
    let followed: std::collections::HashSet<i32> = following_of(state, viewer, &ids)
        .await?
        .into_iter()
        .collect();

    let banner_ids: Vec<i32> = users.iter().filter_map(|u| u.selected_banner_id).collect();
    let banner_slugs: HashMap<i32, String> = if banner_ids.is_empty() {
        HashMap::new()
    } else {
        Banner::find()
            .filter(crate::entities::banner::Column::Id.is_in(banner_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|b| (b.id, b.slug))
            .collect()
    };

    Ok(users
        .into_iter()
        .map(|u| UserOut {
            avatar: avatar_url(ctx, media, &u.avatar),
            following_count: *following.get(&u.id).unwrap_or(&0),
            followers_count: *followers.get(&u.id).unwrap_or(&0),
            is_following: followed.contains(&u.id),
            unread_notifications_count: *unread.get(&u.id).unwrap_or(&0),
            is_superuser: u.is_superuser,
            selected_banner_slug: u
                .selected_banner_id
                .and_then(|b| banner_slugs.get(&b).cloned()),
            selected_banner: u.selected_banner_id,
            id: u.id,
            username: u.username,
            email: u.email,
            theme: u.theme,
            language: u.language,
        })
        .collect())
}

/// Convenience: build a single `UserOut`.
pub async fn build_user(
    state: &AppState,
    ctx: &RequestCtx,
    u: user::Model,
    viewer: Option<i32>,
) -> ApiResult<UserOut> {
    let mut v = build_users(state, ctx, vec![u], viewer).await?;
    v.pop().ok_or(crate::error::ApiError::Internal)
}

/// Build `ProfileCommentOut`s (mirrors `ProfileCommentSerializer`).
pub async fn build_profile_comments(
    state: &AppState,
    ctx: &RequestCtx,
    comments: Vec<profile_comment::Model>,
) -> ApiResult<Vec<ProfileCommentOut>> {
    let media = &state.config.media_url;
    if comments.is_empty() {
        return Ok(Vec::new());
    }
    let mut author_ids: Vec<i32> = comments.iter().map(|c| c.author_id).collect();
    author_ids.sort_unstable();
    author_ids.dedup();
    let authors: HashMap<i32, user::Model> = User::find()
        .filter(user::Column::Id.is_in(author_ids))
        .all(&state.db)
        .await?
        .into_iter()
        .map(|u| (u.id, u))
        .collect();
    Ok(comments
        .into_iter()
        .map(|c| {
            let a = authors.get(&c.author_id);
            ProfileCommentOut {
                id: c.id,
                author_username: a.map(|u| u.username.clone()).unwrap_or_default(),
                author_avatar: a.and_then(|u| avatar_url(ctx, media, &u.avatar)),
                text: c.text,
                created_at: crate::datetime::drf_iso(&c.created_at),
            }
        })
        .collect())
}

/// Build `NotificationOut`s (mirrors `NotificationSerializer`), resolving actor,
/// flavor (via rating or reply→rating) and profile-comment owner.
pub async fn build_notifications(
    state: &AppState,
    ctx: &RequestCtx,
    notes: Vec<notification::Model>,
) -> ApiResult<Vec<NotificationOut>> {
    let media = &state.config.media_url;
    if notes.is_empty() {
        return Ok(Vec::new());
    }

    let reply_ids: Vec<i32> = notes.iter().filter_map(|n| n.reply_id).collect();
    let replies: HashMap<i32, reply::Model> = if reply_ids.is_empty() {
        HashMap::new()
    } else {
        Reply::find()
            .filter(reply::Column::Id.is_in(reply_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|r| (r.id, r))
            .collect()
    };

    // Rating ids referenced directly or via a reply.
    let mut rating_ids: Vec<i32> = notes.iter().filter_map(|n| n.rating_id).collect();
    rating_ids.extend(replies.values().map(|r| r.rating_id));
    rating_ids.sort_unstable();
    rating_ids.dedup();
    let ratings: HashMap<i32, rating::Model> = if rating_ids.is_empty() {
        HashMap::new()
    } else {
        Rating::find()
            .filter(rating::Column::Id.is_in(rating_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|r| (r.id, r))
            .collect()
    };

    let flavor_ids: Vec<i32> = ratings.values().map(|r| r.flavor_id).collect();
    let flavors: HashMap<i32, flavor::Model> = if flavor_ids.is_empty() {
        HashMap::new()
    } else {
        Flavor::find()
            .filter(flavor::Column::Id.is_in(flavor_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|f| (f.id, f))
            .collect()
    };

    let pc_ids: Vec<i32> = notes.iter().filter_map(|n| n.profile_comment_id).collect();
    let pcs: HashMap<i32, profile_comment::Model> = if pc_ids.is_empty() {
        HashMap::new()
    } else {
        ProfileComment::find()
            .filter(profile_comment::Column::Id.is_in(pc_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|c| (c.id, c))
            .collect()
    };

    let mut user_ids: Vec<i32> = notes.iter().map(|n| n.actor_id).collect();
    user_ids.extend(pcs.values().map(|c| c.profile_owner_id));
    user_ids.sort_unstable();
    user_ids.dedup();
    let users: HashMap<i32, user::Model> = User::find()
        .filter(user::Column::Id.is_in(user_ids))
        .all(&state.db)
        .await?
        .into_iter()
        .map(|u| (u.id, u))
        .collect();

    // Resolve the flavor (name, id) a notification points at.
    let flavor_of = |n: &notification::Model| -> Option<&flavor::Model> {
        if let Some(rid) = n.rating_id {
            return ratings.get(&rid).and_then(|r| flavors.get(&r.flavor_id));
        }
        if let Some(rep_id) = n.reply_id {
            let rep = replies.get(&rep_id)?;
            return ratings
                .get(&rep.rating_id)
                .and_then(|r| flavors.get(&r.flavor_id));
        }
        None
    };

    Ok(notes
        .iter()
        .map(|n| {
            let actor = users.get(&n.actor_id);
            let fl = flavor_of(n);
            NotificationOut {
                id: n.id,
                actor_username: actor.map(|u| u.username.clone()).unwrap_or_default(),
                actor_avatar: actor.and_then(|u| avatar_url(ctx, media, &u.avatar)),
                notification_type: n.notification_type.clone(),
                rating: n.rating_id,
                reply: n.reply_id,
                ticket: n.ticket_id,
                profile_comment: n.profile_comment_id,
                profile_owner_username: n
                    .profile_comment_id
                    .and_then(|id| pcs.get(&id))
                    .and_then(|c| users.get(&c.profile_owner_id))
                    .map(|u| u.username.clone()),
                is_read: n.is_read,
                created_at: crate::datetime::drf_iso(&n.created_at),
                flavor_name: fl.map(|f| f.name.clone()),
                flavor_id: fl.map(|f| f.id),
            }
        })
        .collect())
}

/// Build a single `TicketMessageOut` when the author is already loaded
/// (used by the `add_message` action's 201 response).
pub fn ticket_message_out(msg: ticket_message::Model, author: &user::Model) -> TicketMessageOut {
    TicketMessageOut {
        id: msg.id,
        username: author.username.clone(),
        text: msg.text,
        created_at: crate::datetime::drf_iso(&msg.created_at),
        is_admin: author.is_superuser,
    }
}

/// Build `TicketOut`s (mirrors `TicketSerializer` + nested `TicketMessageSerializer`).
pub async fn build_tickets(
    state: &AppState,
    ctx: &RequestCtx,
    tickets: Vec<ticket::Model>,
) -> ApiResult<Vec<TicketOut>> {
    let media = &state.config.media_url;
    if tickets.is_empty() {
        return Ok(Vec::new());
    }
    let ticket_ids: Vec<i32> = tickets.iter().map(|t| t.id).collect();
    let messages = TicketMessage::find()
        .filter(ticket_message::Column::TicketId.is_in(ticket_ids))
        .order_by_asc(ticket_message::Column::CreatedAt)
        .all(&state.db)
        .await?;

    let mut user_ids: Vec<i32> = tickets.iter().map(|t| t.user_id).collect();
    user_ids.extend(messages.iter().map(|m| m.user_id));
    user_ids.sort_unstable();
    user_ids.dedup();
    let users: HashMap<i32, user::Model> = User::find()
        .filter(user::Column::Id.is_in(user_ids))
        .all(&state.db)
        .await?
        .into_iter()
        .map(|u| (u.id, u))
        .collect();

    let mut msgs_by_ticket: HashMap<i32, Vec<TicketMessageOut>> = HashMap::new();
    for m in messages {
        let u = users.get(&m.user_id);
        msgs_by_ticket
            .entry(m.ticket_id)
            .or_default()
            .push(TicketMessageOut {
                id: m.id,
                username: u.map(|x| x.username.clone()).unwrap_or_default(),
                text: m.text,
                created_at: crate::datetime::drf_iso(&m.created_at),
                is_admin: u.map(|x| x.is_superuser).unwrap_or(false),
            });
    }

    Ok(tickets
        .into_iter()
        .map(|t| {
            let u = users.get(&t.user_id);
            TicketOut {
                user: t.user_id,
                username: u.map(|x| x.username.clone()).unwrap_or_default(),
                user_email: u.map(|x| x.email.clone()).unwrap_or_default(),
                user_avatar: u.and_then(|x| avatar_url(ctx, media, &x.avatar)),
                subject: t.subject,
                description: t.description,
                status: t.status,
                created_at: crate::datetime::drf_iso(&t.created_at),
                updated_at: crate::datetime::drf_iso(&t.updated_at),
                messages: msgs_by_ticket.remove(&t.id).unwrap_or_default(),
                id: t.id,
            }
        })
        .collect())
}
