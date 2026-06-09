//! In-process interval scheduler replacing Celery beat. Every minute it checks
//! each job's `interval_hours` against its `last_run` and dispatches any that
//! are due. Schedules live entirely in the `api_job` rows (edited via the admin
//! `update_job_schedule` endpoint), so this is restart-safe: `last_run` persists
//! and survives process restarts.
//!
//! Strangler note: when this scheduler owns the jobs, the Python Celery `beat`
//! container must be disabled, or both will run the same jobs (double work).

use std::time::Duration;

use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::entities::prelude::Job as JobEntity;
use crate::entities::job;
use crate::state::AppState;

const TICK: Duration = Duration::from_secs(60);

/// Spawn the scheduler loop. Returns immediately; the loop runs for the life of
/// the process.
pub fn spawn_scheduler(state: AppState) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(TICK);
        loop {
            tick.tick().await;
            if let Err(e) = tick_once(&state).await {
                tracing::error!(error = %e, "scheduler tick failed");
            }
        }
    });
}

async fn tick_once(state: &AppState) -> anyhow::Result<()> {
    for job in super::registry() {
        let Some(row) = JobEntity::find()
            .filter(job::Column::Name.eq(job.name()))
            .one(&state.db)
            .await?
        else {
            // No row yet → never configured via the admin UI → not scheduled.
            continue;
        };
        if row.interval_hours <= 0 {
            continue;
        }
        let due = match row.last_run {
            None => true,
            Some(last) => {
                crate::datetime::now_micros() - last
                    >= chrono::Duration::hours(row.interval_hours as i64)
            }
        };
        if !due {
            continue;
        }
        if state.running_jobs.lock().await.contains(job.name()) {
            continue;
        }
        tracing::info!(job = job.name(), interval_hours = row.interval_hours, "scheduling due job");
        let st = state.clone();
        tokio::spawn(async move { super::run_job(&st, job).await });
    }
    Ok(())
}
