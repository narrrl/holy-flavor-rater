//! Port of `AdminViewSet` (`api/views/admin.py`), registered by DRF under
//! `admin-custom`. Every action requires staff (`IsAdminUser` = `is_staff`),
//! enforced by the [`AdminUser`] extractor. Covers dashboard stats, the system
//! config singleton, the jobs panel (list / trigger / schedule), flavor merge,
//! a test-email sender, and the admin user list/detail.
//!
//! Scheduling parity note: Django wrote `django_celery_beat.PeriodicTask` rows;
//! here the in-process scheduler reads `interval_hours` straight off the job row,
//! so `update_job_schedule` only persists that field. `next_run` is derived as
//! `last_run + interval_hours`.

use std::collections::HashMap;

use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
};
use serde_json::{json, Value};

use crate::auth::AdminUser;
use crate::datetime::drf_iso;
use crate::entities::prelude::{Flavor, Job, Rating, Reply, SystemConfig, Ticket, User, UserIp};
use crate::entities::{job, rating, system_config, ticket, user, user_ip};
use crate::error::{ApiError, ApiResult};
use crate::service::build_ratings;
use crate::state::AppState;
use crate::web::RequestCtx;
use crate::{email, jobs, merge};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/admin-custom/stats/", get(stats))
        .route("/admin-custom/config/", get(config_get).patch(config_patch))
        .route("/admin-custom/jobs/", get(jobs_list))
        .route("/admin-custom/merge_flavors/", post(merge_flavors))
        .route("/admin-custom/send_test_email/", post(send_test_email))
        .route("/admin-custom/users/", get(users_list))
        .route("/admin-custom/{pk}/trigger_job/", post(trigger_job))
        .route(
            "/admin-custom/{pk}/update_job_schedule/",
            patch(update_job_schedule),
        )
        .route(
            "/admin-custom/{pk}/user_detail/",
            get(user_detail_get)
                .patch(user_detail_patch)
                .delete(user_detail_delete),
        )
}

fn parse_body(body: &Bytes) -> Value {
    serde_json::from_slice(body).unwrap_or(Value::Null)
}

// ---------------------------------------------------------------- stats

async fn stats(State(state): State<AppState>, _admin: AdminUser) -> ApiResult<Json<Value>> {
    let db = &state.db;
    let total_users = User::find().count(db).await?;
    let total_ratings = Rating::find().count(db).await?;
    let total_replies = Reply::find().count(db).await?;
    let open_tickets = Ticket::find()
        .filter(ticket::Column::Status.eq("open"))
        .count(db)
        .await?;

    let email = &state.config.email;
    let allowed_hosts: Vec<String> = std::env::var("ALLOWED_HOSTS")
        .ok()
        .map(|s| {
            s.split(',')
                .map(|x| x.trim().to_string())
                .filter(|x| !x.is_empty())
                .collect()
        })
        .unwrap_or_default();

    Ok(Json(json!({
        "total_users": total_users,
        "total_ratings": total_ratings,
        "total_replies": total_replies,
        "open_tickets": open_tickets,
        "email_config": {
            "host": email.host.clone().unwrap_or_else(|| "None".to_string()),
            "port": email.port,
            "use_tls": email.use_tls,
            "use_ssl": email.use_ssl,
            "skip_verify": email.skip_cert_verification,
        },
        "server_info": {
            "debug": cfg!(debug_assertions),
            "allowed_hosts": allowed_hosts,
            "frontend_url": state.config.frontend_url,
            "media_root": state.config.media_root,
            "static_root": std::env::var("STATIC_ROOT").unwrap_or_default(),
        },
    })))
}

// ---------------------------------------------------------------- config

fn config_json(c: &system_config::Model) -> Value {
    json!({
        "site_name": c.site_name,
        "maintenance_mode": c.maintenance_mode,
        "allow_new_signups": c.allow_new_signups,
        "require_email_verification": c.require_email_verification,
        "updated_at": drf_iso(&c.updated_at),
    })
}

/// `SystemConfig.get_solo()` — the pk=1 singleton, created on first read.
async fn get_solo(state: &AppState) -> ApiResult<system_config::Model> {
    if let Some(c) = SystemConfig::find_by_id(1).one(&state.db).await? {
        return Ok(c);
    }
    Ok(system_config::ActiveModel {
        id: Set(1),
        site_name: Set("Holy Flavors Archive".into()),
        maintenance_mode: Set(false),
        allow_new_signups: Set(true),
        require_email_verification: Set(true),
        updated_at: Set(crate::datetime::now_micros()),
    }
    .insert(&state.db)
    .await?)
}

async fn config_get(State(state): State<AppState>, _admin: AdminUser) -> ApiResult<Json<Value>> {
    let c = get_solo(&state).await?;
    Ok(Json(config_json(&c)))
}

fn opt_bool(data: &Value, field: &str) -> ApiResult<Option<bool>> {
    match data.get(field) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Bool(b)) => Ok(Some(*b)),
        _ => Err(ApiError::Validation(
            json!({ field: ["Must be a valid boolean."] }),
        )),
    }
}

