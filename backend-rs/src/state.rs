use std::collections::HashSet;
use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::sync::Mutex;

use crate::config::Config;
use crate::reviews::SignalCache;
use crate::throttle::Security;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub config: Config,
    /// Names of jobs currently executing. Guards against a manual trigger and
    /// the scheduler (or two triggers) running the same job concurrently —
    /// these jobs mutate shared catalog rows and are not safe to overlap.
    pub running_jobs: Arc<Mutex<HashSet<String>>>,
    /// Rate limiting + confirmation-code TTL/attempt state (replaces
    /// `django_ratelimit`). Shared across handlers via `Arc`.
    pub security: Arc<Security>,
    /// Cached aggregate of the ingested shop reviews that back the recommender.
    /// Too expensive to rebuild per request; see [`crate::reviews::signals`].
    pub external_signals: Arc<SignalCache>,
}
