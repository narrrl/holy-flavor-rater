//! Port of `sync_flavors` — pull the Holy Energy Shopify catalog and upsert
//! flavors, categories and product images. Mirrors the Django command's
//! category resolution, the Syrup-bundle variant expansion special case, and the
//! "mark missing products unavailable" pass. Data-format parity matters: both
//! backends write the same shared SQLite + media files.

use std::collections::HashMap;
use std::path::Path;

use async_trait::async_trait;
use futures::StreamExt;
use sea_orm::sea_query::{Expr, Func};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
};
use serde_json::{json, Value};

use crate::entities::prelude::{Category, Flavor};
use crate::entities::{category, flavor};
use crate::state::AppState;

use super::download::{download_image, ext_for, hash_for, http_client};
use super::{slugify, BackgroundJob};

const PRODUCTS_URL: &str = "https://weareholy.com/products.json?limit=250";
const DOWNLOAD_WORKERS: usize = 8;
const PACKS_SLUG: &str = "packs-and-other";
const PACKS_NAME: &str = "Packs and other";

const FORM_WORDS: &[&str] =
    &["bundle", "sachet", "sachetbox", "bottle", "box", "pack", "set", "sachets"];
const NON_FLAVOR_TOKENS: &[&str] = &[
    "value", "shaker", "merch", "sticker", "packaging", "material", "other", "items", "mixed",
    "collector", "collector's", "free", "products", "naturalrabatt", "sample", "samplebox",
];
const PACK_TITLE_KEYWORDS: &[&str] = &[
    "bundle", "set", "box", "probe", "sample", "taster", "starter", "collection", "probier",
];
const ACCESSORY_TITLE_KEYWORDS: &[&str] = &["bürste", "reinigung", "ersatzteil", "zubehör"];
const TAG_FAMILY: &[(&[&str], &str)] = &[
    (&["holy energy", "energy"], "Energy"),
    (&["holy hydration", "hydration"], "Hydration"),
    (&["holy iced tea", "iced tea"], "Iced Tea"),
    (&["milkshake"], "Milkshake"),
];

pub struct SyncFlavors;

#[async_trait]
impl BackgroundJob for SyncFlavors {
    fn name(&self) -> &'static str {
        "sync_flavors"
    }
    fn display_name(&self) -> &'static str {
        "Sync Holy Flavors"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db = &state.db;
        let media_root = &state.config.media_root;
        let client = http_client();
        let mut log: Vec<String> = Vec::new();
        log.push(format!("Fetching from {PRODUCTS_URL}..."));

        // Fetch failures are reported in the output but do not fail the job
        // (Django's command caught the error and returned).
        let data: Value = match client.get(PRODUCTS_URL).send().await {
            Ok(resp) => match resp.error_for_status() {
                Ok(resp) => match resp.json().await {
                    Ok(v) => v,
                    Err(e) => {
                        log.push(format!("Failed to fetch data: {e}"));
                        return Ok(log.join("\n"));
                    }
                },
                Err(e) => {
                    log.push(format!("Failed to fetch data: {e}"));
                    return Ok(log.join("\n"));
                }
            },
            Err(e) => {
                log.push(format!("Failed to fetch data: {e}"));
                return Ok(log.join("\n"));
            }
        };

        let products = data.get("products").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        log.push(format!("Found {} products.", products.len()));

        let packs = goc_category_by_slug_named(db, PACKS_SLUG, PACKS_NAME).await?;

        let mut created = 0usize;
        let mut updated = 0usize;
        let mut synced_ids: Vec<i64> = Vec::new();

        for p in &products {
            let title = p.get("title").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            let tags = parse_tags(p);
            let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();
            let title_lower = title.to_lowercase();

            // Syrup ships as one article whose variants are the flavors.
            if is_syrup_variant_product(p) {
                let (c, u) = sync_syrup_variants(db, &client, media_root, p, &mut synced_ids).await?;
                created += c;
                updated += u;
                continue;
            }

            let Some(cat) =
                resolve_category(db, p, &title_lower, &tags_lower, &packs).await?
            else {
                continue;
            };

            let variants = p.get("variants").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let is_available = variants.iter().any(|v| v.get("available").and_then(|a| a.as_bool()).unwrap_or(false));
            let images = p.get("images").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let image_url = images.first().and_then(|i| i.get("src")).and_then(|s| s.as_str()).map(String::from);
            let image_urls: Vec<String> =
                images.iter().filter_map(|i| i.get("src").and_then(|s| s.as_str()).map(String::from)).collect();
            let description = clean_html(p.get("body_html").and_then(|v| v.as_str()).unwrap_or(""));
            let shop_url = p.get("handle").and_then(|v| v.as_str()).map(shop_url_for);
            let Some(pid) = p.get("id").and_then(|v| v.as_i64()) else {
                continue;
            };

            let was_created = upsert_flavor(
                db,
                &client,
                media_root,
                pid,
                &title,
                cat.id,
                &description,
                shop_url,
                is_available,
                image_url,
                &image_urls,
                &pid.to_string(),
            )
            .await?;
            if was_created {
                created += 1;
            } else {
                updated += 1;
            }
            synced_ids.push(pid);
        }

        // Mark catalog flavors no longer present as unavailable.
        let discontinued = if synced_ids.is_empty() {
            0
        } else {
            Flavor::update_many()
                .col_expr(flavor::Column::IsAvailable, Expr::value(false))
                .filter(flavor::Column::ExternalId.is_not_null())
                .filter(flavor::Column::ExternalId.is_not_in(synced_ids.clone()))
                .exec(db)
                .await?
                .rows_affected
        };

        log.push(format!(
            "Finished! Created: {created}, Updated: {updated}, Marked Unavailable: {discontinued}"
        ));
        Ok(log.join("\n"))
    }
}

