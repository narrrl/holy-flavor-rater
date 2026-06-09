use utoipa::OpenApi;

use crate::dto::{BannerOut, CategoryOut, FlavorOut, RatingOut, ReplyOut, SearchHit};

/// OpenAPI document. Component schemas are registered; per-path operation specs
/// will be added with `#[utoipa::path]` as handlers stabilize.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Holy Flavor Rater (Rust)",
        description = "Strangler-migration Rust backend. Read endpoints ported first; the rest remain on Django.",
        version = "0.1.0"
    ),
    components(schemas(CategoryOut, FlavorOut, RatingOut, ReplyOut, BannerOut, SearchHit))
)]
pub struct ApiDoc;
