//! Port of `cleanup_duplicates` — merge flavors with the same normalized name
//! within a category. Always runs in "apply" mode with suffix normalization
//! (the Celery task passed no flags).

use async_trait::async_trait;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::entities::flavor;
use crate::entities::prelude::{Category, Flavor};
use crate::merge::merge_flavors;
use crate::state::AppState;

use super::BackgroundJob;

/// Trailing form-factor phrases stripped during name normalization. Each is a
/// sequence of whitespace-separated tokens; the match requires a preceding
/// token (Django's leading `\s+`), so a name that is *only* the phrase is kept.
const SUFFIXES: &[&[&str]] = &[&["energy"], &["hydration"], &["iced", "tea"], &["(legacy)"]];

/// Lowercase, trim, and strip the known trailing suffixes (Django's
/// `normalize_name`). The result is a grouping key, not a display value.
fn normalize_name(name: &str) -> String {
    let mut tokens: Vec<String> = name.split_whitespace().map(|t| t.to_lowercase()).collect();
    for suffix in SUFFIXES {
        if tokens.len() > suffix.len() && tokens[tokens.len() - suffix.len()..] == suffix[..] {
            tokens.truncate(tokens.len() - suffix.len());
        }
    }
    tokens.join(" ")
}

pub struct CleanupDuplicates;

#[async_trait]
impl BackgroundJob for CleanupDuplicates {
    fn name(&self) -> &'static str {
        "cleanup_duplicates"
    }
    fn display_name(&self) -> &'static str {
        "Cleanup Duplicate Flavors"
    }

    async fn run(&self, state: &AppState) -> anyhow::Result<String> {
        let db = &state.db;
        let mut log: Vec<String> = Vec::new();
        let mut total_merged = 0usize;

        let categories = Category::find().all(db).await?;
        for cat in categories {
            let flavors = Flavor::find()
                .filter(flavor::Column::CategoryId.eq(cat.id))
                .all(db)
                .await?;

            // Group by normalized name (preserve insertion order is not needed;
            // each group is sorted before merging).
            let mut groups: std::collections::HashMap<String, Vec<flavor::Model>> =
                std::collections::HashMap::new();
            for f in flavors {
                groups.entry(normalize_name(&f.name)).or_default().push(f);
            }

            for (_, mut group) in groups {
                if group.len() <= 1 {
                    continue;
                }
                // Keep the catalog row (has external_id), oldest on ties.
                group.sort_by(|a, b| {
                    (a.external_id.is_none(), a.created_at)
                        .cmp(&(b.external_id.is_none(), b.created_at))
                });
                let mut keep = group.remove(0);
                let names: Vec<String> = group
                    .iter()
                    .map(|o| format!("'{}' (ID {})", o.name, o.id))
                    .collect();
                log.push(format!(
                    "Merging {} into '{}' (Category: {}, ID: {})",
                    names.join(", "),
                    keep.name,
                    cat.name,
                    keep.id
                ));

                for other in group {
                    merge_flavors(db, &keep, &other).await?;
                    // Re-fetch: merge may have inherited `external_id` onto keep,
                    // which the next iteration must see (external_id is unique).
                    keep = Flavor::find_by_id(keep.id)
                        .one(db)
                        .await?
                        .ok_or_else(|| anyhow::anyhow!("kept flavor vanished mid-merge"))?;
                    total_merged += 1;
                }
            }
        }

        log.push(format!("Finished cleaning up {total_merged} duplicates."));
        Ok(log.join("\n"))
    }
}
