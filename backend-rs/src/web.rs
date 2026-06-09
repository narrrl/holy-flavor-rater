//! Per-request context used to rebuild absolute URLs the way DRF's
//! `request.build_absolute_uri()` does (scheme + host from the incoming
//! request). Behind the strangler nginx proxy, `X-Forwarded-Proto` / `Host`
//! carry the public values.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::HeaderMap;
use std::convert::Infallible;
use std::net::SocketAddr;

/// The client IP, mirroring Django's `log_user_ip`: prefer the first
/// `X-Forwarded-For` hop (set by the strangler proxy), else the peer address
/// (Django's `REMOTE_ADDR`). Used for IP logging and IP-keyed rate limiting.
pub fn client_ip(headers: &HeaderMap, peer: SocketAddr) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| peer.ip().to_string())
}

#[derive(Clone, Debug)]
pub struct RequestCtx {
    pub scheme: String,
    pub host: String,
    /// Full path + query of the current request (for pagination next/prev links).
    pub full_path: String,
}

impl RequestCtx {
    /// Absolute URL for a root-relative path like "/media/x.jpg".
    pub fn absolute(&self, path: &str) -> String {
        let path = if path.starts_with('/') {
            path.to_string()
        } else {
            format!("/{path}")
        };
        format!("{}://{}{}", self.scheme, self.host, path)
    }
}

impl<S: Send + Sync> FromRequestParts<S> for RequestCtx {
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let h = &parts.headers;
        let scheme = h
            .get("x-forwarded-proto")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "http".to_string());
        let host = h
            .get("x-forwarded-host")
            .or_else(|| h.get("host"))
            .and_then(|v| v.to_str().ok())
            .unwrap_or("localhost")
            .to_string();
        // Nested routers rewrite `parts.uri` to the router-relative path, which
        // would drop the `/api` prefix from pagination links. OriginalUri holds
        // the full incoming path.
        let uri = parts
            .extensions
            .get::<axum::extract::OriginalUri>()
            .map(|o| &o.0)
            .unwrap_or(&parts.uri);
        let full_path = uri
            .path_and_query()
            .map(|pq| pq.as_str().to_string())
            .unwrap_or_else(|| uri.path().to_string());
        Ok(RequestCtx {
            scheme,
            host,
            full_path,
        })
    }
}
