//! SimpleJWT-compatible auth issuance (login / refresh / verify / logout).
//!
//! Ports Django's cookie-backed JWT views (`api/views/auth.py`): tokens are set
//! as httpOnly cookies and the JSON body is just `{"status": "ok"}`. Refresh
//! rotates with blacklist-after-rotation. Tokens are HS256-signed with the same
//! `SECRET_KEY` as Django, so they remain valid on whichever backend serves a
//! given request during the strangler rollout.

use std::net::SocketAddr;

use axum::body::Bytes;
use axum::extract::{ConnectInfo, State};
use axum::http::header::{HeaderMap, HeaderValue, SET_COOKIE};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::Deserialize;
use serde_json::json;

use crate::blacklist::{blacklist, is_blacklisted, record_outstanding};
use crate::cookies::{
    clear_cookie, cookie_value, set_cookie, COOKIE_ACCESS, COOKIE_REFRESH,
};
use crate::entities::prelude::*;
use crate::entities::user;
use crate::error::ApiResult;
use crate::password::verify_password;
use crate::state::AppState;
use crate::tokens::{
    mint_access, mint_refresh, verify_any, verify_refresh, Minted, ACCESS_LIFETIME_SECS,
    REFRESH_LIFETIME_SECS,
};

/// A well-formed pbkdf2_sha256 hash (iteration count matching `password.rs`)
/// used only to spend the same CPU on the user-not-found branch of login, so the
/// response time can't be used to enumerate usernames. Never matches any input.
const DUMMY_PASSWORD_HASH: &str =
    "pbkdf2_sha256$1200000$dummytimingsalt$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/token/", post(login))
        .route("/auth/token/refresh/", post(refresh))
        .route("/auth/token/verify/", post(verify))
        .route("/auth/logout/", post(logout))
        // Legacy alias kept for clients still calling POST /api/token/.
        .route("/token/", post(login))
}

#[derive(Deserialize, Default)]
struct LoginReq {
    #[serde(default)]
    username: String,
    #[serde(default)]
    password: String,
}

