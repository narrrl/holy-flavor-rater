use sea_orm::entity::prelude::*;

/// `api_job` — an execution log + schedule for the background jobs (formerly
/// Celery tasks driven by management commands). `next_run` is a stored column
/// in Django but derived in the serializer; we leave it mapped yet unused and
/// compute the served value from `last_run + interval_hours` (see routes/admin).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_job")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    pub status: String,
    pub last_run: Option<ChronoDateTime>,
    pub next_run: Option<ChronoDateTime>,
    pub interval_hours: i32,
    #[sea_orm(column_type = "Text")]
    pub last_output: String,
    #[sea_orm(column_type = "Text")]
    pub error_message: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
