use sea_orm::entity::prelude::*;

/// Maps Django's `api_ticket` (support tickets).
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "api_ticket")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(column_type = "String(StringLen::N(200))")]
    pub subject: String,
    pub description: String,
    #[sea_orm(column_type = "String(StringLen::N(20))")]
    pub status: String,
    pub created_at: ChronoDateTime,
    pub updated_at: ChronoDateTime,
    pub user_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
