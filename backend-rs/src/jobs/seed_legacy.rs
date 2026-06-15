//! Port of `seed_legacy_flavors` — upsert retired ("legacy") flavors from the
//! JSON dumps in the `legacy/` directory. Existing *active* (non-legacy) flavors
//! are left untouched; legacy rows are created or refreshed and always marked
//! unavailable.

use std::fs;
use std::path::Path;

use async_trait::async_trait;
use sea_orm::sea_query::{Expr, Func};
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::{json, Value};

use crate::entities::prelude::{Category, Flavor};
use crate::entities::{category, flavor};
use crate::state::AppState;

use super::download::{download_image, ext_for, hash_for, http_client};
use super::{slugify, BackgroundJob};

const PACK_KEYWORDS: &[&str] = &[
    "bundle", "set", "box", "probe", "sample", "taster", "shaker", "starter",
];

pub struct SeedLegacy;

#[async_trait]
impl BackgroundJob for SeedLegacy {
    fn name(&self) -> &'static str {
        "seed_legacy"
    }
    fn display_name(&self) -> &'static str {
        "Seed Legacy Data"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db = &state.db;
        let media_root = &state.config.media_root;
        let mut log: Vec<String> = Vec::new();

        // Categories, matched by name (Django get_or_create(name=...)).
        let energy = goc_category(db, "Energy", "energy").await?;
        let hydration = goc_category(db, "Hydration", "hydration").await?;
        let iced_tea = goc_category(db, "Iced Tea", "iced-tea").await?;
        let milkshake = goc_category(db, "Milkshake", "milkshake").await?;
        let packs = goc_category(db, "Packs and other", "packs-and-other").await?;

        let legacy_dir = &state.config.legacy_dir;
        if !Path::new(legacy_dir).exists() {
            log.push("Legacy directory not found.".to_string());
            return Ok(log.join("\n"));
        }

        let client = http_client();
        let mut processed = 0usize;

        for entry in fs::read_dir(legacy_dir)?.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let fname = path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or("")
                .to_lowercase();

            // Category from filename.
            let file_cat: Option<&category::Model> = if fname.contains("energy") {
                Some(&energy)
            } else if fname.contains("iced_tea") || fname.contains("iced-tea") {
                Some(&iced_tea)
            } else if fname.contains("hydration") {
                Some(&hydration)
            } else if fname.contains("milkshake") {
                Some(&milkshake)
            } else {
                None
            };

            let content = fs::read_to_string(&path)?;
            let items: Value = serde_json::from_str(&content)?;
            let Some(arr) = items.as_array() else {
                continue;
            };

            for data in arr {
                let Some(name) = data.get("Name").and_then(|v| v.as_str()) else {
                    continue;
                };
                let taste = pystr(data.get("Geschmack"));
                let desc = pystr(data.get("Beschreibung"));
                let status_text = pystr(data.get("Status"));
                let image_url = data.get("Bild_URL").and_then(|v| v.as_str());

                let full_desc =
                    format!("**Geschmack:** {taste}\n\n{desc}\n\n**Status:** {status_text}");

                // Final category: filename, else name/desc heuristics, else energy.
                let cat: &category::Model = file_cat.unwrap_or_else(|| {
                    let nl = name.to_lowercase();
                    let dl = desc.to_lowercase();
                    if nl.contains("hydration") || dl.contains("hydration") {
                        &hydration
                    } else if nl.contains("iced tea") || nl.contains("eistee") {
                        &iced_tea
                    } else if nl.contains("milkshake") {
                        &milkshake
                    } else if PACK_KEYWORDS.iter().any(|k| nl.contains(k)) {
                        &packs
                    } else {
                        &energy
                    }
                });

                // Existing flavor by case-insensitive name within the category.
                let existing = Flavor::find()
                    .filter(
                        Expr::expr(Func::lower(Expr::col(flavor::Column::Name)))
                            .eq(name.to_lowercase()),
                    )
                    .filter(flavor::Column::CategoryId.eq(cat.id))
                    .one(db)
                    .await?;

                if let Some(ref f) = existing {
                    if !f.is_legacy {
                        log.push(format!("Skipping active flavor: {name}"));
                        continue;
                    }
                }

                // Don't recreate a legacy flavor that has since been merged into a
                // (Shopify) flavor — the survivor carries this name as an alias.
                if existing.is_none() {
                    if let Some(owner) = alias_owner(db, name, cat.id).await? {
                        log.push(format!(
                            "Skipping '{name}' (superseded by '{}')",
                            owner.name
                        ));
                        continue;
                    }
                }

                // Resolve image first (so we can set local paths on insert).
                let mut local_paths: Option<Vec<String>> = None;
                if let Some(url) = image_url.filter(|s| !s.is_empty()) {
                    let rel = format!(
                        "flavors/legacy_{}/00_{}.{}",
                        slugify(name),
                        hash_for(url),
                        ext_for(url)
                    );
                    let abs = Path::new(media_root).join(&rel);
                    if download_image(&client, url, &abs).await {
                        local_paths = Some(vec![rel]);
                        log.push(format!("  -> Image for: {name}"));
                    }
                }
                let image_urls = match image_url.filter(|s| !s.is_empty()) {
                    Some(u) => json!([u]),
                    None => json!([]),
                };

                match existing {
                    Some(f) => {
                        log.push(format!("Updating legacy flavor: {name}"));
                        let main_in_local = match (&f.main_image_path, &local_paths) {
                            (Some(m), Some(lp)) => lp.contains(m),
                            _ => true,
                        };
                        let mut am: flavor::ActiveModel = f.into();
                        am.description = Set(full_desc);
                        am.is_available = Set(false);
                        if let Some(lp) = local_paths {
                            am.local_image_paths = Set(Some(json!(lp)));
                            if !main_in_local {
                                am.main_image_path = Set(None);
                            }
                        }
                        am.image_url = Set(image_url.map(String::from));
                        am.image_urls = Set(Some(image_urls));
                        am.update(db).await?;
                    }
                    None => {
                        log.push(format!("Adding new legacy flavor: {name}"));
                        flavor::ActiveModel {
                            name: Set(name.to_string()),
                            category_id: Set(cat.id),
                            is_legacy: Set(true),
                            external_id: Set(None),
                            description: Set(full_desc),
                            is_available: Set(false),
                            local_image_paths: Set(local_paths.map(|lp| json!(lp))),
                            image_url: Set(image_url.map(String::from)),
                            image_urls: Set(Some(image_urls)),
                            created_at: Set(crate::datetime::now_micros()),
                            ..Default::default()
                        }
                        .insert(db)
                        .await?;
                    }
                }
                processed += 1;
            }
        }

        log.push(format!("Finished! Processed {processed} legacy flavors."));
        Ok(log.join("\n"))
    }
}

