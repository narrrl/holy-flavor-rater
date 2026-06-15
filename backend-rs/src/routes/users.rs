//! Port of `UserViewSet` (`api/views/user.py`): account lifecycle (signup,
//! verification, password reset, deletion), profile + preferences, avatar
//! upload, the social graph (follow/unfollow, profile comments), and the
//! dashboard / public profile aggregates.
//!
//! Generic `POST/PUT/PATCH/DELETE /users/` + `/users/{id}/` are intentionally
//! NOT exposed: Django's `ModelViewSet` allows any authenticated user to edit
//! any user via `UserSerializer` (no object-level permission), and create makes
//! a password-less user. The frontend never uses these — it goes through the
//! dedicated actions below — so omitting them removes a footgun. They 405.

use std::net::SocketAddr;

use axum::body::Bytes;
use axum::extract::{ConnectInfo, Multipart, Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbBackend, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Statement, TransactionTrait,
};
use serde::Deserialize;
use serde_json::{json, Value};
use subtle::ConstantTimeEq;

use crate::auth::{AuthUser, OptionalUser};
use crate::dto::{DashboardOut, ProfileCommentOut, PublicProfileOut, UserOut};
use crate::entities::prelude::*;
use crate::entities::{flavor, notification, profile_comment, rating, user, user_ip};
use crate::error::{ApiError, ApiResult};
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::service::{
    build_flavors, build_profile_comments, build_ratings, build_user, build_users,
};
use crate::state::AppState;
use crate::throttle;
use crate::web::RequestCtx;

const THEMES: &[&str] = &[
    "holy_light",
    "holy_dark",
    "latte",
    "frappe",
    "macchiato",
    "mocha",
    "pink_pastel",
    "mint_pastel",
    "lavender_pastel",
    "dracula",
    "nord",
    "gruvbox",
    "oceanic",
    "t0p_sai",
    "t0p_trench",
    "t0p_blurryface",
    "t0p_clancy",
];
const LANGUAGES: &[&str] = &["en", "de"];
const DRAWER_ANCHORS: &[&str] = &["left", "right"];

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users/", get(list))
        .route("/users/following_list/", get(following_list))
        .route("/users/signup/", post(signup))
        .route("/users/resend_verification/", post(resend_verification))
        .route("/users/verify_signup/", post(verify_signup))
        .route("/users/profile/{username}/", get(public_profile))
        .route("/users/me/", get(me))
        .route("/users/update_preferences/", patch(update_preferences))
        .route("/users/update_avatar/", post(update_avatar))
        .route("/users/change_password/", post(change_password))
        .route("/users/update_profile/", patch(update_profile))
        .route("/users/confirm_email/", post(confirm_email))
        .route(
            "/users/request_password_reset/",
            post(request_password_reset),
        )
        .route(
            "/users/complete_password_reset/",
            post(complete_password_reset),
        )
        .route(
            "/users/request_account_deletion/",
            post(request_account_deletion),
        )
        .route(
            "/users/confirm_account_deletion/",
            post(confirm_account_deletion),
        )
        .route("/users/dashboard/", get(dashboard))
        .route("/users/{id}/", get(retrieve))
        .route("/users/{id}/follow/", post(follow))
        .route("/users/{id}/unfollow/", post(unfollow))
        .route("/users/{id}/add_comment/", post(add_comment))
        .route(
            "/users/{id}/delete_comment/{comment_id}/",
            axum::routing::delete(delete_comment),
        )
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

/// Non-empty string field, mirroring Django's `if not value` truthiness.
fn field_str(data: &Value, key: &str) -> Option<String> {
    match data.get(key) {
        Some(Value::String(s)) if !s.is_empty() => Some(s.clone()),
        _ => None,
    }
}

fn parse_body(body: &Bytes) -> Value {
    serde_json::from_slice(body).unwrap_or(Value::Null)
}

fn err_json(status: StatusCode, body: Value) -> ApiError {
    // Validation always renders the body verbatim with 400; for non-400 statuses
    // we need a distinct path.
    if status == StatusCode::BAD_REQUEST {
        ApiError::Validation(body)
    } else {
        ApiError::JsonStatus(status, body)
    }
}

/// Constant-time comparison of a stored confirmation code against a supplied
/// one. Returns true only when both are present and equal. Codes are a fixed 6
/// digits, so a length mismatch isn't secret — only the content comparison needs
/// to be constant-time to avoid leaking a correct prefix.
fn code_matches(stored: Option<&str>, provided: Option<&str>) -> bool {
    match (stored, provided) {
        (Some(s), Some(p)) if s.len() == p.len() => s.as_bytes().ct_eq(p.as_bytes()).into(),
        _ => false,
    }
}

