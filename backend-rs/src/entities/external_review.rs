//! Shop reviews ingested from an external review platform (currently reviews.io)
//! by the `sync_reviews` job. No Django equivalent — this table is owned by the
//! Rust backend (created in `db::ensure_schema`).
//!
//! Privacy: this is deliberately *not* a copy of the upstream review. The author
//! name, city and review body present in the upstream payload are dropped at
//! ingest; `reviewer_key` is a salted SHA-256 of the upstream reviewer id, kept
//! only so the recommender can tell "the same anonymous buyer rated these two
//! flavors" apart from two unrelated buyers.
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "external_review")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// Upstream platform slug, e.g. `"reviews_io"`. Namespaces `external_id`.
    pub source: String,
    /// Upstream review id, unique per `source` — the incremental-sync stop marker.
    pub external_id: String,
    /// Salted hash of the upstream reviewer id (never the id itself).
    pub reviewer_key: String,
    pub flavor_id: i32,
    /// Upstream star rating on its native 1–5 scale, stored unscaled.
    pub rating: i32,
    /// When the review was written upstream.
    pub reviewed_at: ChronoDateTime,
    /// When we ingested it.
    pub created_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::flavor::Entity",
        from = "Column::FlavorId",
        to = "super::flavor::Column::Id"
    )]
    Flavor,
}

impl Related<super::flavor::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Flavor.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
