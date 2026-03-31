//! Service for importing media files: local file copy, URL download, and cleanup.

use std::path::{Path, PathBuf};
use reqwest::Client;
use tokio::io::AsyncWriteExt;

const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024; // 50 MB
const DOWNLOAD_TIMEOUT_SECS: u64 = 60;

const VALID_IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp"];
const VALID_VIDEO_EXTS: &[&str] = &["mp4", "mkv", "webm", "avi", "mov"];

/// Build the destination path: `{app_data}/media/{system_id}/{media_type}/{stem}.{ext}`
pub fn media_dest_path(
    app_data_dir: &Path,
    system_id: &str,
    media_type: &str,
    game_stem: &str,
    extension: &str,
) -> PathBuf {
    app_data_dir
        .join("media")
        .join(system_id)
        .join(media_type)
        .join(format!("{}.{}", sanitize_filename(game_stem), extension))
}

/// Copy a local file to the media folder. Returns the destination path.
pub fn copy_local_file(
    source: &Path,
    app_data_dir: &Path,
    system_id: &str,
    media_type: &str,
    game_stem: &str,
) -> Result<String, String> {
    if !source.exists() {
        return Err(format!("Source file not found: {}", source.display()));
    }

    let size = std::fs::metadata(source).map_err(|e| e.to_string())?.len();
    if size > MAX_FILE_SIZE {
        return Err(format!("File too large: {} MB (max {} MB)", size / 1024 / 1024, MAX_FILE_SIZE / 1024 / 1024));
    }

    let ext = source.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .to_lowercase();

    let is_video = media_type == "video";
    let valid_exts = if is_video { VALID_VIDEO_EXTS } else { VALID_IMAGE_EXTS };
    if !valid_exts.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported file type: .{}. Supported: {}",
            ext,
            valid_exts.join(", ")
        ));
    }

    let dest = media_dest_path(app_data_dir, system_id, media_type, game_stem, &ext);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    std::fs::copy(source, &dest).map_err(|e| format!("Failed to copy file: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

/// Download a file from a URL to the media folder. Returns the destination path.
pub async fn download_from_url(
    url: &str,
    app_data_dir: &Path,
    system_id: &str,
    media_type: &str,
    game_stem: &str,
) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(DOWNLOAD_TIMEOUT_SECS))
        .user_agent("cubi-frontend/0.5")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| format!("Download failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP error: {}", resp.status()));
    }

    // Determine extension from URL or content-type
    let ext = extension_from_url_or_content_type(url, resp.headers());
    let is_video = media_type == "video";
    let valid_exts = if is_video { VALID_VIDEO_EXTS } else { VALID_IMAGE_EXTS };
    if !valid_exts.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported file type: .{}. Supported: {}",
            ext,
            valid_exts.join(", ")
        ));
    }

    let bytes = resp.bytes().await.map_err(|e| format!("Download read error: {}", e))?;
    if bytes.len() as u64 > MAX_FILE_SIZE {
        return Err(format!("Downloaded file too large: {} MB", bytes.len() / 1024 / 1024));
    }

    let dest = media_dest_path(app_data_dir, system_id, media_type, game_stem, &ext);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let mut file = tokio::fs::File::create(&dest).await.map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes).await.map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(dest.to_string_lossy().to_string())
}

/// Delete a media file from disk.
pub fn delete_media_file(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| format!("Failed to delete: {}", e))?;
    }
    Ok(())
}

fn extension_from_url_or_content_type(url: &str, headers: &reqwest::header::HeaderMap) -> String {
    // Try URL path extension first
    if let Some(ext) = url.split('?').next()
        .and_then(|u| u.rsplit('.').next())
        .map(|e| e.to_lowercase())
    {
        if VALID_IMAGE_EXTS.contains(&ext.as_str()) || VALID_VIDEO_EXTS.contains(&ext.as_str()) {
            return ext;
        }
    }

    // Fallback to content-type
    if let Some(ct) = headers.get("content-type").and_then(|v| v.to_str().ok()) {
        return match ct {
            "image/jpeg" | "image/jpg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            "image/gif" => "gif",
            "video/mp4" => "mp4",
            "video/webm" => "webm",
            _ => "jpg",
        }.to_string();
    }

    "jpg".to_string()
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' || c == ' ' { c } else { '_' })
        .collect::<String>()
        .trim()
        .to_string()
}