/// Enforce the ported Django password validators (`password_policy`), returning
/// a 400 whose body carries the aggregated messages under `error` (the key the
/// frontend reads for account flows) on failure.
fn check_password_policy(
    password: &str,
    attrs: &crate::password_policy::UserAttrs,
) -> Result<(), ApiError> {
    let errors = crate::password_policy::validate(password, attrs);
    if errors.is_empty() {
        Ok(())
    } else {
        Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": errors.join(" ") }),
        ))
    }
}

fn gen_code() -> String {
    // 6-digit numeric code (parity with `_generate_code`).
    let n = uuid::Uuid::new_v4().as_u128();
    format!("{:06}", (n % 1_000_000) as u32)
}

// Confirmation-code TTL keys (see `throttle::Security`). One namespace per flow
// so a code minted for one purpose can't satisfy another.
fn signup_code_key(username: &str) -> String {
    format!("code:signup:{}", username.to_lowercase())
}
fn pwreset_code_key(email: &str) -> String {
    format!("code:pwreset:{}", email.to_lowercase())
}
fn email_code_key(uid: i32) -> String {
    format!("code:email:{uid}")
}
fn del_code_key(uid: i32) -> String {
    format!("code:del:{uid}")
}

// ---- social-graph raw SQL helpers ---------------------------------------

async fn is_following(state: &AppState, from: i32, to: i32) -> ApiResult<bool> {
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "SELECT 1 FROM api_user_following WHERE from_user_id = ? AND to_user_id = ? LIMIT 1",
            [from.into(), to.into()],
        ))
        .await?;
    Ok(row.is_some())
}

async fn add_follow(state: &AppState, from: i32, to: i32) -> ApiResult<()> {
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "INSERT INTO api_user_following (from_user_id, to_user_id) VALUES (?, ?)",
            [from.into(), to.into()],
        ))
        .await?;
    Ok(())
}

async fn remove_follow(state: &AppState, from: i32, to: i32) -> ApiResult<()> {
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "DELETE FROM api_user_following WHERE from_user_id = ? AND to_user_id = ?",
            [from.into(), to.into()],
        ))
        .await?;
    Ok(())
}

/// User ids `from` follows (the `following` set).
async fn following_ids(state: &AppState, from: i32) -> ApiResult<Vec<i32>> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "SELECT to_user_id AS uid FROM api_user_following WHERE from_user_id = ?",
            [from.into()],
        ))
        .await?;
    rows.into_iter()
        .map(|r| r.try_get("", "uid").map_err(Into::into))
        .collect()
}

/// User ids that follow `to` (the `followers` set).
async fn follower_ids(state: &AppState, to: i32) -> ApiResult<Vec<i32>> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "SELECT from_user_id AS uid FROM api_user_following WHERE to_user_id = ?",
            [to.into()],
        ))
        .await?;
    rows.into_iter()
        .map(|r| r.try_get("", "uid").map_err(Into::into))
        .collect()
}

async fn users_by_ids(state: &AppState, ids: &[i32]) -> ApiResult<Vec<user::Model>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    Ok(User::find()
        .filter(user::Column::Id.is_in(ids.to_vec()))
        .order_by_asc(user::Column::Id)
        .all(&state.db)
        .await?)
}

// ---- list / retrieve -----------------------------------------------------

/// GET /api/users/
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<UserOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;
    let count = User::find().count(&state.db).await?;
    let models = User::find()
        .order_by_asc(user::Column::Id)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = build_users(&state, &ctx, models, Some(uid)).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/users/{id}/
