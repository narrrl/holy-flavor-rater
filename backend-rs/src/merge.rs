//! Port of `api/services/flavor.py::merge_flavors`. Merges one flavor row into
//! another, re-homing ratings and preserving rating integrity. Used by both the
//! admin `merge_flavors` endpoint and the `cleanup_duplicates` job.

use sea_orm::sea_query::Expr;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter,
    TransactionTrait,
};

use crate::entities::prelude::*;
use crate::entities::{flavor, notification, rating, reply};

/// Rank a rating for conflict resolution: longest comment wins, newer breaks
/// ties (mirrors Python's tuple comparison `(len(comment), created_at)`).
fn quality(r: &rating::Model) -> (usize, chrono::NaiveDateTime) {
    (
        r.comment.as_deref().unwrap_or("").chars().count(),
        r.created_at,
    )
}

/// Merge `remove` into `keep`. Re-assigns all of `remove`'s ratings; when a user
/// rated both flavors the higher-quality review survives and its replies +
/// notifications are re-pointed onto the surviving row. Runs in one transaction.
pub async fn merge_flavors(
    db: &DatabaseConnection,
    keep: &flavor::Model,
    remove: &flavor::Model,
) -> Result<(), DbErr> {
    if keep.id == remove.id {
        return Ok(());
    }

    let txn = db.begin().await?;

    let incomings = Rating::find()
        .filter(rating::Column::FlavorId.eq(remove.id))
        .all(&txn)
        .await?;

    for incoming in incomings {
        let existing = Rating::find()
            .filter(rating::Column::UserId.eq(incoming.user_id))
            .filter(rating::Column::FlavorId.eq(keep.id))
            .one(&txn)
            .await?;

        let Some(existing) = existing else {
            // No conflict — move the rating wholesale.
            let mut am: rating::ActiveModel = incoming.into();
            am.flavor_id = Set(keep.id);
            am.update(&txn).await?;
            continue;
        };

        // Conflict: keep one row (unique user+flavor). If the incoming review is
        // better, copy its content + timestamp onto the surviving row.
        if quality(&incoming) > quality(&existing) {
            let mut am: rating::ActiveModel = existing.clone().into();
            am.score = Set(incoming.score);
            am.comment = Set(incoming.comment.clone());
            am.created_at = Set(incoming.created_at);
            am.update(&txn).await?;
        }

        // Preserve community feedback attached to the discarded rating.
        Reply::update_many()
            .col_expr(reply::Column::RatingId, Expr::value(existing.id))
            .filter(reply::Column::RatingId.eq(incoming.id))
            .exec(&txn)
            .await?;
        Notification::update_many()
            .col_expr(notification::Column::RatingId, Expr::value(existing.id))
            .filter(notification::Column::RatingId.eq(incoming.id))
            .exec(&txn)
            .await?;
        Rating::delete_by_id(incoming.id).exec(&txn).await?;
    }

    // Carry over the Shopify link if the kept flavor lacks one. external_id is
    // unique, so the donor row must be gone before we assign it.
    let inherited = if keep.external_id.is_none() {
        remove.external_id
    } else {
        None
    };

    // Record the removed flavor's name (and any aliases it already carried) onto
    // the survivor, so `seed_legacy` won't recreate the merged-away row and search
    // still resolves the old name. Deduped case-insensitively; never alias the
    // kept flavor's own name.
    let original = json_str_list(&keep.aliases);
    let mut aliases = original.clone();
    let mut seen: std::collections::HashSet<String> =
        aliases.iter().map(|a| a.to_lowercase()).collect();
    seen.insert(keep.name.to_lowercase());
    for cand in std::iter::once(remove.name.clone()).chain(json_str_list(&remove.aliases)) {
        if seen.insert(cand.to_lowercase()) {
            aliases.push(cand);
        }
    }
    let aliases_changed = aliases.len() != original.len();

    Flavor::delete_by_id(remove.id).exec(&txn).await?;

    if inherited.is_some() || aliases_changed {
        let mut am: flavor::ActiveModel = keep.clone().into();
        if let Some(eid) = inherited {
            am.external_id = Set(Some(eid));
        }
        if aliases_changed {
            am.aliases = Set(Some(serde_json::json!(aliases)));
        }
        am.update(&txn).await?;
    }

    txn.commit().await?;
    Ok(())
}

/// Django JSONField (list) stored as TEXT → Vec<String>, tolerating null/non-array.
fn json_str_list(v: &Option<serde_json::Value>) -> Vec<String> {
    match v {
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(String::from))
            .collect(),
        _ => Vec::new(),
    }
}