/// Python `str(data.get(key))` semantics: missing/null becomes the literal
/// "None" (the f-string interpolation the Django command relied on).
fn pystr(v: Option<&Value>) -> String {
    match v.and_then(|x| x.as_str()) {
        Some(s) => s.to_string(),
        None => "None".to_string(),
    }
}

/// A flavor in `category_id` that lists `name` (case-insensitive) among its
/// merge aliases, if any. Used to suppress recreating a merged-away legacy row.
async fn alias_owner(
    db: &DatabaseConnection,
    name: &str,
    category_id: i32,
) -> anyhow::Result<Option<flavor::Model>> {
    let nl = name.to_lowercase();
    let candidates = Flavor::find()
        .filter(flavor::Column::CategoryId.eq(category_id))
        .filter(flavor::Column::Aliases.is_not_null())
        .all(db)
        .await?;
    Ok(candidates.into_iter().find(|f| {
        json_str_list(&f.aliases)
            .iter()
            .any(|a| a.to_lowercase() == nl)
    }))
}

/// Django JSONField (list) stored as TEXT → Vec<String>.
fn json_str_list(v: &Option<Value>) -> Vec<String> {
    match v {
        Some(Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(String::from))
            .collect(),
        _ => Vec::new(),
    }
}

async fn goc_category(
    db: &DatabaseConnection,
    name: &str,
    slug: &str,
) -> anyhow::Result<category::Model> {
    if let Some(c) = Category::find()
        .filter(category::Column::Name.eq(name))
        .one(db)
        .await?
    {
        return Ok(c);
    }
    Ok(category::ActiveModel {
        name: Set(name.to_string()),
        slug: Set(slug.to_string()),
        ..Default::default()
    }
    .insert(db)
    .await?)
}