async fn retrieve(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<UserOut>> {
    let u = User::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(Json(build_user(&state, &ctx, u, Some(uid)).await?))
}

/// GET /api/users/following_list/
async fn following_list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<Vec<UserOut>>> {
    let ids = following_ids(&state, uid).await?;
    let users = users_by_ids(&state, &ids).await?;
    Ok(Json(build_users(&state, &ctx, users, Some(uid)).await?))
}

// ---- me / preferences / profile -----------------------------------------

/// GET /api/users/me/ — also logs the caller's IP.
async fn me(
    State(state): State<AppState>,
    ctx: RequestCtx,
    headers: HeaderMap,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<UserOut>> {
    let u = load_user(&state, uid).await?;
    log_user_ip(&state, uid, &headers, peer).await?;
    Ok(Json(build_user(&state, &ctx, u, Some(uid)).await?))
}

async fn log_user_ip(
    state: &AppState,
    uid: i32,
    headers: &HeaderMap,
    peer: SocketAddr,
) -> ApiResult<()> {
    let ip = crate::web::client_ip(headers, peer);

    let existing = UserIp::find()
        .filter(user_ip::Column::UserId.eq(uid))
        .filter(user_ip::Column::IpAddress.eq(ip.clone()))
        .one(&state.db)
        .await?;
    let now = crate::datetime::now_micros();
    match existing {
        Some(row) => {
            let mut active: user_ip::ActiveModel = row.into();
            active.last_login = Set(now);
            active.update(&state.db).await?;
        }
        None => {
            user_ip::ActiveModel {
                ip_address: Set(ip),
                last_login: Set(now),
                user_id: Set(uid),
                ..Default::default()
            }
            .insert(&state.db)
            .await?;
        }
    }
    Ok(())
}

/// PATCH /api/users/update_preferences/
async fn update_preferences(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let u = load_user(&state, uid).await?;
    let data = parse_body(&body);
    let mut active: user::ActiveModel = u.clone().into();
    let mut updated = false;

    if let Some(theme) = data.get("theme").and_then(|v| v.as_str()) {
        if THEMES.contains(&theme) {
            active.theme = Set(theme.to_string());
            updated = true;
        }
    }
    if let Some(lang) = data.get("language").and_then(|v| v.as_str()) {
        if LANGUAGES.contains(&lang) {
            active.language = Set(lang.to_string());
            updated = true;
        }
    }
    if let Some(da) = data.get("drawer_anchor").and_then(|v| v.as_str()) {
        if DRAWER_ANCHORS.contains(&da) {
            active.drawer_anchor = Set(da.to_string());
            updated = true;
        }
    }

    // selected_banner: present + non-null. "" clears; otherwise must be enabled.
    match data.get("selected_banner") {
        None | Some(Value::Null) => {}
        Some(Value::String(s)) if s.is_empty() => {
            active.selected_banner_id = Set(None);
            updated = true;
        }
        Some(v) => {
            let banner_id = v
                .as_i64()
                .map(|n| n as i32)
                .or_else(|| v.as_str().and_then(|s| s.parse::<i32>().ok()));
            match banner_id {
                Some(bid) => {
                    let banner = Banner::find_by_id(bid)
                        .filter(crate::entities::banner::Column::IsEnabled.eq(true))
                        .one(&state.db)
                        .await?;
                    if banner.is_none() {
                        return Err(err_json(
                            StatusCode::BAD_REQUEST,
                            json!({ "error": "Invalid or disabled banner" }),
                        ));
                    }
                    active.selected_banner_id = Set(Some(bid));
                    updated = true;
                }
                None => {
                    return Err(err_json(
                        StatusCode::BAD_REQUEST,
                        json!({ "error": "Invalid or disabled banner" }),
                    ));
                }
            }
        }
    }

    if !updated {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "No valid updates provided" }),
        ));
    }
    let saved = active.update(&state.db).await?;
    Ok(Json(json!({
        "status": "preferences updated",
        "theme": saved.theme,
        "language": saved.language,
        "drawer_anchor": saved.drawer_anchor,
        "selected_banner": saved.selected_banner_id,
    })))
}

/// POST /api/users/update_avatar/ — multipart form, field `avatar`.
async fn update_avatar(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    mut multipart: Multipart,
) -> ApiResult<Json<UserOut>> {
    let mut data: Option<(String, Vec<u8>)> = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| ApiError::BadRequest(format!("invalid multipart: {e}")))?
    {
        if field.name() == Some("avatar") {
            let name = field.file_name().unwrap_or("avatar").to_string();
            let bytes = field
                .bytes()
                .await
                .map_err(|e| ApiError::BadRequest(format!("read upload: {e}")))?;
            data = Some((name, bytes.to_vec()));
            break;
        }
    }

    let Some((name, bytes)) = data else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "No avatar provided" }),
        ));
    };
    if bytes.len() > 2 * 1024 * 1024 {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "File size exceeds 2MB limit" }),
        ));
    }

    let media_root = state.config.media_root.clone();
    let rel = tokio::task::spawn_blocking(move || {
        crate::avatar::process_and_save(&media_root, &name, &bytes)
    })
    .await
    .map_err(|_| ApiError::Internal)?
    .map_err(ApiError::BadRequest)?;

    let u = load_user(&state, uid).await?;
    let mut active: user::ActiveModel = u.into();
    active.avatar = Set(Some(rel));
    let saved = active.update(&state.db).await?;
    Ok(Json(build_user(&state, &ctx, saved, Some(uid)).await?))
}

/// POST /api/users/change_password/
async fn change_password(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let u = load_user(&state, uid).await?;
    let data = parse_body(&body);
    let old = data
        .get("old_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let new = data
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !crate::password::verify_password(old, &u.password) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Wrong old password" }),
        ));
    }
    check_password_policy(
        new,
        &crate::password_policy::UserAttrs {
            username: &u.username,
            first_name: &u.first_name,
            last_name: &u.last_name,
            email: &u.email,
        },
    )?;
    let mut active: user::ActiveModel = u.into();
    active.password = Set(crate::password::hash_password(new));
    active.update(&state.db).await?;
    Ok(Json(json!({ "status": "password changed" })))
}

