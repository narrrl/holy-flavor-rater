//! Refresh-token blacklist, sharing SimpleJWT's tables
//! (`token_blacklist_outstandingtoken` / `token_blacklist_blacklistedtoken`).
//!
//! Replicates `rest_framework_simplejwt`'s blacklist app so rotation works
//! across both backends:
//! - login records an outstanding token (`RefreshToken.for_user`),
//! - refresh blacklists the incoming token before issuing a rotated pair
//!   (`BLACKLIST_AFTER_ROTATION`),
//! - logout blacklists the cookie's refresh token,
//! - verification rejects blacklisted jtis.

use chrono::Utc;
use sea_orm::{ConnectionTrait, DatabaseConnection, Statement, Value};

use crate::datetime::db_datetime;
use crate::error::ApiResult;

/// Has this jti been blacklisted?
pub async fn is_blacklisted(db: &DatabaseConnection, jti: &str) -> ApiResult<bool> {
    let stmt = Statement::from_sql_and_values(
        db.get_database_backend(),
        "SELECT 1 FROM token_blacklist_blacklistedtoken b \
         JOIN token_blacklist_outstandingtoken o ON b.token_id = o.id \
         WHERE o.jti = ? LIMIT 1",
        [jti.into()],
    );
    Ok(db.query_one(stmt).await?.is_some())
}

/// Record an outstanding refresh token (mirrors `RefreshToken.for_user`).
/// `jti` is unique, so a re-record is a no-op.
pub async fn record_outstanding(
    db: &DatabaseConnection,
    user_id: i32,
    jti: &str,
    token: &str,
    created_at: chrono::NaiveDateTime,
    expires_at: chrono::NaiveDateTime,
) -> ApiResult<()> {
    let stmt = Statement::from_sql_and_values(
        db.get_database_backend(),
        "INSERT OR IGNORE INTO token_blacklist_outstandingtoken \
         (token, created_at, expires_at, user_id, jti) VALUES (?, ?, ?, ?, ?)",
        [
            token.into(),
            db_datetime(&created_at).into(),
            db_datetime(&expires_at).into(),
            user_id.into(),
            jti.into(),
        ],
    );
    db.execute(stmt).await?;
    Ok(())
}

/// Blacklist a refresh token (mirrors `BlacklistMixin.blacklist`): ensure an
/// outstanding row exists for the jti, then a blacklist row referencing it.
pub async fn blacklist(
    db: &DatabaseConnection,
    user_id: i32,
    jti: &str,
    token: &str,
    expires_at: chrono::NaiveDateTime,
) -> ApiResult<()> {
    // `created_at` is unknown for a token we didn't mint here; Django's
    // get_or_create leaves it NULL in that case, so omit it.
    let upsert = Statement::from_sql_and_values(
        db.get_database_backend(),
        "INSERT OR IGNORE INTO token_blacklist_outstandingtoken \
         (token, created_at, expires_at, user_id, jti) VALUES (?, NULL, ?, ?, ?)",
        [
            token.into(),
            db_datetime(&expires_at).into(),
            user_id.into(),
            jti.into(),
        ],
    );
    db.execute(upsert).await?;

    let now = db_datetime(&Utc::now().naive_utc());
    let bl = Statement::from_sql_and_values(
        db.get_database_backend(),
        "INSERT OR IGNORE INTO token_blacklist_blacklistedtoken (blacklisted_at, token_id) \
         SELECT ?, id FROM token_blacklist_outstandingtoken WHERE jti = ?",
        [Value::from(now), jti.into()],
    );
    db.execute(bl).await?;
    Ok(())
}
