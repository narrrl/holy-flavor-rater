use sea_orm::entity::prelude::*;

/// `api_systemconfig` — singleton (pk always 1) of UI-editable app settings.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_systemconfig")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub site_name: String,
    pub maintenance_mode: bool,
    pub allow_new_signups: bool,
    pub require_email_verification: bool,
    pub updated_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
