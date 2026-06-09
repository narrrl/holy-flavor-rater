use sea_orm::entity::prelude::*;

/// Subset of Django's `api_user` (AbstractUser + custom fields). Only the
/// columns the Rust endpoints currently read are mapped; add more as endpoints
/// are ported. `password` is intentionally included so auth can be ported later
/// (Django PBKDF2 verification), but is never serialized.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_user")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub password: String,
    pub last_login: Option<ChronoDateTime>,
    pub is_superuser: bool,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub is_staff: bool,
    pub is_active: bool,
    pub date_joined: ChronoDateTime,
    pub theme: String,
    pub email_confirmation_code: Option<String>,
    pub pending_email: Option<String>,
    pub avatar: Option<String>,
    pub language: String,
    pub selected_banner_id: Option<i32>,
    pub drawer_anchor: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::rating::Entity")]
    Rating,
}

impl Related<super::rating::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rating.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