/// PATCH /api/users/update_profile/
async fn update_profile(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let u = load_user(&state, uid).await?;
    let data = parse_body(&body);
    let mut active: user::ActiveModel = u.clone().into();
    let mut message = String::new();

    if let Some(username) = field_str(&data, "username") {
        if username != u.username {
            let taken = User::find()
                .filter(user::Column::Username.eq(username.clone()))
                .one(&state.db)
                .await?
                .is_some();
            if taken {
                return Err(err_json(
                    StatusCode::BAD_REQUEST,
                    json!({ "error": "Username already taken" }),
                ));
            }
            active.username = Set(username);
        }
    }

    if let Some(email) = field_str(&data, "email") {
        if email != u.email {
            let code = gen_code();
            active.pending_email = Set(Some(email.clone()));
            active.email_confirmation_code = Set(Some(code.clone()));
            state.security.record_code(&email_code_key(uid));
            let new_username = match &active.username {
                Set(v) => v.clone(),
                _ => u.username.clone(),
            };
            crate::email::spawn_mail(
                state.config.email.clone(),
                "Confirm your new email".into(),
                format!("Hi {new_username},\n\nYour confirmation code is: {code}"),
                vec![email],
            );
            message = " Confirmation code sent to new email.".into();
        }
    }

    let saved = active.update(&state.db).await?;
    let mut out = serde_json::to_value(build_user(&state, &ctx, saved, Some(uid)).await?)
        .map_err(|_| ApiError::Internal)?;
    if !message.is_empty() {
        if let Value::Object(ref mut map) = out {
            map.insert("message".into(), Value::String(message));
        }
    }
    Ok(Json(out))
}

/// POST /api/users/confirm_email/
async fn confirm_email(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let code_key = email_code_key(uid);
    state
        .security
        .check_rate(&format!("attempt:{code_key}"), throttle::CODE_ATTEMPTS)?;
    if state.security.code_expired(&code_key) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Confirmation code has expired. Please request a new one." }),
        ));
    }
    let u = load_user(&state, uid).await?;
    let data = parse_body(&body);
    let code = data.get("code").and_then(|v| v.as_str());

    if !code_matches(u.email_confirmation_code.as_deref(), code) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Invalid or expired code" }),
        ));
    }
    let Some(pending) = u.pending_email.clone() else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "No pending email change" }),
        ));
    };
    let mut active: user::ActiveModel = u.into();
    active.email = Set(pending.clone());
    active.pending_email = Set(None);
    active.email_confirmation_code = Set(None);
    active.update(&state.db).await?;
    state.security.clear_code(&code_key);
    Ok(Json(
        json!({ "status": "Email confirmed", "email": pending }),
    ))
}

// ---- signup / verification ----------------------------------------------

/// POST /api/users/signup/ (AllowAny)
async fn signup(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<Value>)> {
    let ip = crate::web::client_ip(&headers, peer);
    state
        .security
        .check_rate(&format!("signup:ip:{ip}"), throttle::SIGNUP)?;
    let data = parse_body(&body);
    let (Some(username), Some(email), Some(password)) = (
        field_str(&data, "username"),
        field_str(&data, "email"),
        field_str(&data, "password"),
    ) else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Username, email and password required" }),
        ));
    };

    if User::find()
        .filter(user::Column::Username.eq(username.clone()))
        .one(&state.db)
        .await?
        .is_some()
    {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Username already exists" }),
        ));
    }
    if User::find()
        .filter(user::Column::Email.eq(email.clone()))
        .one(&state.db)
        .await?
        .is_some()
    {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Email already exists" }),
        ));
    }

    check_password_policy(
        &password,
        &crate::password_policy::UserAttrs {
            username: &username,
            first_name: "",
            last_name: "",
            email: &email,
        },
    )?;

    let code = gen_code();
    let created = user::ActiveModel {
        password: Set(crate::password::hash_password(&password)),
        last_login: Set(None),
        is_superuser: Set(false),
        username: Set(username.clone()),
        first_name: Set(String::new()),
        last_name: Set(String::new()),
        email: Set(email.clone()),
        is_staff: Set(false),
        is_active: Set(false),
        date_joined: Set(crate::datetime::now_micros()),
        theme: Set("holy_light".into()),
        email_confirmation_code: Set(Some(code.clone())),
        pending_email: Set(None),
        avatar: Set(None),
        language: Set("en".into()),
        selected_banner_id: Set(None),
        drawer_anchor: Set("right".into()),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    let link = format!(
        "{}/verify-email?username={}&code={}",
        state.config.frontend_url, username, code
    );
    let msg = format!(
        "Hi {username},\n\nYour verification code is: {code}\n\n\
         Alternatively, you can complete your registration by clicking the link below:\n\
         {link}\n\nWelcome to the archive!"
    );
    // Signup awaits delivery and rolls back the user on failure (parity with the
    // try/except in the Django view).
    if let Err(e) = crate::email::send_mail(
        &state.config.email,
        "Verify your Holy Flavors account",
        &msg,
        std::slice::from_ref(&email),
    )
    .await
    {
        let _ = User::delete_by_id(created.id).exec(&state.db).await;
        tracing::error!(error = %e, "signup verification email failed");
        return Err(err_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({
                "error": "Failed to send verification email. Please try again later."
            }),
        ));
    }
    state.security.record_code(&signup_code_key(&username));

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "status": "User created, please verify your email",
            "username": username,
            "email": email,
        })),
    ))
}

