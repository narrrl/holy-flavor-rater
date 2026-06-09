use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::Deserialize;

use crate::auth::OptionalUser;
use crate::dto::BannerOut;
use crate::entities::prelude::*;
use crate::entities::{banner, user};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/banners/", get(list))
        .route("/banners/active/", get(active))
        .route("/banners/{id}/", get(retrieve))
}

fn to_dto(m: banner::Model) -> BannerOut {
    BannerOut {
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        is_active: m.is_active,
        is_enabled: m.is_enabled,
        settings: m.settings,
        schema: m.schema,
        created_at: crate::datetime::drf_iso(&m.created_at),
        updated_at: crate::datetime::drf_iso(&m.updated_at),
    }
}

async fn is_superuser(state: &AppState, viewer: Option<i32>) -> ApiResult<bool> {
    if let Some(uid) = viewer {
        if let Some(u) = User::find_by_id(uid).one(&state.db).await? {
            return Ok(u.is_superuser);
        }
    }
    Ok(false)
}

/// GET /api/banners/ — unpaginated. Non-superusers see only enabled banners.
async fn list(
    State(state): State<AppState>,
    OptionalUser(viewer): OptionalUser,
) -> ApiResult<Json<Vec<BannerOut>>> {
    let q = Banner::find();
    let models = if is_superuser(&state, viewer).await? {
        q.all(&state.db).await?
    } else {
        q.filter(banner::Column::IsEnabled.eq(true))
            .all(&state.db)
            .await?
    };
    Ok(Json(models.into_iter().map(to_dto).collect()))
}

/// GET /api/banners/{id}/
async fn retrieve(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> ApiResult<Json<BannerOut>> {
    Banner::find_by_id(id)
        .one(&state.db)
        .await?
        .map(|m| Json(to_dto(m)))
        .ok_or(ApiError::NotFound)
}

#[derive(Deserialize)]
struct ActiveParam {
    username: Option<String>,
}

/// GET /api/banners/active/ — the viewer's (or named user's) selected banner if
/// enabled, else the global default, else null.
async fn active(
    State(state): State<AppState>,
    OptionalUser(viewer): OptionalUser,
    Query(params): Query<ActiveParam>,
) -> ApiResult<Json<Option<BannerOut>>> {
    let mut target: Option<user::Model> = None;
    if let Some(username) = params.username {
        target = User::find()
            .filter(user::Column::Username.eq(username))
            .one(&state.db)
            .await?;
    }
    if target.is_none() {
        if let Some(uid) = viewer {
            target = User::find_by_id(uid).one(&state.db).await?;
        }
    }

    if let Some(u) = target {
        if let Some(bid) = u.selected_banner_id {
            if let Some(b) = Banner::find_by_id(bid).one(&state.db).await? {
                if b.is_enabled {
                    return Ok(Json(Some(to_dto(b))));
                }
            }
        }
    }

    let active = Banner::find()
        .filter(banner::Column::IsActive.eq(true))
        .one(&state.db)
        .await?;
    Ok(Json(active.map(to_dto)))
}
