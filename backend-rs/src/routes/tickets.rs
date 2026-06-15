//! Port of `TicketViewSet` (`api/views/support.py`). All actions require
//! authentication; non-superusers only see/act on their own tickets. Deletion
//! is superuser-only. `update_status` requires staff (DRF `IsAdminUser`).

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{Method, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, TransactionTrait,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::auth::AuthUser;
use crate::dto::{TicketMessageOut, TicketOut};
use crate::entities::prelude::*;
use crate::entities::{notification, ticket, ticket_message, user};
use crate::error::{ApiError, ApiResult};
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::service::{build_tickets, ticket_message_out};
use crate::state::AppState;
use crate::web::RequestCtx;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/tickets/", get(list).post(create))
        .route(
            "/tickets/{id}/",
            get(retrieve).put(update).patch(update).delete(destroy),
        )
        .route("/tickets/{id}/add_message/", post(add_message))
        .route("/tickets/{id}/update_status/", post(update_status))
}

#[derive(Deserialize)]
struct PageParam {
    page: Option<String>,
}

async fn load_user(state: &AppState, uid: i32) -> ApiResult<user::Model> {
    User::find_by_id(uid)
        .one(&state.db)
        .await?
        .ok_or(ApiError::Unauthorized)
}

const STATUSES: &[&str] = &["open", "in_progress", "resolved", "closed"];

/// Tickets visible to `me`: all for superusers, own otherwise (-updated_at).
fn scoped_query(me: &user::Model) -> sea_orm::Select<Ticket> {
    let q = Ticket::find().order_by_desc(ticket::Column::UpdatedAt);
    if me.is_superuser {
        q
    } else {
        q.filter(ticket::Column::UserId.eq(me.id))
    }
}

