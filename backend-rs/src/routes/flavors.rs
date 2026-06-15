use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::{Json, Router};
use sea_orm::sea_query::{Expr, Func, Order};
use sea_orm::{
    ColumnTrait, Condition, EntityTrait, JoinType, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, RelationTrait,
};
use serde::Deserialize;

use crate::auth::{AuthUser, OptionalUser};
use crate::dto::{FlavorOut, SearchHit};
use crate::entities::prelude::*;
use crate::entities::{category, flavor, rating};
use crate::error::{ApiError, ApiResult};
use crate::media::image_field_url;
use crate::pagination::{parse_page, Paginated, DEFAULT_PAGE_SIZE};
use crate::search::{extract_category_slug, query_words, score_relevance};
use crate::service::build_flavors;
use crate::state::AppState;
use crate::web::RequestCtx;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/flavors/", get(list))
        .route("/flavors/search/", get(search))
        .route("/flavors/top/", get(top))
        .route("/flavors/newest/", get(newest))
        .route("/flavors/followed_top/", get(followed_top))
        .route("/flavors/{id}/", get(retrieve))
}

#[derive(Deserialize)]
struct ListParams {
    page: Option<String>,
    category: Option<i32>,
    #[serde(rename = "category__slug")]
    category_slug: Option<String>,
    search: Option<String>,
}

/// `AVG(api_rating.score)` expression for ordering by average rating.
fn avg_score_expr() -> sea_orm::sea_query::SimpleExpr {
    Func::avg(Expr::col((rating::Entity, rating::Column::Score))).into()
}

/// GET /api/flavors/ — paginated, ordered by -average_rating.
async fn list(
    State(state): State<AppState>,
    ctx: RequestCtx,
    OptionalUser(viewer): OptionalUser,
    Query(params): Query<ListParams>,
) -> ApiResult<Json<Paginated<FlavorOut>>> {
    let page = parse_page(params.page.as_deref());
    let size = DEFAULT_PAGE_SIZE;

    // Category slug can also come embedded in the search query (get_queryset).
    let (slug_from_search, _remaining) = params
        .search
        .as_deref()
        .map(extract_category_slug)
        .unwrap_or((None, String::new()));

    let mut q = Flavor::find();

    if let Some(cat) = params.category {
        q = q.filter(flavor::Column::CategoryId.eq(cat));
    }
    let slug = params.category_slug.clone().or(slug_from_search);
    if let Some(slug) = slug {
        q = q
            .join(JoinType::InnerJoin, flavor::Relation::Category.def())
            .filter(category::Column::Slug.eq(slug));
    }
    if let Some(search) = params.search.as_deref() {
        let (_, remaining) = extract_category_slug(search);
        let mut cond = Condition::any();
        let mut has = false;
        for w in query_words(&remaining) {
            let like = format!("%{w}%");
            cond = cond
                .add(flavor::Column::Name.like(&like))
                .add(flavor::Column::Description.like(&like));
            has = true;
        }
        if has {
            q = q.filter(cond);
        }
    }

    let count = q.clone().count(&state.db).await?;

    let models = q
        .join(JoinType::LeftJoin, flavor::Relation::Rating.def())
        .group_by(flavor::Column::Id)
        .order_by(avg_score_expr(), Order::Desc)
        .limit(size)
        .offset((page - 1) * size)
        .all(&state.db)
        .await?;

    let results = build_flavors(&state, &ctx, models, viewer, &[], false).await?;
    Ok(Json(Paginated::build(&ctx, results, count, page, size)))
}

/// GET /api/flavors/{id}/
async fn retrieve(
    State(state): State<AppState>,
    ctx: RequestCtx,
    OptionalUser(viewer): OptionalUser,
    Path(id): Path<i32>,
) -> ApiResult<Json<FlavorOut>> {
    let model = Flavor::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut dtos = build_flavors(&state, &ctx, vec![model], viewer, &[], true).await?;
    dtos.pop().map(Json).ok_or(ApiError::NotFound)
}

#[derive(Deserialize)]
struct CategoryParam {
    category: Option<String>,
}

/// GET /api/flavors/top/ — top 10 flavors that have ratings.
async fn top(
    State(state): State<AppState>,
    ctx: RequestCtx,
    OptionalUser(viewer): OptionalUser,
    Query(params): Query<CategoryParam>,
) -> ApiResult<Json<Vec<FlavorOut>>> {
    let mut q = Flavor::find().join(JoinType::InnerJoin, flavor::Relation::Rating.def());
    if let Some(slug) = params.category {
        q = q
            .join(JoinType::InnerJoin, flavor::Relation::Category.def())
            .filter(category::Column::Slug.eq(slug));
    }
    let models = q
        .group_by(flavor::Column::Id)
        .order_by(avg_score_expr(), Order::Desc)
        .limit(10)
        .all(&state.db)
        .await?;
    Ok(Json(
        build_flavors(&state, &ctx, models, viewer, &[], false).await?,
    ))
}

