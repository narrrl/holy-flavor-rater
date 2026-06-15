//! Output DTOs mirroring the DRF serializers field-for-field (names + order).
//! `image` is write-only in DRF, so it is intentionally absent here.

use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct CategoryOut {
    pub id: i32,
    pub name: String,
    pub slug: String,
}

#[derive(Serialize, ToSchema)]
pub struct ReplyOut {
    pub id: i32,
    /// StringRelatedField → username.
    pub user: String,
    pub rating: i32,
    pub text: String,
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct RatingOut {
    pub id: i32,
    pub user: String,
    pub user_id: i32,
    pub user_avatar: Option<String>,
    pub flavor: i32,
    pub flavor_name: String,
    pub flavor_image: Option<String>,
    pub category_name: String,
    pub category_slug: String,
    pub is_available: bool,
    pub is_legacy: bool,
    pub score: i32,
    pub comment: Option<String>,
    pub created_at: String,
    pub replies: Vec<ReplyOut>,
}

#[derive(Serialize, ToSchema)]
pub struct FlavorOut {
    pub id: i32,
    pub name: String,
    pub category: i32,
    pub category_name: String,
    pub category_slug: String,
    pub description: String,
    pub average_rating: Option<f64>,
    pub followed_average_rating: Option<f64>,
    pub user_rating: Option<i32>,
    pub ratings: Vec<RatingOut>,
    pub image_url: Option<String>,
    pub image_urls: Vec<String>,
    pub is_available: bool,
    pub is_legacy: bool,
    pub shop_url: Option<String>,
    /// Keys "1".."10" → count. BTreeMap keeps stable ordering.
    pub rating_distribution: BTreeMap<String, i64>,
}

/// Search-action result item (FlavorViewSet.search).
#[derive(Serialize, ToSchema)]
pub struct SearchHit {
    pub id: i32,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub subtitle: String,
    pub image_url: Option<String>,
    pub slug: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct UserOut {
    pub id: i32,
    pub username: String,
    pub email: String,
    pub theme: String,
    pub language: String,
    pub drawer_anchor: String,
    pub avatar: Option<String>,
    pub following_count: i64,
    pub followers_count: i64,
    pub is_following: bool,
    pub unread_notifications_count: i64,
    pub is_superuser: bool,
    pub selected_banner: Option<i32>,
    pub selected_banner_slug: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ProfileCommentOut {
    pub id: i32,
    pub author_username: String,
    pub author_avatar: Option<String>,
    pub text: String,
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct NotificationOut {
    pub id: i32,
    pub actor_username: String,
    pub actor_avatar: Option<String>,
    pub notification_type: String,
    pub rating: Option<i32>,
    pub reply: Option<i32>,
    pub ticket: Option<i32>,
    pub profile_comment: Option<i32>,
    pub profile_owner_username: Option<String>,
    pub is_read: bool,
    pub created_at: String,
    pub flavor_name: Option<String>,
    pub flavor_id: Option<i32>,
}

#[derive(Serialize, ToSchema)]
pub struct TicketMessageOut {
    pub id: i32,
    pub username: String,
    pub text: String,
    pub created_at: String,
    pub is_admin: bool,
}

#[derive(Serialize, ToSchema)]
pub struct TicketOut {
    pub id: i32,
    pub user: i32,
    pub username: String,
    pub user_email: String,
    pub user_avatar: Option<String>,
    pub subject: String,
    pub description: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<TicketMessageOut>,
}

/// Custom payload of the `users/profile/<username>` action (not a serializer).
#[derive(Serialize, ToSchema)]
pub struct PublicProfileOut {
    pub id: i32,
    pub username: String,
    pub theme: String,
    pub avatar: Option<String>,
    pub following_count: i64,
    pub followers_count: i64,
    pub is_following: bool,
    pub ratings: Vec<RatingOut>,
    pub comments: Vec<ProfileCommentOut>,
    pub followers: Vec<UserOut>,
    pub following: Vec<UserOut>,
}

/// The user's most-rated category.
#[derive(Serialize, ToSchema)]
pub struct FavoriteCategory {
    pub name: String,
    pub slug: String,
    pub count: i64,
}

/// Aggregate stats over the current user's own ratings, surfaced on the dashboard.
#[derive(Serialize, ToSchema)]
pub struct DashboardStats {
    /// Mean of the scores the user has given (`None` when they have no ratings).
    pub average_score: Option<f64>,
    /// Count of the user's ratings per score, keyed `"1".."10"` (always all 10 keys).
    pub score_distribution: std::collections::BTreeMap<String, i64>,
    /// The category the user has rated most (`None` when they have no ratings).
    pub favorite_category: Option<FavoriteCategory>,
    /// Ratings the user created in the current calendar month (UTC).
    pub ratings_this_month: i64,
    /// Number of distinct categories the user has rated in.
    pub category_count: i64,
}

/// Custom payload of the `users/dashboard` action.
#[derive(Serialize, ToSchema)]
pub struct DashboardOut {
    pub user: UserOut,
    pub rated_count: i64,
    pub missing_count: i64,
    pub my_ratings: Vec<RatingOut>,
    pub stats: DashboardStats,
}

/// One recommended flavor (card payload + the recommendation metadata). Mirrors the
/// fields the frontend flavor card reads, plus the prediction + reason.
#[derive(Serialize, ToSchema)]
pub struct RecommendationOut {
    pub id: i32,
    pub name: String,
    pub image_url: Option<String>,
    pub category_name: String,
    pub category_slug: String,
    pub average_rating: Option<f64>,
    pub is_legacy: bool,
    pub is_available: bool,
    /// Predicted score for this user (CF) or the flavor's damped community score
    /// (popularity fallback).
    pub predicted_score: f64,
    /// "N tasters like you" count (CF) or the flavor's rating count (popularity).
    pub contributing_neighbours: i64,
    /// `"cf"` or `"popular"` — frontend picks the reason copy. Names are never
    /// surfaced (privacy decision).
    pub reason: String,
}

/// Item-based "people who liked this flavor also liked…" card, served on
/// `GET /api/flavors/{id}/similar/`. Flavor card fields plus the similarity metadata.
#[derive(Serialize, ToSchema)]
pub struct SimilarFlavorOut {
    pub id: i32,
    pub name: String,
    pub image_url: Option<String>,
    pub category_name: String,
    pub category_slug: String,
    pub average_rating: Option<f64>,
    pub is_legacy: bool,
    pub is_available: bool,
    /// Adjusted-cosine similarity to the target flavor, in (0, 1].
    pub similarity: f64,
    /// Users who rated both this flavor and the target (the confidence count).
    pub co_raters: i64,
}

#[derive(Serialize, ToSchema)]
pub struct BannerOut {
    pub id: i32,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub is_active: bool,
    pub is_enabled: bool,
    pub settings: Value,
    pub schema: Value,
    pub created_at: String,
    pub updated_at: String,
}