async fn config_patch(
    State(state): State<AppState>,
    _admin: AdminUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let data = parse_body(&body);
    let c = get_solo(&state).await?;
    let mut am: system_config::ActiveModel = c.into();

    match data.get("site_name") {
        None | Some(Value::Null) => {}
        Some(Value::String(s)) if s.chars().count() <= 100 => am.site_name = Set(s.clone()),
        Some(Value::String(_)) => {
            return Err(ApiError::Validation(json!({
                "site_name": ["Ensure this field has no more than 100 characters."]
            })))
        }
        Some(_) => {
            return Err(ApiError::Validation(
                json!({ "site_name": ["Not a valid string."] }),
            ))
        }
    }
    if let Some(b) = opt_bool(&data, "maintenance_mode")? {
        am.maintenance_mode = Set(b);
    }
    if let Some(b) = opt_bool(&data, "allow_new_signups")? {
        am.allow_new_signups = Set(b);
    }
    if let Some(b) = opt_bool(&data, "require_email_verification")? {
        am.require_email_verification = Set(b);
    }
    am.updated_at = Set(crate::datetime::now_micros());
    let c = am.update(&state.db).await?;
    Ok(Json(config_json(&c)))
}

// ---------------------------------------------------------------- jobs

fn job_json(j: &job::Model) -> Value {
    let name_display = jobs::lookup(&j.name)
        .map(|b| b.display_name().to_string())
        .unwrap_or_else(|| j.name.clone());
    let next_run = if j.interval_hours > 0 {
        j.last_run
            .map(|lr| drf_iso(&(lr + chrono::Duration::hours(j.interval_hours as i64))))
    } else {
        None
    };
    json!({
        "id": j.id,
        "name": j.name,
        "name_display": name_display,
        "status": j.status,
        "last_run": j.last_run.map(|d| drf_iso(&d)),
        "next_run": next_run,
        "interval_hours": j.interval_hours,
        "last_output": j.last_output,
        "error_message": j.error_message,
    })
}

/// GET jobs — ensures a row exists for every known job, then lists by name.
async fn jobs_list(State(state): State<AppState>, _admin: AdminUser) -> ApiResult<Json<Value>> {
    for b in jobs::registry() {
        jobs::get_or_create_row(&state.db, b.name()).await?;
    }
    let rows = Job::find()
        .order_by_asc(job::Column::Name)
        .all(&state.db)
        .await?;
    let out: Vec<Value> = rows.iter().map(job_json).collect();
    Ok(Json(json!(out)))
}

/// POST {pk}/trigger_job — dispatch the job asynchronously (fire-and-forget).
async fn trigger_job(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(pk): Path<i32>,
) -> ApiResult<Json<Value>> {
    let row = Job::find_by_id(pk)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let Some(job_impl) = jobs::lookup(&row.name) else {
        return Err(ApiError::JsonStatus(
            StatusCode::BAD_REQUEST,
            json!({ "error": format!("No job registered for {}", row.name) }),
        ));
    };

    let task_name = format!("api.{}", row.name);
    let mut am: job::ActiveModel = row.into();
    am.status = Set("pending".into());
    am.error_message = Set(String::new());
    am.update(&state.db).await?;

    let st = state.clone();
    tokio::spawn(async move { jobs::run_job(&st, job_impl).await });

    Ok(Json(json!({ "status": "Job queued", "task": task_name })))
}

/// PATCH {pk}/update_job_schedule — set `interval_hours`. The scheduler reads it.
async fn update_job_schedule(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(pk): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let row = Job::find_by_id(pk)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let data = parse_body(&body);

    let interval = match data.get("interval_hours") {
        Some(Value::Number(n)) => n.as_i64(),
        Some(Value::String(s)) => s.parse::<i64>().ok(),
        _ => None,
    };
    let row = if let Some(i) = interval {
        let mut am: job::ActiveModel = row.into();
        am.interval_hours = Set(i as i32);
        am.update(&state.db).await?
    } else {
        row
    };
    Ok(Json(job_json(&row)))
}

// ---------------------------------------------------------------- merge_flavors

fn parse_id(data: &Value, field: &str) -> Option<i32> {
    match data.get(field) {
        Some(Value::Number(n)) => n.as_i64().map(|v| v as i32),
        Some(Value::String(s)) => s.parse::<i32>().ok(),
        _ => None,
    }
    .filter(|v| *v != 0)
}

