use sea_orm::entity::prelude::*;

/// Maps Django's `api_ticketmessage` (messages within a support ticket).
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "api_ticketmessage")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub text: String,
    pub created_at: ChronoDateTime,
    pub ticket_id: i32,
    pub user_id: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