/// GET /api/flavors/newest/ — 10 most recently created flavors.
async fn newest(
    State(state): State<AppState>,
    ctx: RequestCtx,
    OptionalUser(viewer): OptionalUser,
) -> ApiResult<Json<Vec<FlavorOut>>> {
    let models = Flavor::find()
        .order_by_desc(flavor::Column::CreatedAt)
        .limit(10)
        .all(&state.db)
        .await?;
    Ok(Json(
        build_flavors(&state, &ctx, models, viewer, &[], false).await?,
    ))
}

/// GET /api/flavors/followed_top/ — top 10 among flavors rated by people the
/// caller follows. Requires authentication.
async fn followed_top(
    State(state): State<AppState>,
    ctx: RequestCtx,
    AuthUser(uid): AuthUser,
) -> ApiResult<Json<Vec<FlavorOut>>> {
    // Followed user ids from the m2m table api_user_following(from_user_id, to_user_id).
    use sea_orm::{ConnectionTrait, Statement};
    let stmt = Statement::from_sql_and_values(
        state.db.get_database_backend(),
        "SELECT to_user_id FROM api_user_following WHERE from_user_id = ?",
        [uid.into()],
    );
    let rows = state.db.query_all(stmt).await?;
    let followed: Vec<i32> = rows
        .iter()
        .filter_map(|r| r.try_get::<i32>("", "to_user_id").ok())
        .collect();
    if followed.is_empty() {
        return Ok(Json(Vec::new()));
    }
    let models = Flavor::find()
        .join(JoinType::InnerJoin, flavor::Relation::Rating.def())
        .filter(rating::Column::UserId.is_in(followed))
        .group_by(flavor::Column::Id)
        .order_by(avg_score_expr(), Order::Desc)
        .limit(10)
        .all(&state.db)
        .await?;
    Ok(Json(
        build_flavors(&state, &ctx, models, Some(uid), &[], false).await?,
    ))
}

#[derive(Deserialize)]
struct SearchParam {
    q: Option<String>,
}

/// GET /api/flavors/search/?q= — up to 15 ranked lightweight hits.
async fn search(
    State(state): State<AppState>,
    ctx: RequestCtx,
    Query(params): Query<SearchParam>,
) -> ApiResult<Json<Vec<SearchHit>>> {
    let media = &state.config.media_url;
    let query = params.q.unwrap_or_default().to_lowercase();
    let query = query.trim();
    if query.is_empty() {
        return Ok(Json(Vec::new()));
    }
    let (slug, remaining) = extract_category_slug(query);

    // find_also_related(Category) adds the join; don't add a second one.
    let mut q = Flavor::find();
    if let Some(slug) = slug {
        q = q.filter(category::Column::Slug.eq(slug));
    }
    let words = query_words(&remaining);
    if !words.is_empty() {
        let mut cond = Condition::any();
        for w in &words {
            let like = format!("%{w}%");
            cond = cond
                .add(flavor::Column::Name.like(&like))
                .add(flavor::Column::Description.like(&like));
        }
        q = q.filter(cond);
    }

    // (flavor, category) joined load, ordered by name.
    let rows = q
        .order_by_asc(flavor::Column::Name)
        .find_also_related(Category)
        .all(&state.db)
        .await?;

    let mut seen = std::collections::HashSet::new();
    let mut hits: Vec<(i32, SearchHit)> = Vec::new();
    for (f, cat) in rows {
        let cat = match cat {
            Some(c) => c,
            None => continue,
        };
        let key = format!("{}|{}", f.name.trim().to_lowercase(), cat.slug);
        if !seen.insert(key) {
            continue;
        }
        let image_url = if let Some(img) = f.image.as_deref().filter(|s| !s.is_empty()) {
            Some(image_field_url(&ctx, media, img))
        } else {
            f.image_url.clone()
        };
        let relevance = score_relevance(&f.name, &remaining);
        hits.push((
            relevance,
            SearchHit {
                id: f.id,
                name: f.name,
                kind: "flavor".to_string(),
                subtitle: cat.name,
                image_url,
                slug: None,
            },
        ));
    }
    // Sort by -relevance, then name.
    hits.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.name.cmp(&b.1.name)));
    let out: Vec<SearchHit> = hits.into_iter().take(15).map(|(_, h)| h).collect();
    Ok(Json(out))
}
