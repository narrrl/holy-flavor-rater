use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_banner")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub slug: String,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    pub is_active: bool,
    pub is_enabled: bool,
    #[sea_orm(column_type = "Json")]
    pub settings: Json,
    #[sea_orm(column_type = "Json")]
    pub schema: Json,
    pub created_at: ChronoDateTime,
    pub updated_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
