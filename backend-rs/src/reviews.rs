//! Glue between the `external_review` table and the pure scoring maths in
//! [`crate::recommend`]: pseudonymising reviewer ids on the way in, and loading +
//! caching the aggregated signal on the way out.

use std::sync::Arc;
use std::time::{Duration, Instant};

use sea_orm::EntityTrait;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;

use crate::entities::prelude::ExternalReview;
use crate::error::ApiResult;
use crate::recommend::{ExternalInput, ExternalSignals};
use crate::state::AppState;

/// Source slug for reviews.io rows in `external_review.source`.
pub const SOURCE_REVIEWS_IO: &str = "reviews_io";

/// How long an aggregated snapshot is served before being rebuilt. The feed only
/// changes when `sync_reviews` runs (hours apart), so this is about bounding
/// staleness after a sync, not freshness per se — the job invalidates the cache
/// directly when it finishes.
const CACHE_TTL: Duration = Duration::from_secs(10 * 60);

/// One-way, salted identifier for an upstream reviewer.
///
/// We never store the upstream reviewer id itself — only enough to recognise that
/// two reviews came from the same anonymous buyer. Truncated to 32 hex chars (128
/// bits), far beyond collision range for a feed of this size.
///
/// The salt comes from `REVIEWS_HASH_SALT` (falling back to `SECRET_KEY`). Rotating
/// it re-pseudonymises *new* rows only, so existing rows would no longer join up
/// with them — truncate `external_review` and re-sync if you ever change it.
pub fn reviewer_key(salt: &str, source: &str, upstream_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(b"\0");
    hasher.update(source.as_bytes());
    hasher.update(b"\0");
    hasher.update(upstream_id.as_bytes());
    let digest = hasher.finalize();
    let mut out = String::with_capacity(32);
    for b in digest.iter().take(16) {
        out.push_str(&format!("{b:02x}"));
    }
    out
}

/// Collapse a stored `reviewer_key` into the `u64` bucket the scoring maths uses.
/// Only equality matters there, and 64 bits keeps collisions negligible.
fn reviewer_bucket(key: &str) -> u64 {
    let hex: String = key.chars().take(16).collect();
    u64::from_str_radix(&hex, 16).unwrap_or_else(|_| {
        // Non-hex keys shouldn't exist, but a stable fallback beats collapsing
        // every malformed row onto one bucket.
        let digest = Sha256::digest(key.as_bytes());
        u64::from_be_bytes(digest[..8].try_into().unwrap_or([0; 8]))
    })
}

#[derive(Clone)]
struct Snapshot {
    built_at: Instant,
    signals: Arc<ExternalSignals>,
}

/// Process-local cache of the aggregated shop-review signal.
///
/// Rebuilding scans the whole `external_review` table (tens of thousands of rows),
/// which is far too much to redo on every recommendation request. Per-process and
/// eventually consistent by design: a stale snapshot only ever means recommendations
/// lag a sync by up to [`CACHE_TTL`].
#[derive(Default)]
pub struct SignalCache {
    inner: RwLock<Option<Snapshot>>,
}

impl SignalCache {
    /// Drop the cached snapshot so the next read rebuilds. Called by `sync_reviews`
    /// after it ingests new rows.
    pub async fn invalidate(&self) {
        *self.inner.write().await = None;
    }
}

/// The current aggregated shop-review signal, rebuilding it if the cache is cold or
/// stale.
pub async fn signals(state: &AppState) -> ApiResult<Arc<ExternalSignals>> {
    if let Some(snap) = state.external_signals.inner.read().await.as_ref() {
        if snap.built_at.elapsed() < CACHE_TTL {
            return Ok(snap.signals.clone());
        }
    }

    let rows = ExternalReview::find().all(&state.db).await?;
    let inputs: Vec<ExternalInput> = rows
        .iter()
        .map(|r| ExternalInput {
            reviewer: reviewer_bucket(&r.reviewer_key),
            flavor_id: r.flavor_id,
            stars: r.rating,
        })
        .collect();
    let signals = Arc::new(ExternalSignals::build(&inputs));

    // A concurrent request may have rebuilt it meanwhile; last writer wins, and
    // both snapshots are equally valid.
    *state.external_signals.inner.write().await = Some(Snapshot {
        built_at: Instant::now(),
        signals: signals.clone(),
    });
    tracing::debug!(reviews = rows.len(), "rebuilt external review signal");
    Ok(signals)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reviewer_key_is_stable_and_salted() {
        let a = reviewer_key("salt-a", SOURCE_REVIEWS_IO, "12345");
        assert_eq!(a, reviewer_key("salt-a", SOURCE_REVIEWS_IO, "12345"));
        assert_ne!(a, reviewer_key("salt-b", SOURCE_REVIEWS_IO, "12345"));
        assert_ne!(a, reviewer_key("salt-a", SOURCE_REVIEWS_IO, "12346"));
        assert_eq!(a.len(), 32);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        // The upstream id must not be recoverable from (or visible in) the key.
        assert!(!a.contains("12345"));
    }

    #[test]
    fn reviewer_key_is_namespaced_by_source() {
        assert_ne!(
            reviewer_key("s", "reviews_io", "1"),
            reviewer_key("s", "other", "1")
        );
    }

    #[test]
    fn reviewer_bucket_separates_distinct_reviewers() {
        let a = reviewer_bucket(&reviewer_key("s", SOURCE_REVIEWS_IO, "1"));
        let b = reviewer_bucket(&reviewer_key("s", SOURCE_REVIEWS_IO, "2"));
        assert_ne!(a, b);
        // Same key in, same bucket out.
        assert_eq!(
            a,
            reviewer_bucket(&reviewer_key("s", SOURCE_REVIEWS_IO, "1"))
        );
    }

    #[test]
    fn reviewer_bucket_tolerates_a_malformed_key() {
        // Doesn't panic, and still separates two different malformed keys.
        assert_ne!(
            reviewer_bucket("not-hex-at-all"),
            reviewer_bucket("also-not")
        );
    }
}
