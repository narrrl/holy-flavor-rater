use sea_orm::entity::prelude::*;

/// Maps Django's `api_notification` (see `api/models/social.py`). Only `mention`
/// and `reply` rows are written by the ported endpoints; `recipient`/`actor`
/// are required, the per-object foreign keys are all nullable.
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "api_notification")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub is_read: bool,
    pub created_at: ChronoDateTime,
    pub actor_id: i32,
    pub rating_id: Option<i32>,
    pub recipient_id: i32,
    pub reply_id: Option<i32>,
    pub ticket_id: Option<i32>,
    #[sea_orm(column_type = "String(StringLen::N(20))")]
    pub notification_type: String,
    pub profile_comment_id: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
