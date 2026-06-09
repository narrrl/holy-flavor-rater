use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "api_rating")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub flavor_id: i32,
    pub score: i32,
    #[sea_orm(column_type = "Text", nullable)]
    pub comment: Option<String>,
    pub created_at: ChronoDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::flavor::Entity",
        from = "Column::FlavorId",
        to = "super::flavor::Column::Id"
    )]
    Flavor,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(has_many = "super::reply::Entity")]
    Reply,
}

impl Related<super::flavor::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Flavor.def()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::reply::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reply.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
