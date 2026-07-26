//! `sync_reviews` — pull anonymous shop reviews from reviews.io and store the
//! subset that maps to a real flavor, as an extra signal under the recommender
//! (see [`crate::recommend`] for how they're weighted).
//!
//! # What gets kept
//!
//! The upstream feed is a mixed timeline of store reviews ("great service") and
//! product reviews. Only product reviews matter here, and only those whose `sku`
//! resolves to a flavor we track — roughly a quarter of them. The rest are mix
//! boxes, shakers, merch and regional bundles, which say nothing about a flavor.
//!
//! # What gets discarded
//!
//! Everything identifying. The upstream payload carries the reviewer's name, city
//! and free-text review; none of it is written. All that survives is a salted hash
//! of the upstream reviewer id (see [`crate::reviews::reviewer_key`]), which exists
//! solely so the recommender can tell "one buyer liked both of these" apart from
//! "two unrelated buyers". This is a ratings signal, not a copy of their reviews.
//!
//! # Sync strategy
//!
//! The feed is walked newest-first. On the first run the table is empty so the
//! crawl runs deep (bounded by [`MAX_PAGES`]); afterwards it stops once
//! [`STOP_AFTER_KNOWN_PAGES`] consecutive pages contain nothing new, which is
//! typically two or three requests. Pages are fetched one at a time with a delay
//! between them — this is someone else's public endpoint.

use std::collections::{HashMap, HashSet};
use std::time::Duration;

use async_trait::async_trait;
use sea_orm::sea_query::OnConflict;
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QuerySelect};
use serde_json::Value;

use crate::entities::prelude::{Category, ExternalReview, Flavor};
use crate::entities::{category, external_review, flavor};
use crate::reviews::{reviewer_key, SOURCE_REVIEWS_IO};
use crate::state::AppState;

use super::download::http_client;
use super::BackgroundJob;

/// Public widget feed. Returns a mixed store/product review timeline.
const TIMELINE_URL: &str = "https://api.reviews.io/timeline/data";
/// Upstream page size. 100 is the largest the endpoint honours.
const PER_PAGE: usize = 100;
/// Default ceiling on pages per run (overridable via `REVIEWS_MAX_PAGES`). At
/// [`PER_PAGE`] this covers a feed of 200k reviews — enough for a full first-run
/// backfill, while bounding a run if upstream paging ever stops terminating.
const MAX_PAGES: usize = 2_000;
/// Stop after this many consecutive pages that contained mappable reviews but no
/// new ones. More than one because the feed is not strictly monotonic.
const STOP_AFTER_KNOWN_PAGES: usize = 3;
/// Politeness delay between page requests.
const PAGE_DELAY: Duration = Duration::from_millis(250);
/// Category slug holding bundles, shakers and merch. Reviews resolving here are
/// dropped: a review of a mixed sachet box tells us nothing about one flavor.
const PACKS_SLUG: &str = "packs-and-other";

pub struct SyncReviews;

