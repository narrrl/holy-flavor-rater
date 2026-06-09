mod auth;
mod avatar;
mod blacklist;
mod config;
mod cookies;
mod datetime;
mod db;
mod dto;
mod email;
mod entities;
mod error;
mod jobs;
mod media;
mod merge;
mod mentions;
mod openapi;
mod pagination;
mod password;
mod password_policy;
mod routes;
mod search;
mod service;
mod state;
mod throttle;
mod tokens;
mod web;

use std::time::Duration;

use axum::extract::{DefaultBodyLimit, State};
use axum::http::header::{HeaderValue, REFERRER_POLICY, X_CONTENT_TYPE_OPTIONS, X_FRAME_OPTIONS};
use axum::http::{Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use serde_json::json;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::cors::{AllowHeaders, AllowOrigin, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::Config;
use crate::openapi::ApiDoc;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db = db::connect(&config.database_url).await?;
    let bind_addr = config.bind_addr.clone();
    let state = AppState {
        db,
        config,
        running_jobs: std::sync::Arc::new(tokio::sync::Mutex::new(std::collections::HashSet::new())),
        security: std::sync::Arc::new(crate::throttle::Security::new()),
    };

    // Background scheduler: runs jobs whose `interval_hours` has elapsed,
    // replacing Celery beat. Restart-safe (last_run persists in the DB).
    // Gated so it never double-schedules against a still-running Django beat
    // during the strangler cutover — exactly one scheduler may own `api_job`.
    if state.config.enable_scheduler {
        tracing::info!("job scheduler ENABLED (this process owns api_job scheduling)");
        jobs::spawn_scheduler(state.clone());
    } else {
        tracing::warn!(
            "job scheduler DISABLED (ENABLE_SCHEDULER!=true) — Django beat assumed to own jobs"
        );
    }

    // Periodically sweep aged-out rate-limit / code buckets so the in-memory
    // maps stay bounded.
    {
        let security = state.security.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(std::time::Duration::from_secs(300));
            loop {
                tick.tick().await;
                security.gc();
            }
        });
    }

    // Lock CORS to the configured frontend origin(s) (mirrors Django's
    // CORS_ALLOWED_ORIGINS) rather than reflecting any origin — credentialed CORS
    // can't use a wildcard, and reflecting arbitrary origins is a foot-gun if the
    // SameSite cookie policy ever loosens. Behind the strangler proxy the app is
    // same-origin anyway; this matters for direct browser access.
    let allowed_origins: Vec<axum::http::HeaderValue> = state
        .config
        .cors_allowed_origins
        .iter()
        .filter_map(|o| match o.parse() {
            Ok(v) => Some(v),
            Err(_) => {
                tracing::warn!("ignoring invalid CORS origin: {o}");
                None
            }
        })
        .collect();
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        // Request headers (Content-Type, Authorization, …) are still mirrored;
        // only the origin is restricted. Mirroring headers under credentials is
        // safe — the origin check is the security boundary.
        .allow_headers(AllowHeaders::mirror_request());

    let app = Router::new()
        .route("/health/", get(health))
        .nest("/api", routes::api_router())
        .merge(SwaggerUi::new("/api/schema/swagger-ui").url("/api/schema/", ApiDoc::openapi()))
        .layer(cors)
        // Static security headers DRF/Django set via middleware. `if_not_present`
        // so the nginx front (which may own HSTS in prod) can still override.
        .layer(SetResponseHeaderLayer::if_not_present(
            X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        // Cap request bodies (avatar upload self-limits to 2 MB; this guards every
        // other endpoint against oversized/slow-loris bodies). Set above the
        // avatar limit so the handler's own 2 MB check stays authoritative.
        .layer(DefaultBodyLimit::max(8 * 1024 * 1024))
        // Whole-request deadline so a stalled client can't pin a worker forever.
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        // Turn a handler panic into a 500 instead of dropping the connection.
        .layer(CatchPanicLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!("listening on http://{bind_addr}");
    // ConnectInfo gives handlers the peer address as a REMOTE_ADDR fallback for
    // IP logging when no X-Forwarded-For header is present.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;
    Ok(())
}

/// Liveness + readiness: the Docker healthcheck gates worker/beat/frontend on
/// this, so it must touch the DB — a backend that can't reach SQLite is not
/// healthy even if the process is up.
async fn health(State(state): State<AppState>) -> Response {
    match state
        .db
        .execute(Statement::from_string(DatabaseBackend::Sqlite, "SELECT 1"))
        .await
    {
        Ok(_) => Json(json!({ "status": "ok" })).into_response(),
        Err(e) => {
            tracing::error!("health check failed: database unreachable: {e}");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "status": "error", "detail": "database unavailable" })),
            )
                .into_response()
        }
    }
}

/// Resolve when the process receives Ctrl+C or (on Unix) SIGTERM — Docker sends
/// SIGTERM on `stop`. Lets axum drain in-flight requests before exiting so a
/// running job's lifecycle row isn't abandoned mid-write.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    tracing::info!("shutdown signal received; draining in-flight requests");
}