async fn merge_flavors(
    State(state): State<AppState>,
    _admin: AdminUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let data = parse_body(&body);
    let (keep_id, remove_id) = match (parse_id(&data, "keep_id"), parse_id(&data, "remove_id")) {
        (Some(k), Some(r)) => (k, r),
        _ => {
            return Err(ApiError::JsonStatus(
                StatusCode::BAD_REQUEST,
                json!({ "error": "Both keep_id and remove_id are required" }),
            ))
        }
    };

    let keep = Flavor::find_by_id(keep_id).one(&state.db).await?;
    let remove = Flavor::find_by_id(remove_id).one(&state.db).await?;
    let (keep, remove) = match (keep, remove) {
        (Some(k), Some(r)) => (k, r),
        _ => {
            return Err(ApiError::JsonStatus(
                StatusCode::NOT_FOUND,
                json!({ "error": "One or both flavors not found" }),
            ))
        }
    };
    if keep.category_id != remove.category_id {
        return Err(ApiError::JsonStatus(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Flavors must belong to the same category" }),
        ));
    }

    merge::merge_flavors(&state.db, &keep, &remove).await?;
    Ok(Json(json!({ "status": "Flavors merged successfully" })))
}

// ---------------------------------------------------------------- send_test_email

async fn send_test_email(
    State(state): State<AppState>,
    AdminUser(me): AdminUser,
) -> ApiResult<Json<Value>> {
    let body = format!(
        "This is a test email sent to {} from the Holy Flavors Admin Interface.",
        me.email
    );
    match email::send_mail(
        &state.config.email,
        "Holy Flavors Admin Test Email",
        &body,
        std::slice::from_ref(&me.email),
    )
    .await
    {
        Ok(()) => Ok(Json(json!({ "status": "Test email sent!" }))),
        Err(e) => Err(ApiError::JsonStatus(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({ "error": e }),
        )),
    }
}

// ---------------------------------------------------------------- users

/// IP addresses for a set of users, ordered newest-login first (UserIP ordering).
async fn ips_by_user(state: &AppState, ids: &[i32]) -> ApiResult<HashMap<i32, Vec<String>>> {
    let mut map: HashMap<i32, Vec<String>> = HashMap::new();
    if ids.is_empty() {
        return Ok(map);
    }
    let rows = UserIp::find()
        .filter(user_ip::Column::UserId.is_in(ids.to_vec()))
        .order_by_desc(user_ip::Column::LastLogin)
        .all(&state.db)
        .await?;
    for r in rows {
        map.entry(r.user_id).or_default().push(r.ip_address);
    }
    Ok(map)
}

fn admin_user_json(u: &user::Model, ips: &[String]) -> Value {
    json!({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "date_joined": drf_iso(&u.date_joined),
        "last_login": u.last_login.map(|d| drf_iso(&d)),
        "ips": ips,
    })
}

/// GET users — admin list (AdminUserListSerializer), first 3 IPs each, -date_joined.
async fn users_list(State(state): State<AppState>, _admin: AdminUser) -> ApiResult<Json<Value>> {
    let users = User::find()
        .order_by_desc(user::Column::DateJoined)
        .all(&state.db)
        .await?;
    let ids: Vec<i32> = users.iter().map(|u| u.id).collect();
    let ip_map = ips_by_user(&state, &ids).await?;
    let out: Vec<Value> = users
        .iter()
        .map(|u| {
            let ips: Vec<String> = ip_map
                .get(&u.id)
                .map(|v| v.iter().take(3).cloned().collect())
                .unwrap_or_default();
            admin_user_json(u, &ips)
        })
        .collect();
    Ok(Json(json!(out)))
}

/// AdminUserDetailSerializer: full IPs + the user's ratings.
async fn build_user_detail(
    state: &AppState,
    ctx: &RequestCtx,
    u: &user::Model,
) -> ApiResult<Value> {
    let ips = ips_by_user(state, &[u.id])
        .await?
        .remove(&u.id)
        .unwrap_or_default();
    let ratings = Rating::find()
        .filter(rating::Column::UserId.eq(u.id))
        .order_by_desc(rating::Column::CreatedAt)
        .all(&state.db)
        .await?;
    let ratings = build_ratings(state, ctx, ratings).await?;
    let mut v = admin_user_json(u, &ips);
    v["ratings"] = serde_json::to_value(ratings).unwrap_or(Value::Null);
    Ok(v)
}

async fn user_detail_get(
    State(state): State<AppState>,
    ctx: RequestCtx,
    _admin: AdminUser,
    Path(pk): Path<i32>,
) -> ApiResult<Json<Value>> {
    let u = User::find_by_id(pk)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(Json(build_user_detail(&state, &ctx, &u).await?))
}

async fn user_detail_patch(
    State(state): State<AppState>,
    ctx: RequestCtx,
    _admin: AdminUser,
    Path(pk): Path<i32>,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let u = User::find_by_id(pk)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let data = parse_body(&body);
    let u = match data.get("is_active") {
        Some(Value::Bool(b)) => {
            let mut am: user::ActiveModel = u.into();
            am.is_active = Set(*b);
            am.update(&state.db).await?
        }
        _ => u,
    };
    Ok(Json(build_user_detail(&state, &ctx, &u).await?))
}

async fn user_detail_delete(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(pk): Path<i32>,
) -> ApiResult<StatusCode> {
    User::find_by_id(pk)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    crate::routes::users::delete_user_cascade(&state, pk).await?;
    Ok(StatusCode::NO_CONTENT)
}