/// POST /api/users/resend_verification/ (AllowAny)
async fn resend_verification(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let ip = crate::web::client_ip(&headers, peer);
    state
        .security
        .check_rate(&format!("resend:ip:{ip}"), throttle::RESEND_VERIFICATION)?;
    let data = parse_body(&body);
    let Some(username) = field_str(&data, "username") else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Username required" }),
        ));
    };
    let user = User::find()
        .filter(user::Column::Username.eq(username))
        .filter(user::Column::IsActive.eq(false))
        .one(&state.db)
        .await?;
    let Some(user) = user else {
        return Err(err_json(
            StatusCode::NOT_FOUND,
            json!({ "error": "User not found or already active" }),
        ));
    };

    let code = gen_code();
    let email = user.email.clone();
    let uname = user.username.clone();
    let mut active: user::ActiveModel = user.into();
    active.email_confirmation_code = Set(Some(code.clone()));
    active.update(&state.db).await?;

    let link = format!(
        "{}/verify-email?username={}&code={}",
        state.config.frontend_url, uname, code
    );
    let msg = format!(
        "Hi {uname},\n\nYour new verification code is: {code}\n\n\
         Alternatively, you can complete your registration by clicking the link below:\n{link}"
    );
    if let Err(e) = crate::email::send_mail(
        &state.config.email,
        "Verify your Holy Flavors account",
        &msg,
        &[email],
    )
    .await
    {
        tracing::error!(error = %e, "resend verification email failed");
        return Err(err_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({ "error": "Failed to send email. Please try again later." }),
        ));
    }
    state.security.record_code(&signup_code_key(&uname));
    Ok(Json(json!({ "status": "Verification code resent!" })))
}

/// POST /api/users/verify_signup/ (AllowAny)
async fn verify_signup(State(state): State<AppState>, body: Bytes) -> ApiResult<Json<Value>> {
    let data = parse_body(&body);
    let username = field_str(&data, "username").unwrap_or_default();
    let code = data.get("code").and_then(|v| v.as_str());

    let code_key = signup_code_key(&username);
    state
        .security
        .check_rate(&format!("attempt:{code_key}"), throttle::CODE_ATTEMPTS)?;
    if state.security.code_expired(&code_key) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Verification code has expired. Please request a new one." }),
        ));
    }

    let user = User::find()
        .filter(user::Column::Username.eq(username))
        .filter(user::Column::IsActive.eq(false))
        .one(&state.db)
        .await?;
    let Some(user) = user else {
        return Err(err_json(
            StatusCode::NOT_FOUND,
            json!({ "error": "User not found or already active" }),
        ));
    };

    if code_matches(user.email_confirmation_code.as_deref(), code) {
        let mut active: user::ActiveModel = user.into();
        active.is_active = Set(true);
        active.email_confirmation_code = Set(None);
        active.update(&state.db).await?;
        state.security.clear_code(&code_key);
        Ok(Json(json!({ "status": "Account verified successfully!" })))
    } else {
        Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Invalid verification code" }),
        ))
    }
}

// ---- password reset / account deletion ----------------------------------

/// POST /api/users/request_password_reset/ (AllowAny). Always returns the same
/// generic message (no account enumeration).
async fn request_password_reset(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let ip = crate::web::client_ip(&headers, peer);
    state.security.check_rate(
        &format!("pwreset_req:ip:{ip}"),
        throttle::PASSWORD_RESET_REQUEST,
    )?;
    let generic = json!({
        "status": "If an account exists with this email, a reset code has been sent."
    });
    let data = parse_body(&body);
    let Some(email) = field_str(&data, "email") else {
        return Ok(Json(generic));
    };
    let user = User::find()
        .filter(user::Column::Email.eq(email.clone()))
        .filter(user::Column::IsActive.eq(true))
        .one(&state.db)
        .await?;
    let Some(user) = user else {
        return Ok(Json(generic));
    };

    let code = gen_code();
    let uname = user.username.clone();
    let mut active: user::ActiveModel = user.into();
    active.email_confirmation_code = Set(Some(code.clone()));
    active.update(&state.db).await?;
    state.security.record_code(&pwreset_code_key(&email));

    crate::email::spawn_mail(
        state.config.email.clone(),
        "Password Reset Request".into(),
        format!("Hi {uname},\n\nYour password reset code is: {code}"),
        vec![email],
    );
    Ok(Json(generic))
}