/// GET /api/tickets/
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<TicketOut>>> {
    let me = load_user(&state, uid).await?;
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;
    let count = scoped_query(&me).count(&state.db).await?;
    let models = scoped_query(&me)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = build_tickets(&state, &ctx, models).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/tickets/{id}/
async fn retrieve(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<TicketOut>> {
    let me = load_user(&state, uid).await?;
    let t = scoped_query(&me)
        .filter(ticket::Column::Id.eq(id))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut dtos = build_tickets(&state, &ctx, vec![t]).await?;
    dtos.pop().map(Json).ok_or(ApiError::NotFound)
}

fn require_str(
    data: &Value,
    field: &str,
    partial: bool,
    max: Option<usize>,
) -> ApiResult<Option<String>> {
    match data.get(field) {
        Some(Value::String(s)) if !s.is_empty() => {
            if let Some(m) = max {
                if s.chars().count() > m {
                    return Err(ApiError::Validation(json!({
                        field: [format!("Ensure this field has no more than {m} characters.")]
                    })));
                }
            }
            Ok(Some(s.clone()))
        }
        Some(Value::String(_)) => Err(ApiError::Validation(
            json!({ field: ["This field may not be blank."] }),
        )),
        Some(v) if !v.is_null() => Err(ApiError::Validation(
            json!({ field: ["Not a valid string."] }),
        )),
        _ if partial => Ok(None),
        _ => Err(ApiError::Validation(
            json!({ field: ["This field is required."] }),
        )),
    }
}

/// POST /api/tickets/ — create + notify other admins (ticket_new).
async fn create(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<TicketOut>)> {
    let me = load_user(&state, uid).await?;
    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let subject = require_str(&data, "subject", false, Some(200))?.unwrap();
    let description = require_str(&data, "description", false, None)?.unwrap();

    let now = crate::datetime::now_micros();
    let t = ticket::ActiveModel {
        subject: Set(subject),
        description: Set(description),
        status: Set("open".into()),
        created_at: Set(now),
        updated_at: Set(now),
        user_id: Set(me.id),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    // Notify every other admin.
    let admins = User::find()
        .filter(user::Column::IsSuperuser.eq(true))
        .filter(user::Column::Id.ne(me.id))
        .all(&state.db)
        .await?;
    for admin in admins {
        notification::ActiveModel {
            is_read: Set(false),
            created_at: Set(crate::datetime::now_micros()),
            actor_id: Set(me.id),
            recipient_id: Set(admin.id),
            ticket_id: Set(Some(t.id)),
            notification_type: Set("ticket_new".into()),
            ..Default::default()
        }
        .insert(&state.db)
        .await?;
    }

    let mut dtos = build_tickets(&state, &ctx, vec![t]).await?;
    Ok((
        StatusCode::CREATED,
        Json(dtos.pop().ok_or(ApiError::Internal)?),
    ))
}

/// PUT/PATCH /api/tickets/{id}/ — subject/description only (status, user read-only).
async fn update(
    State(state): State<AppState>,
    ctx: RequestCtx,
    method: Method,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<TicketOut>> {
    let me = load_user(&state, uid).await?;
    let existing = scoped_query(&me)
        .filter(ticket::Column::Id.eq(id))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let partial = method == Method::PATCH;

    let mut active: ticket::ActiveModel = existing.into();
    if let Some(s) = require_str(&data, "subject", partial, Some(200))? {
        active.subject = Set(s);
    }
    if let Some(s) = require_str(&data, "description", partial, None)? {
        active.description = Set(s);
    }
    active.updated_at = Set(crate::datetime::now_micros());
    let t = active.update(&state.db).await?;

    let mut dtos = build_tickets(&state, &ctx, vec![t]).await?;
    dtos.pop().map(Json).ok_or(ApiError::Internal)
}

/// DELETE /api/tickets/{id}/ — superuser only; cascades messages + notifications.
async fn destroy(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<StatusCode> {
    let me = load_user(&state, uid).await?;
    if !me.is_superuser {
        return Err(ApiError::Forbidden(
            "Only admins can delete tickets.".into(),
        ));
    }
    // get_object is scoped; superusers see all, so a missing ticket is 404.
    Ticket::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let txn = state.db.begin().await?;
    Notification::delete_many()
        .filter(notification::Column::TicketId.eq(id))
        .exec(&txn)
        .await?;
    TicketMessage::delete_many()
        .filter(ticket_message::Column::TicketId.eq(id))
        .exec(&txn)
        .await?;
    Ticket::delete_by_id(id).exec(&txn).await?;
    txn.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/tickets/{id}/add_message/
async fn add_message(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<TicketMessageOut>)> {
    let me = load_user(&state, uid).await?;
    let t = scoped_query(&me)
        .filter(ticket::Column::Id.eq(id))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let text = match data.get("text") {
        Some(Value::String(s)) if !s.is_empty() => s.clone(),
        _ => return Err(ApiError::Validation(json!({ "error": "Text is required" }))),
    };

    let msg = ticket_message::ActiveModel {
        text: Set(text),
        created_at: Set(crate::datetime::now_micros()),
        ticket_id: Set(t.id),
        user_id: Set(me.id),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    // Notify the counterparty: admin → ticket owner; user → all other admins.
    if me.is_superuser {
        if t.user_id != me.id {
            notify_ticket(&state, me.id, t.user_id, t.id, "ticket_reply").await?;
        }
    } else {
        let admins = User::find()
            .filter(user::Column::IsSuperuser.eq(true))
            .filter(user::Column::Id.ne(me.id))
            .all(&state.db)
            .await?;
        for admin in admins {
            notify_ticket(&state, me.id, admin.id, t.id, "ticket_reply").await?;
        }
    }

    Ok((StatusCode::CREATED, Json(ticket_message_out(msg, &me))))
}

async fn notify_ticket(
    state: &AppState,
    actor: i32,
    recipient: i32,
    ticket_id: i32,
    kind: &str,
) -> ApiResult<()> {
    notification::ActiveModel {
        is_read: Set(false),
        created_at: Set(crate::datetime::now_micros()),
        actor_id: Set(actor),
        recipient_id: Set(recipient),
        ticket_id: Set(Some(ticket_id)),
        notification_type: Set(kind.into()),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;
    Ok(())
}

/// POST /api/tickets/{id}/update_status/ — staff only.
async fn update_status(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let me = load_user(&state, uid).await?;
    if !me.is_staff {
        return Err(ApiError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }
    // update_status uses get_object on the (admin) scoped queryset → all tickets.
    let t = Ticket::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let data: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    let new_status = data.get("status").and_then(|v| v.as_str());
    match new_status {
        Some(s) if STATUSES.contains(&s) => {
            let mut active: ticket::ActiveModel = t.into();
            active.status = Set(s.to_string());
            active.updated_at = Set(crate::datetime::now_micros());
            active.update(&state.db).await?;
            Ok(Json(json!({ "status": "updated" })))
        }
        _ => Err(ApiError::Validation(json!({ "error": "Invalid status" }))),
    }
}
