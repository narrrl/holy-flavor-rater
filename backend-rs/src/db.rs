use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, Statement,
};
use std::time::Duration;

pub async fn connect(database_url: &str) -> anyhow::Result<DatabaseConnection> {
    let mut opts = ConnectOptions::new(database_url.to_owned());
    opts.max_connections(10)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(8))
        .sqlx_logging(false);
    // sqlx already applies `busy_timeout=5s` and `foreign_keys=ON` per connection
    // by default (matching Django's 5s SQLite timeout), so SQLITE_BUSY waits up to
    // 5s before erroring rather than failing instantly.
    let conn = Database::connect(opts).await?;

    // Enable WAL so the Rust and Django processes that share this SQLite file
    // during the strangler don't serialize readers behind the writer. In the
    // default rollback-journal mode a writer takes an exclusive lock that blocks
    // all readers, which surfaces as SQLITE_BUSY → 500s under concurrent load.
    // WAL lets readers proceed during a write. It is a persistent, database-level
    // setting stored in the file header, so this single statement covers every
    // pooled connection and the Django side too. Best-effort: switching journal
    // mode needs a brief exclusive lock that can't wait on busy_timeout, so log
    // and continue (the 5s busy_timeout still applies) if a writer holds it now.
    match conn
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "PRAGMA journal_mode=WAL;",
        ))
        .await
    {
        Ok(_) => tracing::info!("sqlite journal_mode=WAL enabled"),
        Err(e) => {
            tracing::warn!("could not enable WAL (continuing in default journal mode): {e}")
        }
    }

    Ok(conn)
}