/// POST /api/users/complete_password_reset/ (AllowAny)
async fn complete_password_reset(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let ip = crate::web::client_ip(&headers, peer);
    state.security.check_rate(
        &format!("pwreset_done:ip:{ip}"),
        throttle::PASSWORD_RESET_COMPLETE,
    )?;
    let data = parse_body(&body);
    let email = field_str(&data, "email").unwrap_or_default();
    let code = data
        .get("code")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let new_password = data.get("password").and_then(|v| v.as_str()).unwrap_or("");

    let code_key = pwreset_code_key(&email);
    // Per-account attempt lockout on top of the IP limit, so rotating source IPs
    // can't grind the 6-digit space against one account.
    state
        .security
        .check_rate(&format!("attempt:{code_key}"), throttle::CODE_ATTEMPTS)?;
    if state.security.code_expired(&code_key) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Reset code has expired. Please request a new one." }),
        ));
    }

    let user = User::find()
        .filter(user::Column::Email.eq(email.clone()))
        .filter(user::Column::EmailConfirmationCode.eq(code))
        .one(&state.db)
        .await?;
    let Some(user) = user else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Invalid email or code" }),
        ));
    };

    check_password_policy(
        new_password,
        &crate::password_policy::UserAttrs {
            username: &user.username,
            first_name: &user.first_name,
            last_name: &user.last_name,
            email: &user.email,
        },
    )?;

    let mut active: user::ActiveModel = user.into();
    active.password = Set(crate::password::hash_password(new_password));
    active.email_confirmation_code = Set(None);
    active.update(&state.db).await?;
    state.security.clear_code(&code_key);
    Ok(Json(json!({ "status": "Password reset successful!" })))
}

/// POST /api/users/request_account_deletion/
async fn request_account_deletion(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    _body: Bytes,
) -> ApiResult<Json<Value>> {
    state.security.check_rate(
        &format!("deletion_req:user:{uid}"),
        throttle::ACCOUNT_DELETION_REQUEST,
    )?;
    let user = load_user(&state, uid).await?;
    let code = gen_code();
    let uname = user.username.clone();
    let email = user.email.clone();
    let mut active: user::ActiveModel = user.into();
    active.email_confirmation_code = Set(Some(code.clone()));
    active.update(&state.db).await?;
    state.security.record_code(&del_code_key(uid));

    crate::email::spawn_mail(
        state.config.email.clone(),
        "Confirm Account Deletion - Holy Flavors Archive".into(),
        format!(
            "Hi {uname},\n\nYou requested to delete your account. \
             This action is permanent.\n\nYour deletion code is: {code}"
        ),
        vec![email],
    );
    Ok(Json(json!({ "status": "Code sent to your email" })))
}

/// POST /api/users/confirm_account_deletion/ — deletes the account (cascades).
async fn confirm_account_deletion(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    body: Bytes,
) -> ApiResult<Json<Value>> {
    let code_key = del_code_key(uid);
    state
        .security
        .check_rate(&format!("attempt:{code_key}"), throttle::CODE_ATTEMPTS)?;
    if state.security.code_expired(&code_key) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Deletion code has expired. Please request a new one." }),
        ));
    }
    let user = load_user(&state, uid).await?;
    let data = parse_body(&body);
    let code = data.get("code").and_then(|v| v.as_str());
    if !code_matches(user.email_confirmation_code.as_deref(), code) {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Invalid or expired code" }),
        ));
    }
    state.security.clear_code(&code_key);
    delete_user_cascade(&state, uid).await?;
    Ok(Json(json!({ "status": "Account deleted" })))
}

