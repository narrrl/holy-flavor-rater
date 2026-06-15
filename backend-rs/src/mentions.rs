//! Port of `api/services/mentions.py`: scan text for `@username`, resolve each
//! to a user (case-insensitive), and create a `mention` notification with
//! get_or_create semantics (no duplicate rows for the same target).

use sea_orm::sea_query::{Expr, Func};
use sea_orm::{
    ActiveValue::{NotSet, Set},
    ColumnTrait, Condition, ConnectionTrait, EntityTrait, QueryFilter,
};

use crate::entities::prelude::*;
use crate::entities::{notification, user};
use crate::error::ApiResult;

/// Extract distinct `@word` handles. `\w` in Django = `[A-Za-z0-9_]`.
fn extract_handles(text: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'@' {
            let start = i + 1;
            let mut j = start;
            while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_') {
                j += 1;
            }
            if j > start {
                let handle = &text[start..j];
                if !out.iter().any(|h| h == handle) {
                    out.push(handle.to_string());
                }
            }
            i = j;
        } else {
            i += 1;
        }
    }
    out
}

/// `col IS value` — equality for `Some`, IS NULL for `None` (Django's lookup
/// translation for nullable FKs in get_or_create).
fn eq_or_null(col: notification::Column, value: Option<i32>) -> Condition {
    match value {
        Some(v) => Condition::all().add(col.eq(v)),
        None => Condition::all().add(col.is_null()),
    }
}

pub async fn parse_mentions<C: ConnectionTrait>(
    db: &C,
    text: &str,
    actor_id: i32,
    rating_id: Option<i32>,
    reply_id: Option<i32>,
) -> ApiResult<()> {
    if text.is_empty() {
        return Ok(());
    }
    for handle in extract_handles(text) {
        // username__iexact
        let recipient = User::find()
            .filter(
                Expr::expr(Func::lower(Expr::col(user::Column::Username)))
                    .eq(handle.to_lowercase()),
            )
            .one(db)
            .await?;
        let Some(recipient) = recipient else { continue };
        if recipient.id == actor_id {
            continue;
        }

        // get_or_create(recipient, actor, type="mention", rating, reply)
        let exists = Notification::find()
            .filter(notification::Column::RecipientId.eq(recipient.id))
            .filter(notification::Column::ActorId.eq(actor_id))
            .filter(notification::Column::NotificationType.eq("mention"))
            .filter(eq_or_null(notification::Column::RatingId, rating_id))
            .filter(eq_or_null(notification::Column::ReplyId, reply_id))
            .one(db)
            .await?;
        if exists.is_some() {
            continue;
        }

        let now = crate::datetime::now_micros();
        let row = notification::ActiveModel {
            id: NotSet,
            is_read: Set(false),
            created_at: Set(now),
            actor_id: Set(actor_id),
            rating_id: Set(rating_id),
            recipient_id: Set(recipient.id),
            reply_id: Set(reply_id),
            ticket_id: Set(None),
            notification_type: Set("mention".to_string()),
            profile_comment_id: Set(None),
        };
        Notification::insert(row).exec(db).await?;
    }
    Ok(())
}
