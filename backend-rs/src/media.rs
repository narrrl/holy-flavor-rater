//! Image-URL resolution mirroring `api/serializers/_helpers.py` +
//! `FlavorSerializer.get_image_url/get_image_urls`.

use crate::web::RequestCtx;

/// `absolute_media_url`: prefix a stored relative media path with MEDIA_URL and
/// make it absolute against the request.
pub fn media_url(ctx: &RequestCtx, media_prefix: &str, rel: &str) -> String {
    let prefix = format!("/{}/", media_prefix.trim_matches('/'));
    let path = format!("{}{}", prefix, rel.trim_start_matches('/'));
    ctx.absolute(&path)
}

/// `absolute_image_url`: an ImageField stored as a relative path under MEDIA_URL.
pub fn image_field_url(ctx: &RequestCtx, media_prefix: &str, image: &str) -> String {
    media_url(ctx, media_prefix, image)
}

/// Replicates `FlavorSerializer.get_image_url`.
pub fn flavor_primary_image(
    ctx: &RequestCtx,
    media_prefix: &str,
    main_image_path: Option<&str>,
    local_image_paths: &[String],
    image: Option<&str>,
    image_url: Option<&str>,
) -> Option<String> {
    if let Some(p) = main_image_path.filter(|s| !s.is_empty()) {
        return Some(media_url(ctx, media_prefix, p));
    }
    if let Some(first) = local_image_paths.first() {
        return Some(media_url(ctx, media_prefix, first));
    }
    if let Some(img) = image.filter(|s| !s.is_empty()) {
        return Some(image_field_url(ctx, media_prefix, img));
    }
    image_url.map(|s| s.to_string())
}

/// Replicates `FlavorSerializer.get_image_urls`.
pub fn flavor_image_list(
    ctx: &RequestCtx,
    media_prefix: &str,
    local_image_paths: &[String],
    image: Option<&str>,
    image_urls: &[String],
) -> Vec<String> {
    if !local_image_paths.is_empty() {
        return local_image_paths
            .iter()
            .map(|p| media_url(ctx, media_prefix, p))
            .collect();
    }
    let mut out = Vec::new();
    if let Some(img) = image.filter(|s| !s.is_empty()) {
        out.push(image_field_url(ctx, media_prefix, img));
    }
    out.extend(image_urls.iter().cloned());
    out
}
