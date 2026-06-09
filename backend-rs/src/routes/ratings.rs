//! Port of `RatingViewSet` (`api/views/rating.py`). Writes go through the shared
//! SQLite file, so inserts/updates here are visible to Django and vice versa.

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{Method, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Statement, TransactionTrait,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::auth::AuthUser;
use crate::dto::{RatingOut, ReplyOut};
use crate::entities::prelude::*;
use crate::entities::{notification, rating, reply, user};
use crate::error::{ApiError, ApiResult};
use crate::mentions::parse_mentions;
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::service::{build_ratings, build_replies};
use crate::state::AppState;
use crate::web::RequestCtx;

const FEED_PAGE_SIZE: u64 = 10;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/ratings/", get(list).post(create))
        .route("/ratings/feed/", get(feed))
        .route("/ratings/recent/", get(recent))
        .route(
            "/ratings/{id}/",
            get(retrieve).put(update).patch(update).delete(destroy),
        )
        .route("/ratings/{id}/reply/", post(reply))
}

#[derive(Deserialize)]
struct PageParam {
    page: Option<String>,
}

/// Load the acting user row (for superuser checks). 401 if the id is stale.
async fn load_actor(state: &AppState, uid: i32) -> ApiResult<user::Model> {
    User::find_by_id(uid)
        .one(&state.db)
        .await?
        .ok_or(ApiError::Unauthorized)
}

/// Read an integer from a JSON value (accepts only JSON numbers, like DRF).
fn as_i32(v: &Value) -> Option<i32> {
    v.as_i64().and_then(|n| i32::try_from(n).ok())
}

/// GET /api/ratings/ — paginated, ordered by -created_at (IsAuthenticatedOrReadOnly).
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<RatingOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;
    let count = Rating::find().count(&state.db).await?;
    let models = Rating::find()
        .order_by_desc(rating::Column::CreatedAt)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = build_ratings(&state, &ctx, models).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/ratings/{id}/
async fn retrieve(
    State(state): State<AppState>,
    ctx: RequestCtx,
    Path(id): Path<i32>,
) -> ApiResult<Json<RatingOut>> {
    let model = Rating::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut dtos = build_ratings(&state, &ctx, vec![model]).await?;
    dtos.pop().map(Json).ok_or(ApiError::NotFound)
}

