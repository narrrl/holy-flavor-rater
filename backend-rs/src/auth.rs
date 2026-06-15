//! SimpleJWT-compatible token verification.
//!
//! Django's SimpleJWT signs access tokens with HS256 keyed on `SECRET_KEY`.
//! The claim set is `{ token_type, exp, iat, jti, user_id }`. We verify the
//! signature + `exp` and require `token_type == "access"`. No issuance happens
//! here yet — login/refresh stay on Django until that slice is ported.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use sea_orm::EntityTrait;
use serde::Deserialize;

use crate::entities::prelude::User;
use crate::entities::user;
use crate::error::ApiError;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct Claims {
    pub user_id: i32,
    pub token_type: String,
    // Read by jsonwebtoken's `validate_exp` during decode, not by our code.
    #[allow(dead_code)]
    pub exp: usize,
}

/// The authenticated user id, or `None` for anonymous requests. Used by
/// `IsAuthenticatedOrReadOnly`-style endpoints (e.g. `user_rating`).
#[derive(Debug, Clone, Copy)]
pub struct OptionalUser(pub Option<i32>);

/// A required authenticated user id; rejects with 401 when absent/invalid.
#[derive(Debug, Clone, Copy)]
pub struct AuthUser(pub i32);

fn token_from_parts(parts: &Parts) -> Option<String> {
    if let Some(auth) = parts
        .headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
    {
        if let Some(rest) = auth.strip_prefix("Bearer ") {
            return Some(rest.trim().to_string());
        }
    }
    // httpOnly cookie fallback (JWT_AUTH_COOKIE_ACCESS = "access_token").
    let cookie = parts
        .headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok())?;
    for kv in cookie.split(';') {
        let kv = kv.trim();
        if let Some(val) = kv.strip_prefix("access_token=") {
            return Some(val.to_string());
        }
    }
    None
}

fn verify(token: &str, secret: &str) -> Option<Claims> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_aud = false;
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .ok()?;
    if data.claims.token_type != "access" {
        return None;
    }
    Some(data.claims)
}

impl FromRequestParts<AppState> for OptionalUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let uid = token_from_parts(parts)
            .and_then(|t| verify(&t, &state.config.secret_key))
            .map(|c| c.user_id);
        Ok(OptionalUser(uid))
    }
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        token_from_parts(parts)
            .and_then(|t| verify(&t, &state.config.secret_key))
            .map(|c| AuthUser(c.user_id))
            .ok_or(ApiError::Unauthorized)
    }
}

/// A staff user (DRF `IsAdminUser` = `is_staff`). 401 if unauthenticated, 403 if
/// authenticated but not staff. Carries the loaded user so admin handlers reuse it.
pub struct AdminUser(pub user::Model);

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let uid = token_from_parts(parts)
            .and_then(|t| verify(&t, &state.config.secret_key))
            .map(|c| c.user_id)
            .ok_or(ApiError::Unauthorized)?;
        let user = User::find_by_id(uid)
            .one(&state.db)
            .await?
            .ok_or(ApiError::Unauthorized)?;
        if !user.is_staff {
            return Err(ApiError::Forbidden(
                "You do not have permission to perform this action.".into(),
            ));
        }
        Ok(AdminUser(user))
    }
}
