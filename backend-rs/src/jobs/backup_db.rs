//! Port of `backup_db --full` — snapshot the SQLite database with `VACUUM INTO`
//! (a consistent online backup), bundle it with the media tree into a gzip
//! tarball, drop the raw snapshot, and prune backups older than the retention
//! window. The Celery task always ran `--full` with the default 7-day retention.

use std::fs::{self, File};
use std::path::Path;
use std::time::{Duration, SystemTime};

use async_trait::async_trait;
use flate2::write::GzEncoder;
use flate2::Compression;
use sea_orm::{ConnectionTrait, DbBackend, Statement};

use crate::state::AppState;

use super::BackgroundJob;

const RETENTION_DAYS: u64 = 7;

pub struct BackupDb;

#[async_trait]
impl BackgroundJob for BackupDb {
    fn name(&self) -> &'static str {
        "backup_db"
    }
    fn display_name(&self) -> &'static str {
        "Database Backup"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db_path = state.config.sqlite_path();
        if db_path.is_empty() {
            anyhow::bail!("could not determine sqlite path from DATABASE_URL");
        }
        let backup_dir = state.config.backup_dir.clone();
        let media_root = state.config.media_root.clone();
        fs::create_dir_all(&backup_dir)?;

        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let db_backup_path = format!("{backup_dir}/db_backup_{timestamp}.sqlite3");

        let mut log: Vec<String> = Vec::new();
        log.push(format!("Cloning database {db_path}..."));

        // VACUUM INTO produces a consistent snapshot even under concurrent
        // access — the SQLite-native equivalent of Python's `sqlite3 .backup`.
        let escaped = db_backup_path.replace('\'', "''");
        state
            .db
            .execute(Statement::from_string(
                DbBackend::Sqlite,
                format!("VACUUM INTO '{escaped}'"),
            ))
            .await?;
        log.push(format!("DB backup created: {db_backup_path}"));

        // Archive + retention is blocking IO; keep it off the async runtime.
        let archive_path = format!("{backup_dir}/full_backup_{timestamp}.tar.gz");
        log.push(format!("Creating full archive at {archive_path}..."));
        let archive_log = tokio::task::spawn_blocking(move || {
            build_archive(&db_backup_path, &media_root, &archive_path)?;
            // Drop the raw snapshot now that it is bundled.
            let _ = fs::remove_file(&db_backup_path);
            prune_old(&backup_dir)
        })
        .await??;
        log.push("Full archive created successfully.".to_string());
        log.push(format!(
            "Cleaning up backups older than {RETENTION_DAYS} days..."
        ));
        log.extend(archive_log);

        Ok(log.join("\n"))
    }
}

/// Build the gzip tarball: the snapshot as `db.sqlite3` + the media tree as `media`.
fn build_archive(db_backup_path: &str, media_root: &str, archive_path: &str) -> anyhow::Result<()> {
    let tar_gz = File::create(archive_path)?;
    let enc = GzEncoder::new(tar_gz, Compression::default());
    let mut tar = tar::Builder::new(enc);
    tar.append_path_with_name(db_backup_path, "db.sqlite3")?;
    if Path::new(media_root).exists() {
        tar.append_dir_all("media", media_root)?;
    }
    tar.into_inner()?.finish()?;
    Ok(())
}

/// Delete files in `backup_dir` older than the retention window. Returns log lines.
fn prune_old(backup_dir: &str) -> anyhow::Result<Vec<String>> {
    let mut log = Vec::new();
    let cutoff = SystemTime::now() - Duration::from_secs(RETENTION_DAYS * 24 * 60 * 60);
    for entry in fs::read_dir(backup_dir)?.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let modified = entry.metadata().and_then(|m| m.modified()).ok();
        if let Some(mtime) = modified {
            if mtime < cutoff {
                let name = path
                    .file_name()
                    .and_then(|f| f.to_str())
                    .unwrap_or("")
                    .to_string();
                match fs::remove_file(&path) {
                    Ok(_) => log.push(format!("  -> Deleted old backup: {name}")),
                    Err(e) => log.push(format!("  -> Failed to delete {name}: {e}")),
                }
            }
        }
    }
    Ok(log)
}