fn shop_url_for(handle: &str) -> String {
    format!("https://weareholy.com/products/{handle}")
}

/// Tags as a lowercase-able list; Shopify returns either an array or a CSV string.
fn parse_tags(p: &Value) -> Vec<String> {
    match p.get("tags") {
        Some(Value::Array(a)) => a.iter().filter_map(|t| t.as_str().map(String::from)).collect(),
        Some(Value::String(s)) => s.split(',').map(|t| t.trim().to_string()).collect(),
        _ => Vec::new(),
    }
}

/// Strip HTML tags (Django's `clean_html`, regex `<.*?>`).
fn clean_html(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut in_tag = false;
    for c in raw.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    out.trim().to_string()
}

/// Drink family from a Shopify `product_type` ("42 - Syrup Bottle" -> "Syrup"),
/// or `None` for non-flavor types. Mirrors `_family_from_product_type`.
fn family_from_product_type(product_type: &str) -> Option<String> {
    if product_type.is_empty() {
        return None;
    }
    let stripped = strip_type_prefix(product_type);
    let stripped = stripped.trim();
    if stripped.is_empty() {
        return None;
    }
    let mut tokens: Vec<&str> = stripped.split_whitespace().collect();
    if tokens.iter().any(|t| NON_FLAVOR_TOKENS.contains(&t.to_lowercase().as_str())) {
        return None;
    }
    while tokens.last().is_some_and(|t| FORM_WORDS.contains(&t.to_lowercase().as_str())) {
        tokens.pop();
    }
    if tokens.is_empty() {
        return None;
    }
    Some(tokens.join(" "))
}

/// Remove a leading `\d+\s*[-–—]\s*` numeric prefix; unchanged if it doesn't match.
fn strip_type_prefix(s: &str) -> String {
    let t = s.trim_start();
    let after_digits = t.trim_start_matches(|c: char| c.is_ascii_digit());
    if after_digits.len() == t.len() {
        return s.to_string(); // no leading digits → no match
    }
    let after_ws = after_digits.trim_start();
    let mut chars = after_ws.chars();
    match chars.next() {
        Some('-') | Some('–') | Some('—') => chars.as_str().trim_start().to_string(),
        _ => s.to_string(),
    }
}

fn is_pack(title_lower: &str, tags_lower: &[String]) -> bool {
    if PACK_TITLE_KEYWORDS.iter().any(|k| title_lower.contains(k)) {
        return true;
    }
    title_lower.contains("shaker") || tags_lower.iter().any(|t| t == "merch")
}

fn is_syrup_variant_product(p: &Value) -> bool {
    if family_from_product_type(p.get("product_type").and_then(|v| v.as_str()).unwrap_or(""))
        .as_deref()
        != Some("Syrup")
    {
        return false;
    }
    let has_flavor_option = p
        .get("options")
        .and_then(|v| v.as_array())
        .map(|opts| {
            opts.iter()
                .any(|o| o.get("name").and_then(|n| n.as_str()).unwrap_or("").to_lowercase() == "flavor")
        })
        .unwrap_or(false);
    let variant_count = p.get("variants").and_then(|v| v.as_array()).map(|v| v.len()).unwrap_or(0);
    has_flavor_option && variant_count > 1
}

