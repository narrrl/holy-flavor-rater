//! Shared image-download helpers for the catalog jobs. Filenames are keyed by a
//! sha1 of the URL path and a whitelisted extension, matching Django so both
//! backends dedupe against the same `media/` files.

use std::path::Path;

use sha1::{Digest, Sha1};

/// Whitelisted image extension from a URL path, defaulting to `png` (Django's
/// `_ext_for`).
pub fn ext_for(url: &str) -> String {
    let path = reqwest::Url::parse(url)
        .map(|u| u.path().to_string())
        .unwrap_or_else(|_| url.to_string());
    let ext = path
        .rsplit_once('.')
        .map(|(_, e)| e.to_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "webp" | "gif" => ext,
        _ => "png".to_string(),
    }
}

/// First 10 hex chars of sha1(url path) (Django's `_hash_for`).
pub fn hash_for(url: &str) -> String {
    let path = reqwest::Url::parse(url)
        .map(|u| u.path().to_string())
        .unwrap_or_else(|_| url.to_string());
    let digest = Sha1::digest(path.as_bytes());
    let hex = hex_lower(&digest);
    hex[..10].to_string()
}

fn hex_lower(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{b:02x}"));
    }
    s
}

/// Download `url` to `abs_path`, skipping if a non-empty file already exists.
/// Returns `true` if the file is present afterwards (Django's
/// `download_image_to_path` returning the rel path vs None).
pub async fn download_image(client: &reqwest::Client, url: &str, abs_path: &Path) -> bool {
    if let Ok(meta) = std::fs::metadata(abs_path) {
        if meta.len() > 0 {
            return true;
        }
    }
    if let Some(parent) = abs_path.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return false;
        }
    }
    let resp = match client.get(url).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(url, error = %e, "image download failed");
            return false;
        }
    };
    if !resp.status().is_success() {
        tracing::warn!(url, status = %resp.status(), "image download non-200");
        return false;
    }
    match resp.bytes().await {
        Ok(bytes) => std::fs::write(abs_path, &bytes).is_ok(),
        Err(e) => {
            tracing::warn!(url, error = %e, "image body read failed");
            false
        }
    }
}

/// HTTP client with the same `User-Agent` Django sent (some CDNs gate on it).
pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default()
}