#[async_trait]
impl BackgroundJob for SyncReviews {
    fn name(&self) -> &'static str {
        "sync_reviews"
    }
    fn display_name(&self) -> &'static str {
        "Sync Shop Reviews"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db = &state.db;
        let mut log: Vec<String> = Vec::new();

        let sku_index = build_sku_index(state).await?;
        if sku_index.is_empty() {
            log.push(
                "No flavor variant ids on record — run sync_flavors first so reviews \
                 can be matched to flavors."
                    .to_string(),
            );
            return Ok(log.join("\n"));
        }
        log.push(format!(
            "Matching against {} variant skus across the catalog.",
            sku_index.len()
        ));

        let known_before = ExternalReview::find()
            .filter(external_review::Column::Source.eq(SOURCE_REVIEWS_IO))
            .count(db)
            .await?;
        let backfill = known_before == 0;
        log.push(if backfill {
            "No reviews stored yet — running a full backfill.".to_string()
        } else {
            format!("{known_before} reviews already stored — incremental sync.")
        });

        let client = http_client();
        let store = &state.config.reviews_store;
        let salt = &state.config.reviews_hash_salt;

        let mut inserted = 0usize;
        let mut mapped = 0usize;
        let mut skipped_unmapped = 0usize;
        let mut pages_fetched = 0usize;
        let mut quiet_pages = 0usize;

        let max_pages = state.config.reviews_max_pages.min(MAX_PAGES);
        for page in 1..=max_pages {
            let url = format!(
                "{TIMELINE_URL}?store={store}&sort=date_desc&per_page={PER_PAGE}&page={page}"
            );
            let body: Value = match fetch_page(&client, &url).await {
                Ok(v) => v,
                Err(e) => {
                    // Partial data is still useful — keep what we ingested and
                    // report where it stopped, rather than failing the whole run.
                    log.push(format!("Stopped at page {page}: {e}"));
                    break;
                }
            };
            pages_fetched += 1;

            let entries = body
                .get("timeline")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            if entries.is_empty() {
                log.push(format!("Page {page} empty — end of feed."));
                break;
            }

            // Product reviews on this page, paired with the flavor their sku
            // resolves to. Unresolved ones are merch, bundles, or products we
            // don't track — counted, then dropped.
            let page_product_reviews: Vec<ParsedReview> = entries
                .iter()
                .filter_map(|e| e.get("_source"))
                .filter_map(parse_product_review)
                .collect();
            let product_review_count = page_product_reviews.len();
            let parsed: Vec<(ParsedReview, i32)> = page_product_reviews
                .into_iter()
                .filter_map(|r| sku_index.get(&r.sku).map(|&flavor_id| (r, flavor_id)))
                .collect();
            skipped_unmapped += product_review_count - parsed.len();
            mapped += parsed.len();

            // How many of this page's reviews we already had, before writing.
            let already_known = count_known(db, &parsed).await?;

            let mut batch: Vec<external_review::ActiveModel> = Vec::new();
            let mut seen_in_batch: HashSet<String> = HashSet::new();
            for (review, flavor_id) in parsed.iter() {
                // The feed can repeat a review id within a page; UNIQUE handles it
                // across pages, but one batch carrying a key twice would trip the
                // on-conflict clause.
                if !seen_in_batch.insert(review.external_id.clone()) {
                    continue;
                }
                batch.push(external_review::ActiveModel {
                    source: Set(SOURCE_REVIEWS_IO.to_string()),
                    external_id: Set(review.external_id.clone()),
                    reviewer_key: Set(reviewer_key(salt, SOURCE_REVIEWS_IO, &review.reviewer_id)),
                    flavor_id: Set(*flavor_id),
                    rating: Set(review.rating),
                    reviewed_at: Set(review.reviewed_at),
                    created_at: Set(crate::datetime::now_micros()),
                    ..Default::default()
                });
            }

            if !batch.is_empty() {
                ExternalReview::insert_many(batch)
                    .on_conflict(
                        OnConflict::columns([
                            external_review::Column::Source,
                            external_review::Column::ExternalId,
                        ])
                        .do_nothing()
                        .to_owned(),
                    )
                    // Returns rows-affected rather than erroring when every row in
                    // the batch was already present (the steady state).
                    .exec_without_returning(db)
                    .await?;
            }

            // Only pages that could have held something new count toward the stop
            // condition — a page of pure merch reviews proves nothing either way.
            if !parsed.is_empty() {
                if already_known >= parsed.len() {
                    quiet_pages += 1;
                } else {
                    quiet_pages = 0;
                    inserted += parsed.len() - already_known;
                }
            }

            if !backfill && quiet_pages >= STOP_AFTER_KNOWN_PAGES {
                log.push(format!(
                    "Page {page}: {STOP_AFTER_KNOWN_PAGES} consecutive pages with nothing \
                     new — caught up."
                ));
                break;
            }

            tokio::time::sleep(PAGE_DELAY).await;
        }

        // Recommendations read a cached aggregate; drop it so the new rows count.
        state.external_signals.invalidate().await;

        let total = ExternalReview::find()
            .filter(external_review::Column::Source.eq(SOURCE_REVIEWS_IO))
            .count(db)
            .await?;
        log.push(format!(
            "Fetched {pages_fetched} pages. Flavor-mapped: {mapped}, new: {inserted}, \
             unmapped (packs/merch/untracked): {skipped_unmapped}. Stored total: {total}."
        ));
        Ok(log.join("\n"))
    }
}

/// One product review, reduced to the fields we're willing to store.
struct ParsedReview {
    external_id: String,
    reviewer_id: String,
    sku: String,
    rating: i32,
    reviewed_at: chrono::NaiveDateTime,
}

/// Pull a product review out of a timeline entry, or `None` if it isn't one or is
/// missing anything we need. Store reviews ("great service") carry no sku and are
/// filtered out here.
fn parse_product_review(src: &Value) -> Option<ParsedReview> {
    if src.get("type").and_then(|v| v.as_str()) != Some("product_review") {
        return None;
    }
    let sku = src.get("sku").and_then(json_as_string)?;
    let external_id = src
        .get("_id")
        .and_then(json_as_string)
        .or_else(|| src.get("product_review_id").and_then(json_as_string))?;
    let reviewer_id = src.get("user_id").and_then(json_as_string)?;
    let rating = src.get("rating").and_then(|v| v.as_i64())? as i32;
    if !(1..=5).contains(&rating) {
        return None;
    }
    let reviewed_at = src
        .get("date_created")
        .and_then(|v| v.as_str())
        .and_then(parse_upstream_datetime)
        .unwrap_or_else(crate::datetime::now_micros);
    Some(ParsedReview {
        external_id,
        reviewer_id,
        sku,
        rating,
        reviewed_at,
    })
}

/// The feed is inconsistent about quoting numeric ids — accept either form.
fn json_as_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) if !s.is_empty() => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