/// Emulate Django's app-level CASCADE for deleting a user. SQLite enforces FKs
/// but has no ON DELETE CASCADE, so every referencing row must be removed first,
/// in dependency order, inside one transaction.
pub(crate) async fn delete_user_cascade(state: &AppState, uid: i32) -> ApiResult<()> {
    let txn = state.db.begin().await?;
    let exec =
        |sql: &'static str| Statement::from_sql_and_values(DbBackend::Sqlite, sql, [uid.into()]);

    // Notifications referencing the user directly (recipient/actor) or via the
    // user's ratings/replies/tickets/profile-comments.
    txn.execute(exec(
        "DELETE FROM api_notification WHERE recipient_id = ?1 OR actor_id = ?1 \
         OR rating_id IN (SELECT id FROM api_rating WHERE user_id = ?1) \
         OR reply_id IN (SELECT id FROM api_reply WHERE user_id = ?1) \
         OR ticket_id IN (SELECT id FROM api_ticket WHERE user_id = ?1) \
         OR profile_comment_id IN (SELECT id FROM api_profilecomment \
             WHERE author_id = ?1 OR profile_owner_id = ?1)",
    ))
    .await?;
    // Replies: on the user's ratings, or authored by the user.
    txn.execute(exec(
        "DELETE FROM api_reply WHERE user_id = ?1 \
         OR rating_id IN (SELECT id FROM api_rating WHERE user_id = ?1)",
    ))
    .await?;
    txn.execute(exec("DELETE FROM api_rating WHERE user_id = ?"))
        .await?;
    txn.execute(exec(
        "DELETE FROM api_ticketmessage WHERE user_id = ?1 \
         OR ticket_id IN (SELECT id FROM api_ticket WHERE user_id = ?1)",
    ))
    .await?;
    txn.execute(exec("DELETE FROM api_ticket WHERE user_id = ?"))
        .await?;
    txn.execute(exec(
        "DELETE FROM api_profilecomment WHERE author_id = ?1 OR profile_owner_id = ?1",
    ))
    .await?;
    txn.execute(exec("DELETE FROM api_userip WHERE user_id = ?"))
        .await?;
    txn.execute(exec(
        "DELETE FROM api_user_following WHERE from_user_id = ?1 OR to_user_id = ?1",
    ))
    .await?;
    // Token blacklist tables reference the user via outstanding tokens.
    txn.execute(exec(
        "DELETE FROM token_blacklist_blacklistedtoken WHERE token_id IN \
         (SELECT id FROM token_blacklist_outstandingtoken WHERE user_id = ?)",
    ))
    .await?;
    txn.execute(exec(
        "DELETE FROM token_blacklist_outstandingtoken WHERE user_id = ?",
    ))
    .await?;
    txn.execute(exec("DELETE FROM api_user WHERE id = ?"))
        .await?;
    txn.commit().await?;
    Ok(())
}

// ---- follow / unfollow ---------------------------------------------------

/// POST /api/users/{id}/follow/
async fn follow(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<Value>> {
    load_user(&state, uid).await?;
    let target = User::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if target.id == uid {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "You cannot follow yourself" }),
        ));
    }
    if !is_following(&state, uid, target.id).await? {
        add_follow(&state, uid, target.id).await?;
        notification::ActiveModel {
            is_read: Set(false),
            created_at: Set(crate::datetime::now_micros()),
            actor_id: Set(uid),
            recipient_id: Set(target.id),
            notification_type: Set("follow".into()),
            ..Default::default()
        }
        .insert(&state.db)
        .await?;
    }
    Ok(Json(json!({ "status": "followed" })))
}

