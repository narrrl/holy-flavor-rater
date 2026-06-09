use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

/// Unified API error. Serializes to a DRF-ish `{ "detail": "..." }` body so the
/// existing frontend's error handling keeps working unchanged.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("not found")]
    NotFound,
    #[error("authentication credentials were not provided")]
    Unauthorized,
    #[error("database error: {0}")]
    Db(#[from] sea_orm::DbErr),
    #[error("{0}")]
    BadRequest(String),
    /// 403 with a DRF `{ "detail": ... }` body (e.g. object-permission denial).
    #[error("{0}")]
    Forbidden(String),
    /// 400 whose body is an arbitrary JSON value, used to mirror DRF serializer
    /// validation errors verbatim (field-keyed maps or top-level lists).
    #[error("validation error")]
    Validation(serde_json::Value),
    /// Arbitrary status + JSON body, for DRF actions that return custom
    /// `{ "error": ... }` / `{ "status": ... }` payloads with a non-400 status
    /// (e.g. 404 or 500 from the user account actions).
    #[error("error")]
    JsonStatus(StatusCode, serde_json::Value),
    /// 429 Too Many Requests. Replaces django_ratelimit's block (which DRF
    /// rendered as a 403); a real `429` + `Retry-After` is the professional
    /// behaviour and the frontend's generic error fallbacks handle it.
    #[error("too many requests")]
    RateLimited { retry_after: u64 },
    #[error("internal error")]
    Internal,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        // Validation carries its own JSON body shape; handle before the
        // `{ "detail": ... }` path below.
        if let ApiError::Validation(body) = &self {
            return (StatusCode::BAD_REQUEST, Json(body.clone())).into_response();
        }
        if let ApiError::JsonStatus(status, body) = &self {
            return (*status, Json(body.clone())).into_response();
        }
        if let ApiError::RateLimited { retry_after } = &self {
            let msg = "Too many requests. Please try again later.";
            let mut resp = (
                StatusCode::TOO_MANY_REQUESTS,
                // `error` for the account flows' `data.error` handling, `detail`
                // for DRF-style consumers.
                Json(json!({ "detail": msg, "error": msg })),
            )
                .into_response();
            if let Ok(hv) = axum::http::HeaderValue::from_str(&retry_after.to_string()) {
                resp.headers_mut().insert(axum::http::header::RETRY_AFTER, hv);
            }
            return resp;
        }
        let (status, detail) = match &self {
            ApiError::NotFound => (StatusCode::NOT_FOUND, "Not found.".to_string()),
            ApiError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "Authentication credentials were not provided.".to_string(),
            ),
            ApiError::Forbidden(m) => (StatusCode::FORBIDDEN, m.clone()),
            ApiError::Validation(_) | ApiError::JsonStatus(..) | ApiError::RateLimited { .. } => {
                unreachable!("handled above")
            }
            ApiError::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone()),
            ApiError::Db(e) => {
                tracing::error!(error = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "Server error.".to_string())
            }
            ApiError::Internal => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Server error.".to_string())
            }
        };
        (status, Json(json!({ "detail": detail }))).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
