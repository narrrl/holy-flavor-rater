//! Lightweight emoji reactions on ratings. No Django equivalent — this table is
//! owned by the Rust backend (created in `db::ensure_schema`). One row per
//! (user, rating, kind); the UNIQUE constraint makes a re-react a no-op.
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "rating_reaction")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub rating_id: i32,
    pub kind: String,
    pub created_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::rating::Entity",
        from = "Column::RatingId",
        to = "super::rating::Column::Id"
    )]
    Rating,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::rating::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rating.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
