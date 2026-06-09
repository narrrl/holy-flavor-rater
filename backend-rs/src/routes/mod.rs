pub mod admin;
pub mod auth;
pub mod banners;
pub mod categories;
pub mod flavors;
pub mod ratings;
pub mod replies;
pub mod social;
pub mod tickets;
pub mod users;

use axum::Router;

use crate::state::AppState;

/// All ported endpoints, mounted under `/api`. Paths carry DRF's trailing
/// slash; axum 0.8 does not auto-redirect, and the frontend calls with the
/// slash, so routes are declared with it explicitly.
pub fn api_router() -> Router<AppState> {
    Router::new()
        .merge(auth::router())
        .merge(categories::router())
        .merge(flavors::router())
        .merge(ratings::router())
        .merge(replies::router())
        .merge(users::router())
        .merge(social::router())
        .merge(tickets::router())
        .merge(banners::router())
        .merge(admin::router())
}