/// POST /api/users/{id}/unfollow/
async fn unfollow(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<Value>> {
    load_user(&state, uid).await?;
    let target = User::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    remove_follow(&state, uid, target.id).await?;
    Ok(Json(json!({ "status": "unfollowed" })))
}

// ---- profile comments ----------------------------------------------------

/// POST /api/users/{id}/add_comment/
async fn add_comment(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
    Path(id): Path<i32>,
    body: Bytes,
) -> ApiResult<(StatusCode, Json<ProfileCommentOut>)> {
    let me = load_user(&state, uid).await?;
    let owner = User::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let data = parse_body(&body);
    let Some(text) = field_str(&data, "text") else {
        return Err(err_json(
            StatusCode::BAD_REQUEST,
            json!({ "error": "Text is required" }),
        ));
    };

    let comment = profile_comment::ActiveModel {
        text: Set(text),
        created_at: Set(crate::datetime::now_micros()),
        author_id: Set(me.id),
        profile_owner_id: Set(owner.id),
        ..Default::default()
    }
    .insert(&state.db)
    .await?;

    if owner.id != me.id {
        notification::ActiveModel {
            is_read: Set(false),
            created_at: Set(crate::datetime::now_micros()),
            actor_id: Set(me.id),
            recipient_id: Set(owner.id),
            notification_type: Set("profile_comment".into()),
            profile_comment_id: Set(Some(comment.id)),
            ..Default::default()
        }
        .insert(&state.db)
        .await?;
    }

    let mut dtos = build_profile_comments(&state, &ctx, vec![comment]).await?;
    Ok((
        StatusCode::CREATED,
        Json(dtos.pop().ok_or(ApiError::Internal)?),
    ))
}

/// DELETE /api/users/{id}/delete_comment/{comment_id}/
async fn delete_comment(
    State(state): State<AppState>,
    AuthUser(uid): AuthUser,
    Path((id, comment_id)): Path<(i32, i32)>,
) -> ApiResult<StatusCode> {
    let me = load_user(&state, uid).await?;
    let owner = User::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let comment = ProfileComment::find_by_id(comment_id)
        .filter(profile_comment::Column::ProfileOwnerId.eq(owner.id))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    if comment.author_id != me.id && !me.is_superuser && owner.id != me.id {
        return Err(ApiError::Forbidden(
            "You do not have permission to perform this action.".into(),
        ));
    }

    let txn = state.db.begin().await?;
    Notification::delete_many()
        .filter(notification::Column::ProfileCommentId.eq(comment.id))
        .exec(&txn)
        .await?;
    ProfileComment::delete_by_id(comment.id).exec(&txn).await?;
    txn.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---- public profile / dashboard -----------------------------------------

/// GET /api/users/profile/{username}/ (AllowAny)
async fn public_profile(
    State(state): State<AppState>,
    ctx: RequestCtx,
    OptionalUser(viewer): OptionalUser,
    Path(username): Path<String>,
) -> ApiResult<Json<PublicProfileOut>> {
    let user = User::find()
        .filter(user::Column::Username.eq(username))
        .one(&state.db)
        .await?;
    let Some(user) = user else {
        return Err(err_json(
            StatusCode::NOT_FOUND,
            json!({ "error": "User not found" }),
        ));
    };

    let ratings_models = Rating::find()
        .filter(rating::Column::UserId.eq(user.id))
        .order_by_desc(rating::Column::Score)
        .all(&state.db)
        .await?;
    let ratings = build_ratings(&state, &ctx, ratings_models).await?;

    let comment_models = ProfileComment::find()
        .filter(profile_comment::Column::ProfileOwnerId.eq(user.id))
        .order_by_desc(profile_comment::Column::CreatedAt)
        .all(&state.db)
        .await?;
    let comments = build_profile_comments(&state, &ctx, comment_models).await?;

    let follower_ids_v = follower_ids(&state, user.id).await?;
    let following_ids_v = following_ids(&state, user.id).await?;
    let followers = build_users(
        &state,
        &ctx,
        users_by_ids(&state, &follower_ids_v).await?,
        viewer,
    )
    .await?;
    let following = build_users(
        &state,
        &ctx,
        users_by_ids(&state, &following_ids_v).await?,
        viewer,
    )
    .await?;

    let is_following = match viewer {
        Some(v) => is_following(&state, v, user.id).await?,
        None => false,
    };

    Ok(Json(PublicProfileOut {
        id: user.id,
        username: user.username.clone(),
        theme: user.theme.clone(),
        avatar: user
            .avatar
            .as_deref()
            .filter(|s| !s.is_empty())
            .map(|a| crate::media::image_field_url(&ctx, &state.config.media_url, a)),
        following_count: following_ids_v.len() as i64,
        followers_count: follower_ids_v.len() as i64,
        is_following,
        ratings,
        comments,
        followers,
        following,
    }))
}

/// GET /api/users/dashboard/
async fn dashboard(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<DashboardOut>> {
    let me = load_user(&state, uid).await?;
    let followed = following_ids(&state, uid).await?;

    let my_ratings_models = Rating::find()
        .filter(rating::Column::UserId.eq(uid))
        .order_by_desc(rating::Column::CreatedAt)
        .all(&state.db)
        .await?;
    let rated_count = my_ratings_models.len() as i64;
    let rated_flavor_ids: std::collections::HashSet<i32> =
        my_ratings_models.iter().map(|r| r.flavor_id).collect();
    let my_ratings = build_ratings(&state, &ctx, my_ratings_models).await?;

    // Missing flavors: not rated by me, excluding the "Packs and other" category,
    // ordered by category name then flavor name.
    let packs = crate::entities::category::Entity::find()
        .filter(crate::entities::category::Column::Name.eq("Packs and other"))
        .one(&state.db)
        .await?;
    let mut q = Flavor::find();
    if let Some(p) = packs {
        q = q.filter(flavor::Column::CategoryId.ne(p.id));
    }
    let mut all_flavors = q.all(&state.db).await?;
    all_flavors.retain(|f| !rated_flavor_ids.contains(&f.id));

    // Order by category name then flavor name (resolve category names first).
    let cat_ids: Vec<i32> = all_flavors.iter().map(|f| f.category_id).collect();
    let cat_names: std::collections::HashMap<i32, String> =
        crate::entities::category::Entity::find()
            .filter(crate::entities::category::Column::Id.is_in(cat_ids))
            .all(&state.db)
            .await?
            .into_iter()
            .map(|c| (c.id, c.name))
            .collect();
    all_flavors.sort_by(|a, b| {
        let ca = cat_names
            .get(&a.category_id)
            .map(String::as_str)
            .unwrap_or("");
        let cb = cat_names
            .get(&b.category_id)
            .map(String::as_str)
            .unwrap_or("");
        ca.cmp(cb).then_with(|| a.name.cmp(&b.name))
    });

    let missing_count = all_flavors.len() as i64;
    let missing_flavors = build_flavors(&state, &ctx, all_flavors, Some(uid), &followed).await?;
    let user = build_user(&state, &ctx, me, Some(uid)).await?;

    Ok(Json(DashboardOut {
        user,
        rated_count,
        missing_count,
        missing_flavors,
        my_ratings,
    }))
}
