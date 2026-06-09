//! Background jobs — the Rust port of Django's management commands + Celery
//! tasks. Each job implements [`BackgroundJob`]; [`run_job`] wraps execution
//! with the `api_job` row lifecycle (status / last_run / output), mirroring the
//! old `_run_command_job` helper. A lightweight in-process scheduler
//! ([`spawn_scheduler`]) replaces Celery beat.
//!
//! Design notes vs. the Django original:
//! - Jobs return their full output log as a `String` on success. On failure the
//!   error is recorded in `error_message` (Django also kept partial stdout in
//!   `last_output`; ours stays empty on failure).
//! - The job *names* and *display names* match Django's `Job.JOB_TYPES` exactly,
//!   so the admin UI (which keys off them) is unchanged.

mod backup_db;
mod cleanup_duplicates;
mod download;
mod scheduler;
mod seed_banners;
mod seed_legacy;
mod sync_flavors;

use std::sync::Arc;

use async_trait::async_trait;
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter};
use unicode_normalization::UnicodeNormalization;

use crate::entities::prelude::Job as JobEntity;
use crate::entities::job;
use crate::state::AppState;

pub use scheduler::spawn_scheduler;

/// A runnable background job. Implementors are pure work units; the `api_job`
/// row bookkeeping lives in [`run_job`].
#[async_trait]
pub trait BackgroundJob: Send + Sync {
    /// Stable identifier, matching a `Job.JOB_TYPES` key (e.g. `"sync_flavors"`).
    fn name(&self) -> &'static str;
    /// Human label, matching the Django `get_name_display()` value.
    fn display_name(&self) -> &'static str;
    /// Do the work, returning a human-readable output log on success.
    async fn run(&self, state: &AppState) -> anyhow::Result<String>;
}

/// All registered jobs. Order is irrelevant (the admin list re-sorts by name).
pub fn registry() -> Vec<Arc<dyn BackgroundJob>> {
    vec![
        Arc::new(sync_flavors::SyncFlavors),
        Arc::new(cleanup_duplicates::CleanupDuplicates),
        Arc::new(backup_db::BackupDb),
        Arc::new(seed_legacy::SeedLegacy),
        Arc::new(seed_banners::SeedBanners),
    ]
}

/// Look up a job by its `name`.
pub fn lookup(name: &str) -> Option<Arc<dyn BackgroundJob>> {
    registry().into_iter().find(|j| j.name() == name)
}

/// Fetch the `api_job` row for `name`, creating a default one if absent
/// (mirrors `Job.objects.get_or_create(name=...)`).
pub async fn get_or_create_row(db: &DatabaseConnection, name: &str) -> Result<job::Model, DbErr> {
    if let Some(j) = JobEntity::find()
        .filter(job::Column::Name.eq(name))
        .one(db)
        .await?
    {
        return Ok(j);
    }
    job::ActiveModel {
        name: Set(name.to_string()),
        status: Set("pending".into()),
        interval_hours: Set(0),
        last_output: Set(String::new()),
        error_message: Set(String::new()),
        ..Default::default()
    }
    .insert(db)
    .await
}

/// Run a job end-to-end, recording lifecycle state in its `api_job` row. Skips
/// if the same job is already running (concurrency guard in [`AppState`]). Safe
/// to `tokio::spawn` as fire-and-forget — errors are logged + persisted.
pub async fn run_job(state: &AppState, job: Arc<dyn BackgroundJob>) {
    let name = job.name();
    // Reserve the slot; bail if another run holds it.
    if !state.running_jobs.lock().await.insert(name.to_string()) {
        tracing::warn!(job = name, "job already running; skipping");
        return;
    }
    if let Err(e) = run_inner(state, job.as_ref()).await {
        tracing::error!(job = name, error = %e, "job lifecycle bookkeeping failed");
    }
    state.running_jobs.lock().await.remove(name);
}

async fn run_inner(state: &AppState, job: &dyn BackgroundJob) -> anyhow::Result<()> {
    let db = &state.db;
    let row = get_or_create_row(db, job.name()).await?;

    let mut am: job::ActiveModel = row.into();
    am.status = Set("running".into());
    am.last_run = Set(Some(crate::datetime::now_micros()));
    am.last_output = Set(String::new());
    am.error_message = Set(String::new());
    let row = am.update(db).await?;

    tracing::info!(job = job.name(), "job started");
    match job.run(state).await {
        Ok(output) => {
            let mut am: job::ActiveModel = row.into();
            am.status = Set("completed".into());
            am.last_output = Set(output);
            am.error_message = Set(String::new());
            am.update(db).await?;
            tracing::info!(job = job.name(), "job completed");
        }
        Err(e) => {
            let mut am: job::ActiveModel = row.into();
            am.status = Set("failed".into());
            am.error_message = Set(e.to_string());
            am.update(db).await?;
            tracing::error!(job = job.name(), error = %e, "job failed");
        }
    }
    Ok(())
}

/// Django's `slugify`: NFKD-normalize, drop non-ASCII, lowercase, keep only
/// `[a-z0-9_-]` plus whitespace, collapse runs of spaces/hyphens to a single
/// `-`, and strip leading/trailing `-`/`_`. Matching this exactly keeps the
/// media image paths (and category slugs) identical to Django's so files and
/// rows are reused, not duplicated.
pub fn slugify(value: &str) -> String {
    let ascii: String = value.nfkd().filter(|c| c.is_ascii()).collect::<String>().to_lowercase();
    // Keep word chars, hyphen and whitespace; drop the rest.
    let kept: String = ascii
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-' || c.is_whitespace())
        .collect();
    // Collapse [-\s]+ into a single '-'.
    let mut out = String::with_capacity(kept.len());
    let mut prev_dash = false;
    for c in kept.chars() {
        if c == '-' || c.is_whitespace() {
            if !prev_dash {
                out.push('-');
                prev_dash = true;
            }
        } else {
            out.push(c);
            prev_dash = false;
        }
    }
    out.trim_matches(|c| c == '-' || c == '_').to_string()
}
