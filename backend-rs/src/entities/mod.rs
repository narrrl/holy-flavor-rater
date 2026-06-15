//! SeaORM entities mapped 1:1 onto Django's existing `api_*` tables.
//!
//! Column names and types mirror Django's schema exactly — both backends read
//! and write the same SQLite file during the strangler migration, so drift here
//! corrupts data. When adding a field, confirm it against the live table with
//! `PRAGMA table_info(api_<name>)`.

pub mod banner;
pub mod category;
pub mod flavor;
pub mod job;
pub mod notification;
pub mod profile_comment;
pub mod rating;
pub mod reply;
pub mod system_config;
pub mod ticket;
pub mod ticket_message;
pub mod user;
pub mod user_ip;

pub mod prelude {
    pub use super::banner::Entity as Banner;
    pub use super::category::Entity as Category;
    pub use super::flavor::Entity as Flavor;
    pub use super::job::Entity as Job;
    pub use super::notification::Entity as Notification;
    pub use super::profile_comment::Entity as ProfileComment;
    pub use super::rating::Entity as Rating;
    pub use super::reply::Entity as Reply;
    pub use super::system_config::Entity as SystemConfig;
    pub use super::ticket::Entity as Ticket;
    pub use super::ticket_message::Entity as TicketMessage;
    pub use super::user::Entity as User;
    pub use super::user_ip::Entity as UserIp;
}