/// Pick a category for a product, or `None` to skip. Mirrors `resolve_category`.
async fn resolve_category(
    db: &DatabaseConnection,
    p: &Value,
    title_lower: &str,
    tags_lower: &[String],
    packs: &category::Model,
) -> anyhow::Result<Option<category::Model>> {
    if is_pack(title_lower, tags_lower) {
        return Ok(Some(packs.clone()));
    }
    if ACCESSORY_TITLE_KEYWORDS.iter().any(|k| title_lower.contains(k)) {
        return Ok(Some(packs.clone()));
    }
    if let Some(family) =
        family_from_product_type(p.get("product_type").and_then(|v| v.as_str()).unwrap_or(""))
    {
        return Ok(Some(category_for_family(db, &family).await?));
    }
    for (keywords, name) in TAG_FAMILY {
        if keywords.iter().any(|k| tags_lower.iter().any(|t| t == k)) {
            return Ok(Some(category_for_family(db, name).await?));
        }
    }
    if tags_lower.iter().any(|t| t == "shaker") {
        return Ok(Some(packs.clone()));
    }
    Ok(None)
}

/// get_or_create a category from a family name, keyed by `slugify(name)`.
async fn category_for_family(db: &DatabaseConnection, name: &str) -> anyhow::Result<category::Model> {
    goc_category_by_slug_named(db, &slugify(name), name).await
}

