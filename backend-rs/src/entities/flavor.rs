use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_flavor")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub category_id: i32,
    pub name: String,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    pub image_url: Option<String>,
    /// Django JSONField (default list), stored as TEXT.
    #[sea_orm(column_type = "Json")]
    pub image_urls: Option<Json>,
    pub image: Option<String>,
    /// Django JSONField (default list), stored as TEXT.
    #[sea_orm(column_type = "Json")]
    pub local_image_paths: Option<Json>,
    pub main_image_path: Option<String>,
    pub shop_url: Option<String>,
    pub is_available: bool,
    pub is_legacy: bool,
    pub external_id: Option<i64>,
    /// Alternate names this flavor is known by — populated when another flavor
    /// (typically a legacy stand-in) is merged into this one. JSON list of
    /// strings, stored as TEXT. Lets `seed_legacy` avoid re-creating a merged-away
    /// legacy flavor and lets search match its old name. Added by the guarded
    /// startup migration in `db.rs`; may be NULL on rows predating it.
    #[sea_orm(column_type = "Json", nullable)]
    pub aliases: Option<Json>,
    /// Django stores naive UTC text ("YYYY-MM-DD HH:MM:SS.ffffff"); we treat it
    /// as UTC when formatting to DRF's ISO-8601 `...Z` output.
    pub created_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::category::Entity",
        from = "Column::CategoryId",
        to = "super::category::Column::Id"
    )]
    Category,
    #[sea_orm(has_many = "super::rating::Entity")]
    Rating,
}

impl Related<super::category::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Category.def()
    }
}

impl Related<super::rating::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rating.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
