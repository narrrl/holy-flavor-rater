//! Avatar upload handling, mirroring the PIL step in Django's `User.save`:
//! images larger than 256px or not already JPEG are thumbnailed to fit 256×256
//! and re-encoded as JPEG (quality 90). Smaller JPEGs are stored as-is.
//!
//! The processed file is written under `<MEDIA_ROOT>/avatars/` and the returned
//! value is the DB-stored relative path (e.g. `avatars/<uuid>.jpg`), matching
//! Django's `ImageField(upload_to="avatars/")`.

use std::path::Path;

use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ImageFormat};

const MAX_DIM: u32 = 256;

/// Process raw upload bytes and persist the avatar. Returns the relative media
/// path to store in `User.avatar`.
pub fn process_and_save(
    media_root: &str,
    original_name: &str,
    data: &[u8],
) -> Result<String, String> {
    let format = image::guess_format(data).ok();
    let img = image::load_from_memory(data).map_err(|e| format!("invalid image: {e}"))?;

    let oversized = img.width() > MAX_DIM || img.height() > MAX_DIM;
    let is_jpeg = format == Some(ImageFormat::Jpeg);

    let (bytes, ext): (Vec<u8>, &str) = if oversized || !is_jpeg {
        // thumbnail() preserves aspect ratio, fitting within MAX_DIM×MAX_DIM.
        let resized = if oversized {
            img.thumbnail(MAX_DIM, MAX_DIM)
        } else {
            img
        };
        let rgb = DynamicImage::ImageRgb8(resized.to_rgb8());
        let mut buf = Vec::new();
        rgb.write_with_encoder(JpegEncoder::new_with_quality(&mut buf, 90))
            .map_err(|e| format!("encode jpeg: {e}"))?;
        (buf, "jpg")
    } else {
        let ext = Path::new(original_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg");
        (data.to_vec(), if ext.is_empty() { "jpg" } else { ext })
    };

    let dir = Path::new(media_root).join("avatars");
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir avatars: {e}"))?;

    let filename = format!("{}.{}", uuid::Uuid::new_v4().simple(), ext);
    let full = dir.join(&filename);
    std::fs::write(&full, &bytes).map_err(|e| format!("write avatar: {e}"))?;

    Ok(format!("avatars/{filename}"))
}
