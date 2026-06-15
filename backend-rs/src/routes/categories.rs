use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::{EntityTrait, PaginatorTrait, QueryOrder, QuerySelect};
use serde::Deserialize;

use crate::dto::CategoryOut;
use crate::entities::category;
use crate::entities::prelude::*;
use crate::error::{ApiError, ApiResult};
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::state::AppState;
use crate::web::RequestCtx;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/categories/", get(list))
        .route("/categories/{id}/", get(retrieve))
}

#[derive(Deserialize)]
struct PageParam {
    page: Option<String>,
}

fn to_dto(m: category::Model) -> CategoryOut {
    CategoryOut {
        id: m.id,
        name: m.name,
        slug: m.slug,
    }
}

/// GET /api/categories/ — paginated (DRF default), ordered by name.
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    Query(params): Query<PageParam>,
) -> ApiResult<Json<Paginated<CategoryOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;
    let count = Category::find().count(&state.db).await?;
    let models = Category::find()
        .order_by_asc(category::Column::Name)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;
    let results = models.into_iter().map(to_dto).collect();
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/categories/{id}/
async fn retrieve(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> ApiResult<Json<CategoryOut>> {
    Category::find_by_id(id)
        .one(&state.db)
        .await?
        .map(|m| Json(to_dto(m)))
        .ok_or(ApiError::NotFound)
}
