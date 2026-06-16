//! Community activity feed (`GET /api/activity/`). A unified, time-sorted stream
//! of new-flavor drops + rating milestones, so the Community page stays alive even
//! when a user's follow graph is quiet. AllowAny; no Django counterpart.

use axum::extract::{Query, State};
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;

use crate::dto::ActivityOut;
use crate::error::ApiResult;
use crate::pagination::{parse_page, Paginated};
use crate::service::build_activity;
use crate::state::AppState;
use crate::web::RequestCtx;

const ACTIVITY_PAGE_SIZE: u64 = 10;

#[derive(Deserialize)]
struct PageParam {
    page: Option<String>,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/activity/", get(activity))
}

/// GET /api/activity/ — paginated activity stream, newest first.
async fn activity(
    State(state): State<AppState>,
    ctx: RequestCtx,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<ActivityOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = ACTIVITY_PAGE_SIZE;

    // The candidate set is bounded (recent drops + milestone flavors), so build
    // the full sorted list once and slice the page in memory.
    let all = build_activity(&state, &ctx).await?;
    let count = all.len() as u64;
    let start = ((page - 1) * size) as usize;
    let items: Vec<ActivityOut> = all.into_iter().skip(start).take(size as usize).collect();
    Ok(Json(Paginated::build(&ctx, items, count, page, size)))
}