/// POST /api/ratings/ — create a rating for the authenticated user.
async fn create(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<RatingOut>)> {
    // django_ratelimit(key="user", rate="10/m") on RatingViewSet.create.
    state
        .security
        .check_rate(&format!("rating:user:{uid}"), crate::throttle::RATING_CREATE)?;
    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

    // DRF validation, aggregated and field-keyed, in serializer field order.
    let mut errors = serde_json::Map::new();

    // flavor (PrimaryKeyRelatedField, required)
    let flavor_id = match data.get("flavor") {
        None | Some(Value::Null) => {
            errors.insert("flavor".into(), json!(["This field is required."]));
            None
        }
        Some(v) => match as_i32(v) {
            Some(id) => Some(id),
            None => {
                errors.insert(
                    "flavor".into(),
                    json!(["Incorrect type. Expected pk value, received str."]),
                );
                None
            }
        },
    };

    // score (IntegerField, 1..=10, required)
    let score = match data.get("score") {
        None | Some(Value::Null) => {
            errors.insert("score".into(), json!(["This field is required."]));
            None
        }
        Some(v) => match as_i32(v) {
            Some(s) if s < 1 => {
                errors.insert(
                    "score".into(),
                    json!(["Ensure this value is greater than or equal to 1."]),
                );
                None
            }
            Some(s) if s > 10 => {
                errors.insert(
                    "score".into(),
                    json!(["Ensure this value is less than or equal to 10."]),
                );
                None
            }
            Some(s) => Some(s),
            None => {
                errors.insert("score".into(), json!(["A valid integer is required."]));
                None
            }
        },
    };

    // comment (optional TextField)
    let comment = match data.get("comment") {
        None | Some(Value::Null) => None,
        Some(Value::String(s)) => Some(s.clone()),
        Some(_) => {
            errors.insert("comment".into(), json!(["Not a valid string."]));
            None
        }
    };

    // Flavor must exist (PrimaryKeyRelatedField pk check).
    if let Some(fid) = flavor_id {
        if !errors.contains_key("flavor") {
            let exists = Flavor::find_by_id(fid).one(&state.db).await?.is_some();
            if !exists {
                errors.insert(
                    "flavor".into(),
                    json!([format!("Invalid pk \"{fid}\" - object does not exist.")]),
                );
            }
        }
    }

    if !errors.is_empty() {
        return Err(ApiError::Validation(Value::Object(errors)));
    }
    let (flavor_id, score) = (flavor_id.unwrap(), score.unwrap());

    // perform_create: reject a second rating of the same flavor by this user.
    let dup = Rating::find()
        .filter(rating::Column::UserId.eq(uid))
        .filter(rating::Column::FlavorId.eq(flavor_id))
        .one(&state.db)
        .await?
        .is_some();
    if dup {
        return Err(ApiError::Validation(json!([
            "You have already rated this flavor."
        ])));
    }

    let now = crate::datetime::now_micros();
    let model = rating::ActiveModel {
        id: NotSet,
        user_id: Set(uid),
        flavor_id: Set(flavor_id),
        score: Set(score),
        comment: Set(comment.clone()),
        created_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    if let Some(text) = comment.as_deref().filter(|s| !s.is_empty()) {
        parse_mentions(&state.db, text, uid, Some(model.id), None).await?;
    }

    let mut dtos = build_ratings(&state, &ctx, vec![model]).await?;
    let out = dtos.pop().ok_or(ApiError::Internal)?;
    Ok((StatusCode::CREATED, Json(out)))
}

/// PUT/PATCH /api/ratings/{id}/ — owner or superuser only. No mention parsing
/// (Django's perform_update is the default; mentions only fire on create).
async fn update(
    State(state): State<AppState>,
    ctx: RequestCtx,
    method: Method,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<RatingOut>> {
    let existing = Rating::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let actor = load_actor(&state, uid).await?;
    if existing.user_id != uid && !actor.is_superuser {
        return Err(ApiError::Forbidden(
            "You cannot edit/delete this rating.".into(),
        ));
    }

    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let partial = method == Method::PATCH;
    let mut errors = serde_json::Map::new();
    let mut active: rating::ActiveModel = existing.clone().into();

    // flavor
    match data.get("flavor") {
        Some(Value::Null) | None if !partial => {
            errors.insert("flavor".into(), json!(["This field is required."]));
        }
        Some(v) if !v.is_null() => match as_i32(v) {
            Some(fid) => {
                if Flavor::find_by_id(fid).one(&state.db).await?.is_some() {
                    active.flavor_id = Set(fid);
                } else {
                    errors.insert(
                        "flavor".into(),
                        json!([format!("Invalid pk \"{fid}\" - object does not exist.")]),
                    );
                }
            }
            None => {
                errors.insert(
                    "flavor".into(),
                    json!(["Incorrect type. Expected pk value, received str."]),
                );
            }
        },
        _ => {}
    }

    // score
    match data.get("score") {
        Some(Value::Null) | None if !partial => {
            errors.insert("score".into(), json!(["This field is required."]));
        }
        Some(v) if !v.is_null() => match as_i32(v) {
            Some(s) if s < 1 => {
                errors.insert(
                    "score".into(),
                    json!(["Ensure this value is greater than or equal to 1."]),
                );
            }
            Some(s) if s > 10 => {
                errors.insert(
                    "score".into(),
                    json!(["Ensure this value is less than or equal to 10."]),
                );
            }
            Some(s) => active.score = Set(s),
            None => {
                errors.insert("score".into(), json!(["A valid integer is required."]));
            }
        },
        _ => {}
    }

    // comment
    match data.get("comment") {
        Some(Value::String(s)) => active.comment = Set(Some(s.clone())),
        Some(Value::Null) => active.comment = Set(None),
        Some(_) => {
            errors.insert("comment".into(), json!(["Not a valid string."]));
        }
        None => {}
    }

    if !errors.is_empty() {
        return Err(ApiError::Validation(Value::Object(errors)));
    }

    let model = active.update(&state.db).await?;
    let mut dtos = build_ratings(&state, &ctx, vec![model]).await?;
    dtos.pop().map(Json).ok_or(ApiError::Internal)
}

/// DELETE /api/ratings/{id}/ — owner or superuser only.
async fn destroy(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<StatusCode> {
    let existing = Rating::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let actor = load_actor(&state, uid).await?;
    if existing.user_id != uid && !actor.is_superuser {
        return Err(ApiError::Forbidden(
            "You cannot edit/delete this rating.".into(),
        ));
    }

    // Django on_delete=CASCADE is emulated in Python, not enforced by SQLite FKs,
    // so replicate the collector: drop notifications pointing at this rating or
    // any of its replies, then the replies, then the rating itself.
    let txn = state.db.begin().await?;
    let reply_ids: Vec<i32> = Reply::find()
        .filter(reply::Column::RatingId.eq(id))
        .all(&txn)
        .await?
        .into_iter()
        .map(|r| r.id)
        .collect();
    Notification::delete_many()
        .filter(
            Condition::any()
                .add(notification::Column::RatingId.eq(id))
                .add(notification::Column::ReplyId.is_in(reply_ids)),
        )
        .exec(&txn)
        .await?;
    Reply::delete_many()
        .filter(reply::Column::RatingId.eq(id))
        .exec(&txn)
        .await?;
    Rating::delete_by_id(id).exec(&txn).await?;
    txn.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

/// GET /api/ratings/feed/ — ratings by followed users, FeedPagination (size 10).
async fn feed(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<RatingOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = FEED_PAGE_SIZE;

    // Followed user ids from api_user_following(from_user_id, to_user_id).
    let stmt = Statement::from_sql_and_values(
        state.db.get_database_backend(),
        "SELECT to_user_id FROM api_user_following WHERE from_user_id = ?",
        [uid.into()],
    );
    let rows = state.db.query_all(stmt).await?;
    let followed: Vec<i32> = rows
        .iter()
        .filter_map(|r| r.try_get::<i32>("", "to_user_id").ok())
        .collect();
    if followed.is_empty() {
        return Ok(Json(Paginated::build(&ctx, Vec::new(), 0, page, size)));
    }

    let count = Rating::find()
        .filter(rating::Column::UserId.is_in(followed.clone()))
        .count(&state.db)
        .await?;
    let models = Rating::find()
        .filter(rating::Column::UserId.is_in(followed))
        .order_by_desc(rating::Column::CreatedAt)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = build_ratings(&state, &ctx, models).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/ratings/recent/ — 10 newest with a non-empty comment (AllowAny).
async fn recent(
    State(state): State<AppState>,
    ctx: RequestCtx,
) -> ApiResult<Json<Vec<RatingOut>>> {
    let models = Rating::find()
        .filter(rating::Column::Comment.is_not_null())
        .filter(rating::Column::Comment.ne(""))
        .order_by_desc(rating::Column::CreatedAt)
        .limit(10)
        .all(&state.db)
        .await?;
    Ok(Json(build_ratings(&state, &ctx, models).await?))
}

/// POST /api/ratings/{id}/reply/ — add a reply, notify the rating owner, and
/// fan out @mentions.
async fn reply(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<ReplyOut>)> {
    let rating = Rating::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let text = data.get("text").and_then(|v| v.as_str()).unwrap_or("");
    if text.is_empty() {
        return Err(ApiError::Validation(json!({ "error": "Text is required" })));
    }

    let now = crate::datetime::now_micros();
    let reply_model = reply::ActiveModel {
        id: NotSet,
        user_id: Set(uid),
        rating_id: Set(rating.id),
        text: Set(text.to_string()),
        created_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    if rating.user_id != uid {
        notification::ActiveModel {
            id: NotSet,
            is_read: Set(false),
            created_at: Set(now),
            actor_id: Set(uid),
            rating_id: Set(Some(rating.id)),
            recipient_id: Set(rating.user_id),
            reply_id: Set(Some(reply_model.id)),
            ticket_id: Set(None),
            notification_type: Set("reply".to_string()),
            profile_comment_id: Set(None),
        }
        .insert(&state.db)
        .await?;
    }

    parse_mentions(&state.db, text, uid, Some(rating.id), Some(reply_model.id)).await?;

    let mut dtos = build_replies(&state, vec![reply_model]).await?;
    let out = dtos.pop().ok_or(ApiError::Internal)?;
    Ok((StatusCode::CREATED, Json(out)))
}