async fn goc_category_by_slug_named(
    db: &DatabaseConnection,
    slug: &str,
    name: &str,
) -> anyhow::Result<category::Model> {
    if let Some(c) = Category::find()
        .filter(category::Column::Slug.eq(slug))
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

/// Expand the syrup bundle's variants into individual Syrup flavors keyed by
/// variant id. Mirrors `_sync_syrup_variants`.
async fn sync_syrup_variants(
    db: &DatabaseConnection,
    client: &reqwest::Client,
    media_root: &str,
    p: &Value,
    synced_ids: &mut Vec<i64>,
) -> anyhow::Result<(usize, usize)> {
    let cat = category_for_family(db, "Syrup").await?;
    let description = clean_html(p.get("body_html").and_then(|v| v.as_str()).unwrap_or(""));
    let shop_url = p.get("handle").and_then(|v| v.as_str()).map(shop_url_for);

    let mut created = 0usize;
    let mut updated = 0usize;
    let variants = p.get("variants").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    for v in &variants {
        let name = v
            .get("option1")
            .and_then(|x| x.as_str())
            .or_else(|| v.get("title").and_then(|x| x.as_str()))
            .unwrap_or("")
            .trim()
            .to_string();
        let Some(variant_id) = v.get("id").and_then(|x| x.as_i64()) else {
            continue;
        };
        if name.is_empty() {
            continue;
        }
        let image_url = v
            .get("featured_image")
            .and_then(|f| f.get("src"))
            .and_then(|s| s.as_str())
            .map(String::from);
        let image_urls: Vec<String> = image_url.clone().into_iter().collect();
        let available = v.get("available").and_then(|a| a.as_bool()).unwrap_or(false);

        let was_created = upsert_flavor(
            db,
            client,
            media_root,
            variant_id,
            &name,
            cat.id,
            &description,
            shop_url.clone(),
            available,
            image_url,
            &image_urls,
            &variant_id.to_string(),
        )
        .await?;
        if was_created {
            created += 1;
        } else {
            updated += 1;
        }
        synced_ids.push(variant_id);
    }
    Ok((created, updated))
}

/// Find-or-create one flavor row and refresh its fields. Returns `true` if
/// created. Match order: external_id → exact name in category → case-insensitive
/// name in category. Mirrors `_upsert_flavor`.
#[allow(clippy::too_many_arguments)]
async fn upsert_flavor(
    db: &DatabaseConnection,
    client: &reqwest::Client,
    media_root: &str,
    external_id: i64,
    name: &str,
    category_id: i32,
    description: &str,
    shop_url: Option<String>,
    is_available: bool,
    image_url: Option<String>,
    image_urls: &[String],
    dir_slug: &str,
) -> anyhow::Result<bool> {
    let mut existing = Flavor::find()
        .filter(flavor::Column::ExternalId.eq(external_id))
        .one(db)
        .await?;
    if existing.is_none() {
        existing = Flavor::find()
            .filter(flavor::Column::Name.eq(name))
            .filter(flavor::Column::CategoryId.eq(category_id))
            .one(db)
            .await?;
    }
    if existing.is_none() {
        existing = Flavor::find()
            .filter(Expr::expr(Func::lower(Expr::col(flavor::Column::Name))).eq(name.to_lowercase()))
            .filter(flavor::Column::CategoryId.eq(category_id))
            .one(db)
            .await?;
    }
    let created = existing.is_none();

    let local_paths = download_gallery(client, media_root, image_urls, dir_slug).await;

    let (mut am, cur_main, cur_local_empty): (flavor::ActiveModel, Option<String>, bool) =
        match existing {
            Some(f) => {
                let cur_main = f.main_image_path.clone();
                let cur_local_empty = json_str_list(&f.local_image_paths).is_empty();
                let f_id = f.id;
                let f_name = f.name.clone();
                let f_ext_none = f.external_id.is_none();
                let f_is_legacy = f.is_legacy;
                let mut am: flavor::ActiveModel = f.into();
                if f_ext_none {
                    am.external_id = Set(Some(external_id));
                }
                if f_is_legacy {
                    am.is_legacy = Set(false);
                }
                if f_name != name {
                    let dup = Flavor::find()
                        .filter(flavor::Column::Name.eq(name))
                        .filter(flavor::Column::CategoryId.eq(category_id))
                        .filter(flavor::Column::Id.ne(f_id))
                        .count(db)
                        .await?
                        > 0;
                    if !dup {
                        am.name = Set(name.to_string());
                    }
                }
                (am, cur_main, cur_local_empty)
            }
            None => {
                let am = flavor::ActiveModel {
                    external_id: Set(Some(external_id)),
                    name: Set(name.to_string()),
                    category_id: Set(category_id),
                    is_legacy: Set(false),
                    created_at: Set(crate::datetime::now_micros()),
                    ..Default::default()
                };
                (am, None, true)
            }
        };

    am.description = Set(description.to_string());
    am.shop_url = Set(shop_url);
    am.is_available = Set(is_available);

    if !local_paths.is_empty() {
        am.local_image_paths = Set(Some(json!(local_paths)));
        if let Some(m) = cur_main {
            if !local_paths.contains(&m) {
                am.main_image_path = Set(None);
            }
        }
    } else if cur_local_empty {
        am.main_image_path = Set(None);
    }
    am.image_url = Set(image_url);
    am.image_urls = Set(Some(json!(image_urls)));

    if created {
        am.insert(db).await?;
    } else {
        am.update(db).await?;
    }
    Ok(created)
}

/// Download every URL into `flavors/<dir_slug>/<NN>_<hash>.<ext>`, in parallel,
/// returning the saved rel paths in input order. Mirrors `download_gallery`.
async fn download_gallery(
    client: &reqwest::Client,
    media_root: &str,
    image_urls: &[String],
    dir_slug: &str,
) -> Vec<String> {
    let targets: Vec<(usize, String, String)> = image_urls
        .iter()
        .enumerate()
        .filter(|(_, u)| !u.is_empty())
        .map(|(i, u)| {
            let rel = format!("flavors/{dir_slug}/{i:02}_{}.{}", hash_for(u), ext_for(u));
            (i, u.clone(), rel)
        })
        .collect();
    if targets.is_empty() {
        return Vec::new();
    }

    let succeeded: HashMap<usize, String> = futures::stream::iter(targets.clone().into_iter().map(
        |(i, u, rel)| {
            let client = client.clone();
            let media_root = media_root.to_string();
            async move {
                let abs = Path::new(&media_root).join(&rel);
                let ok = download_image(&client, &u, &abs).await;
                (i, ok, rel)
            }
        },
    ))
    .buffer_unordered(DOWNLOAD_WORKERS)
    .filter_map(|(i, ok, rel)| async move { if ok { Some((i, rel)) } else { None } })
    .collect()
    .await;

    targets.iter().filter_map(|(i, _, _)| succeeded.get(i).cloned()).collect()
}

/// Django JSONField (list) stored as TEXT → Vec<String>.
fn json_str_list(v: &Option<Value>) -> Vec<String> {
    match v {
        Some(Value::Array(arr)) => {
            arr.iter().filter_map(|x| x.as_str().map(String::from)).collect()
        }
        _ => Vec::new(),
    }
}
