//! Port of `NotificationViewSet` (`api/views/user.py`). Read-only list/retrieve
//! of the caller's own notifications (no pagination — plain array), plus
//! mark-read actions. All actions require authentication.

use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde_json::{json, Value};

use crate::auth::AuthUser;
use crate::dto::NotificationOut;
use crate::entities::notification;
use crate::entities::prelude::*;
use crate::error::{ApiError, ApiResult};
use crate::service::build_notifications;
use crate::state::AppState;
use crate::web::RequestCtx;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/notifications/", get(list))
        .route("/notifications/mark_all_read/", post(mark_all_read))
        .route("/notifications/{id}/", get(retrieve))
        .route("/notifications/{id}/mark_read/", post(mark_read))
}

/// GET /api/notifications/ — caller's notifications, newest first (no pagination).
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<Vec<NotificationOut>>> {
    let models = Notification::find()
        .filter(notification::Column::RecipientId.eq(uid))
        .order_by_desc(notification::Column::CreatedAt)
        .all(&state.db)
        .await?;
    Ok(Json(build_notifications(&state, &ctx, models).await?))
}

/// GET /api/notifications/{id}/ — own only (404 otherwise).
async fn retrieve(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<NotificationOut>> {
    let n = Notification::find_by_id(id)
        .filter(notification::Column::RecipientId.eq(uid))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut dtos = build_notifications(&state, &ctx, vec![n]).await?;
    dtos.pop().map(Json).ok_or(ApiError::NotFound)
}

/// POST /api/notifications/mark_all_read/
async fn mark_all_read(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<Value>> {
    Notification::update_many()
        .col_expr(
            notification::Column::IsRead,
            sea_orm::sea_query::Expr::value(true),
        )
        .filter(notification::Column::RecipientId.eq(uid))
        .filter(notification::Column::IsRead.eq(false))
        .exec(&state.db)
        .await?;
    Ok(Json(json!({ "status": "all read" })))
}

/// POST /api/notifications/{id}/mark_read/ — own only.
async fn mark_read(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<Value>> {
    let n = Notification::find_by_id(id)
        .filter(notification::Column::RecipientId.eq(uid))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut active: notification::ActiveModel = n.into();
    active.is_read = Set(true);
    active.update(&state.db).await?;
    Ok(Json(json!({ "status": "marked read" })))
}