/// Upstream timestamps are `"YYYY-MM-DD HH:MM:SS"` (UTC, no zone marker); the
/// per-product endpoint uses ISO-8601 instead, so accept both.
fn parse_upstream_datetime(s: &str) -> Option<chrono::NaiveDateTime> {
    chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
        .ok()
        .or_else(|| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ").ok())
}

/// Map every known Shopify variant id to its flavor, skipping the packs/merch
/// category. Reviews identify a product by variant id, which is what
/// `flavor.variant_ids` records.
async fn build_sku_index(state: &AppState) -> anyhow::Result<HashMap<String, i32>> {
    let packs_id = Category::find()
        .filter(category::Column::Slug.eq(PACKS_SLUG))
        .one(&state.db)
        .await?
        .map(|c| c.id);

    let mut q = Flavor::find().filter(flavor::Column::VariantIds.is_not_null());
    if let Some(packs_id) = packs_id {
        q = q.filter(flavor::Column::CategoryId.ne(packs_id));
    }
    let flavors = q.all(&state.db).await?;

    let mut index = HashMap::new();
    for f in flavors {
        let Some(Value::Array(ids)) = f.variant_ids else {
            continue;
        };
        for id in ids {
            if let Some(sku) = json_as_string(&id) {
                // First flavor wins: a sku belongs to exactly one product, so a
                // clash means stale rows left by a merge — don't let it flap
                // between runs.
                index.entry(sku).or_insert(f.id);
            }
        }
    }
    Ok(index)
}

/// How many of this page's mappable reviews are already stored. Drives the
/// "caught up" stop condition.
async fn count_known(
    db: &sea_orm::DatabaseConnection,
    parsed: &[(ParsedReview, i32)],
) -> anyhow::Result<usize> {
    let ids: Vec<String> = parsed
        .iter()
        .map(|(r, _)| r.external_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    if ids.is_empty() {
        return Ok(0);
    }
    let found: Vec<String> = ExternalReview::find()
        .filter(external_review::Column::Source.eq(SOURCE_REVIEWS_IO))
        .filter(external_review::Column::ExternalId.is_in(ids))
        .select_only()
        .column(external_review::Column::ExternalId)
        .into_tuple()
        .all(db)
        .await?;
    Ok(found.len())
}

async fn fetch_page(client: &reqwest::Client, url: &str) -> anyhow::Result<Value> {
    let resp = client.get(url).send().await?.error_for_status()?;
    Ok(resp.json().await?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_a_product_review() {
        let src = json!({
            "type": "product_review",
            "_id": "product_review-55470773",
            "user_id": 73972324,
            "sku": "56879742288137",
            "rating": 5,
            "date_created": "2026-07-26 14:15:42",
            "author": "Stefanie S",
            "address": "Nuremberg, DE",
            "comments": "sehr lecker",
        });
        let r = parse_product_review(&src).expect("should parse");
        assert_eq!(r.external_id, "product_review-55470773");
        assert_eq!(r.reviewer_id, "73972324");
        assert_eq!(r.sku, "56879742288137");
        assert_eq!(r.rating, 5);
        assert_eq!(r.reviewed_at.to_string(), "2026-07-26 14:15:42");
    }

    #[test]
    fn store_reviews_are_not_product_reviews() {
        let src = json!({
            "type": "store_review",
            "_id": "store_review-30421911",
            "user_id": 73972342,
            "rating": 5,
            "date_created": "2026-07-26 14:17:26",
        });
        assert!(parse_product_review(&src).is_none());
    }

    #[test]
    fn reviews_missing_required_fields_are_skipped() {
        let base = json!({
            "type": "product_review",
            "_id": "product_review-1",
            "user_id": 1,
            "sku": "123",
            "rating": 5,
            "date_created": "2026-07-26 14:15:42",
        });
        for missing in ["sku", "user_id", "rating"] {
            let mut src = base.clone();
            src.as_object_mut().unwrap().remove(missing);
            assert!(
                parse_product_review(&src).is_none(),
                "missing {missing} should be skipped"
            );
        }
    }

    #[test]
    fn out_of_range_ratings_are_rejected() {
        let src = json!({
            "type": "product_review",
            "_id": "product_review-1",
            "user_id": 1,
            "sku": "123",
            "rating": 0,
            "date_created": "2026-07-26 14:15:42",
        });
        assert!(parse_product_review(&src).is_none());
    }

    #[test]
    fn numeric_and_string_ids_both_parse() {
        assert_eq!(json_as_string(&json!(12345)), Some("12345".to_string()));
        assert_eq!(json_as_string(&json!("12345")), Some("12345".to_string()));
        assert_eq!(json_as_string(&json!("")), None);
        assert_eq!(json_as_string(&json!(null)), None);
    }

    #[test]
    fn parses_both_upstream_timestamp_shapes() {
        assert!(parse_upstream_datetime("2026-07-26 14:15:42").is_some());
        assert!(parse_upstream_datetime("2026-07-26T14:15:42.000000Z").is_some());
        assert!(parse_upstream_datetime("last tuesday").is_none());
    }

    #[test]
    fn a_missing_date_does_not_drop_the_review() {
        // Ordering matters less than the rating itself — fall back to "now" rather
        // than discarding a usable signal.
        let src = json!({
            "type": "product_review",
            "_id": "product_review-1",
            "user_id": 1,
            "sku": "123",
            "rating": 4,
        });
        assert!(parse_product_review(&src).is_some());
    }
}