/// POST /api/auth/token/ — validate credentials, set cookies.
async fn login(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Response> {
    // Brute-force guard, keyed by client IP (Django had no login throttle).
    let ip = crate::web::client_ip(&headers, peer);
    state
        .security
        .check_rate(&format!("login:ip:{ip}"), crate::throttle::LOGIN)?;

    let req: LoginReq = serde_json::from_slice(&body).unwrap_or_default();
    let secret = &state.config.secret_key;

    let user = User::find()
        .filter(user::Column::Username.eq(&req.username))
        .one(&state.db)
        .await?;

    // Mirror SimpleJWT: a single generic 401 for missing user, bad password, or
    // inactive account. Run a dummy verify on the not-found branch so response
    // time doesn't reveal whether the username exists (timing enumeration).
    let Some(user) = user else {
        let _ = verify_password(&req.password, DUMMY_PASSWORD_HASH);
        return Ok(invalid_credentials());
    };
    if !verify_password(&req.password, &user.password) || !user.is_active {
        return Ok(invalid_credentials());
    }

    let refresh = mint_refresh(secret, user.id);
    let access = mint_access(secret, user.id);
    // RefreshToken.for_user records the outstanding token.
    record_outstanding(
        &state.db,
        user.id,
        &refresh.jti,
        &refresh.token,
        refresh.created_at(),
        refresh.expires_at(),
    )
    .await?;

    Ok(ok_with_cookies(state.config.jwt_cookie_secure, &access, &refresh))
}

#[derive(Deserialize, Default)]
struct RefreshReq {
    refresh: Option<String>,
}

/// POST /api/auth/token/refresh/ — rotate using the body or cookie refresh token.
async fn refresh(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Response> {
    let secret = &state.config.secret_key;

    let from_body = (!body.is_empty())
        .then(|| serde_json::from_slice::<RefreshReq>(&body).ok())
        .flatten()
        .and_then(|r| r.refresh);
    let token = from_body.or_else(|| read_cookie(&headers, COOKIE_REFRESH));

    let Some(token) = token else {
        return Ok(token_not_valid());
    };
    let Some(claims) = verify_refresh(&token, secret) else {
        return Ok(token_not_valid());
    };
    if is_blacklisted(&state.db, &claims.jti).await? {
        return Ok(token_not_valid());
    }

    // BLACKLIST_AFTER_ROTATION: blacklist the incoming token, then issue a new pair.
    blacklist(
        &state.db,
        claims.user_id,
        &claims.jti,
        &token,
        crate::tokens::TokenClaims::expires_naive(claims.exp),
    )
    .await?;

    let new_refresh = mint_refresh(secret, claims.user_id);
    let new_access = mint_access(secret, claims.user_id);
    Ok(ok_with_cookies(
        state.config.jwt_cookie_secure,
        &new_access,
        &new_refresh,
    ))
}

#[derive(Deserialize, Default)]
struct VerifyReq {
    token: Option<String>,
}

/// POST /api/auth/token/verify/ — validate any token (and blacklist for refresh).
async fn verify(State(state): State<AppState>, body: Bytes) -> ApiResult<Response> {
    let req: VerifyReq = serde_json::from_slice(&body).unwrap_or_default();
    let Some(token) = req.token else {
        // DRF serializer: missing required field → 400.
        return Ok((
            StatusCode::BAD_REQUEST,
            Json(json!({ "token": ["This field is required."] })),
        )
            .into_response());
    };
    let Some(claims) = verify_any(&token, &state.config.secret_key) else {
        return Ok(token_not_valid());
    };
    if is_blacklisted(&state.db, &claims.jti).await? {
        return Ok(token_not_valid());
    }
    Ok(Json(json!({})).into_response())
}

/// POST /api/auth/logout/ — blacklist the refresh cookie and clear both cookies.
async fn logout(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    let secret = &state.config.secret_key;
    if let Some(token) = read_cookie(&headers, COOKIE_REFRESH) {
        if let Some(claims) = verify_refresh(&token, secret) {
            // Best-effort; a TokenError is ignored on the Django side too.
            let _ = blacklist(
                &state.db,
                claims.user_id,
                &claims.jti,
                &token,
                crate::tokens::TokenClaims::expires_naive(claims.exp),
            )
            .await;
        }
    }

    let secure = state.config.jwt_cookie_secure;
    let mut resp = Json(json!({ "status": "ok" })).into_response();
    append_cookie(&mut resp, &clear_cookie(COOKIE_ACCESS, secure));
    append_cookie(&mut resp, &clear_cookie(COOKIE_REFRESH, secure));
    Ok(resp)
}

// --- helpers ---------------------------------------------------------------

fn read_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(|h| cookie_value(h, name))
}

fn append_cookie(resp: &mut Response, value: &str) {
    if let Ok(hv) = HeaderValue::from_str(value) {
        resp.headers_mut().append(SET_COOKIE, hv);
    }
}

fn ok_with_cookies(secure: bool, access: &Minted, refresh: &Minted) -> Response {
    let mut resp = Json(json!({ "status": "ok" })).into_response();
    append_cookie(
        &mut resp,
        &set_cookie(COOKIE_ACCESS, &access.token, ACCESS_LIFETIME_SECS, secure),
    );
    append_cookie(
        &mut resp,
        &set_cookie(COOKIE_REFRESH, &refresh.token, REFRESH_LIFETIME_SECS, secure),
    );
    resp
}

fn invalid_credentials() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "detail": "No active account found with the given credentials",
            "code": "no_active_account",
        })),
    )
        .into_response()
}

fn token_not_valid() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "detail": "Token is invalid or expired",
            "code": "token_not_valid",
        })),
    )
        .into_response()
}
