//! Port of `ReplyViewSet` (`api/views/rating.py`). All actions require
//! authentication. Creation is intentionally not exposed: Django marks `rating`
//! read-only on the serializer, so replies are only ever made via the rating's
//! `reply` action — the frontend never POSTs to `/replies/`.

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{Method, StatusCode};
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, TransactionTrait,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::auth::AuthUser;
use crate::dto::ReplyOut;
use crate::entities::prelude::*;
use crate::entities::{notification, reply, user};
use crate::error::{ApiError, ApiResult};
use crate::mentions::parse_mentions;
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::service::build_replies;
use crate::state::AppState;
use crate::web::RequestCtx;

pub fn router() -> Router<AppState> {
    Router::new().route("/replies/", get(list)).route(
        "/replies/{id}/",
        get(retrieve).put(update).patch(update).delete(destroy),
    )
}

#[derive(Deserialize)]
struct PageParam {
    page: Option<String>,
}

async fn load_actor(state: &AppState, uid: i32) -> ApiResult<user::Model> {
    User::find_by_id(uid)
        .one(&state.db)
        .await?
        .ok_or(ApiError::Unauthorized)
}

/// GET /api/replies/ — paginated, ordered by created_at asc.
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(_uid): AuthUser,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<ReplyOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;
    let count = Reply::find().count(&state.db).await?;
    let models = Reply::find()
        .order_by_asc(reply::Column::CreatedAt)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = build_replies(&state, models).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/replies/{id}/
async fn retrieve(
    State(state): State<AppState>,
    AuthUser(_uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<ReplyOut>> {
    let model = Reply::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut dtos = build_replies(&state, vec![model]).await?;
    dtos.pop().map(Json).ok_or(ApiError::NotFound)
}

/// PUT/PATCH /api/replies/{id}/ — owner or superuser; re-parses @mentions.
async fn update(
    State(state): State<AppState>,
    method: Method,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<ReplyOut>> {
    let existing = Reply::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let actor = load_actor(&state, uid).await?;
    if existing.user_id != uid && !actor.is_superuser {
        return Err(ApiError::Forbidden("You cannot edit this reply.".into()));
    }

    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let partial = method == Method::PATCH;

    let mut active: reply::ActiveModel = existing.clone().into();
    match data.get("text") {
        Some(Value::String(s)) if !s.is_empty() => active.text = Set(s.clone()),
        Some(Value::String(_)) => {
            return Err(ApiError::Validation(
                json!({ "text": ["This field may not be blank."] }),
            ));
        }
        Some(Value::Null) | None if !partial => {
            return Err(ApiError::Validation(
                json!({ "text": ["This field is required."] }),
            ));
        }
        Some(v) if !v.is_null() => {
            return Err(ApiError::Validation(
                json!({ "text": ["Not a valid string."] }),
            ));
        }
        _ => {}
    }

    let model = active.update(&state.db).await?;
    parse_mentions(
        &state.db,
        &model.text,
        uid,
        Some(model.rating_id),
        Some(model.id),
    )
    .await?;

    let mut dtos = build_replies(&state, vec![model]).await?;
    dtos.pop().map(Json).ok_or(ApiError::Internal)
}

/// DELETE /api/replies/{id}/ — owner or superuser.
async fn destroy(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<StatusCode> {
    let existing = Reply::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let actor = load_actor(&state, uid).await?;
    if existing.user_id != uid && !actor.is_superuser {
        return Err(ApiError::Forbidden("You cannot delete this reply.".into()));
    }
    // Emulate Django's CASCADE: clear notifications referencing this reply first
    // (SQLite FKs are enforced but have no ON DELETE CASCADE).
    let txn = state.db.begin().await?;
    Notification::delete_many()
        .filter(notification::Column::ReplyId.eq(id))
        .exec(&txn)
        .await?;
    Reply::delete_by_id(id).exec(&txn).await?;
    txn.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
