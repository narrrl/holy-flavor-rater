use sea_orm::entity::prelude::*;

/// Maps Django's `api_profilecomment` (comments left on a user's profile).
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "api_profilecomment")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub text: String,
    pub created_at: ChronoDateTime,
    pub author_id: i32,
    pub profile_owner_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
