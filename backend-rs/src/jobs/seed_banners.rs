//! Port of `seed_banners` — load/sync banner configs from `banners/*.json`.
//!
//! Parity with Django's `Banner.save()` invariant: at most one active banner,
//! and if none is active the saved banner becomes active. New banners take their
//! `settings` from JSON but schema stays empty on first create (Django only
//! syncs `schema` on the update path); subsequent runs backfill it.

use std::fs;

use async_trait::async_trait;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
};
use serde_json::{json, Value};

use crate::entities::banner;
use crate::entities::prelude::Banner;
use crate::state::AppState;

use super::BackgroundJob;

pub struct SeedBanners;

#[async_trait]
impl BackgroundJob for SeedBanners {
    fn name(&self) -> &'static str {
        "seed_banners"
    }
    fn display_name(&self) -> &'static str {
        "Seed Banner Configurations"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db = &state.db;
        let dir = &state.config.banners_dir;
        let mut log: Vec<String> = Vec::new();

        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => {
                log.push(format!("Banners directory not found at {dir}"));
                return Ok(log.join("\n"));
            }
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let filename = path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or("")
                .to_string();
            if let Err(e) = sync_one(db, &path, &mut log).await {
                log.push(format!("Failed to sync banner from {filename}: {e}"));
            }
        }
        Ok(log.join("\n"))
    }
}

async fn sync_one(
    db: &DatabaseConnection,
    path: &std::path::Path,
    log: &mut Vec<String>,
) -> anyhow::Result<()> {
    let filename = path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("")
        .to_string();
    let content = fs::read_to_string(path)?;
    let data: Value = serde_json::from_str(&content)?;

    let Some(slug) = data.get("slug").and_then(|v| v.as_str()) else {
        return Ok(());
    };

    let existing = Banner::find()
        .filter(banner::Column::Slug.eq(slug))
        .one(db)
        .await?;

    match existing {
        None => {
            let name = data
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or(slug)
                .to_string();
            let description = data
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let settings = data.get("settings").cloned().unwrap_or_else(|| json!({}));
            // Mirror Banner.save(): become active when no other banner is active.
            let no_active = active_count(db, None).await? == 0;
            banner::ActiveModel {
                name: Set(name),
                slug: Set(slug.to_string()),
                description: Set(description),
                settings: Set(settings),
                schema: Set(json!([])),
                is_enabled: Set(true),
                is_active: Set(no_active),
                created_at: Set(crate::datetime::now_micros()),
                updated_at: Set(crate::datetime::now_micros()),
                ..Default::default()
            }
            .insert(db)
            .await?;
            log.push(format!("Created new banner '{slug}' from {filename}"));
        }
        Some(banner) => {
            let json_settings = data.get("settings").cloned().unwrap_or_else(|| json!({}));
            let json_schema = data.get("schema").cloned().unwrap_or_else(|| json!([]));

            let mut db_settings = banner.settings.as_object().cloned().unwrap_or_default();
            let mut updated = false;

            if let Some(obj) = json_settings.as_object() {
                for (k, v) in obj {
                    if !db_settings.contains_key(k) {
                        db_settings.insert(k.clone(), v.clone());
                        updated = true;
                    }
                }
            }
            let schema_changed = banner.schema != json_schema;
            if schema_changed {
                updated = true;
            }

            if updated {
                let pk = banner.id;
                let was_active = banner.is_active;
                let mut am: banner::ActiveModel = banner.into();
                am.settings = Set(Value::Object(db_settings));
                am.schema = Set(json_schema);
                am.updated_at = Set(crate::datetime::now_micros());
                // Banner.save() invariant on every save.
                if was_active {
                    Banner::update_many()
                        .col_expr(
                            banner::Column::IsActive,
                            sea_orm::sea_query::Expr::value(false),
                        )
                        .filter(banner::Column::IsActive.eq(true))
                        .filter(banner::Column::Id.ne(pk))
                        .exec(db)
                        .await?;
                } else if active_count(db, Some(pk)).await? == 0 {
                    am.is_active = Set(true);
                }
                am.update(db).await?;
                log.push(format!(
                    "Synced new settings for banner '{slug}' from {filename}"
                ));
            }
        }
    }
    Ok(())
}

/// Count active banners, optionally excluding one pk.
async fn active_count(db: &DatabaseConnection, exclude: Option<i32>) -> anyhow::Result<u64> {
    let mut q = Banner::find().filter(banner::Column::IsActive.eq(true));
    if let Some(pk) = exclude {
        q = q.filter(banner::Column::Id.ne(pk));
    }
    Ok(q.count(db).await?)
}
