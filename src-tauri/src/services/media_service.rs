use std::path::{Path, PathBuf};
use crate::models::media::{GameMedia, SystemMedia};

/// The storage/downloaded_media/ folders use the same short system IDs as our
/// roms/ folders (EmuDeck / Skraper convention). If the folder exists on disk
/// we use it directly; this function just returns the system_id itself.
fn media_folder_for(data_root: &Path, system_id: &str) -> Option<PathBuf> {
    let base = data_root
        .join("storage")
        .join("downloaded_media")
        .join(system_id);
    if base.exists() {
        Some(base)
    } else {
        None
    }
}

/// Folder where the scraper saves downloaded media: {app_data_dir}/media/{system_id}/
fn scraped_media_folder(app_data_dir: &Path, system_id: &str) -> Option<PathBuf> {
    let base = app_data_dir.join("media").join(system_id);
    if base.exists() {
        Some(base)
    } else {
        None
    }
}

fn find_file(dir: &Path, stem: &str, extensions: &[&str]) -> Option<String> {
    for ext in extensions {
        let p = dir.join(format!("{}.{}", stem, ext));
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

fn find_any_file(dir: &Path, extensions: &[&str]) -> Option<String> {
    let Ok(entries) = std::fs::read_dir(dir) else { return None };
    for entry in entries.flatten() {
        let p = entry.path();
        if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
            if extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }
    None
}

const IMG_EXTS: &[&str] = &["png", "jpg", "jpeg", "webp"];
const VID_EXTS: &[&str] = &["mp4", "avi", "mkv", "webm"];

pub fn resolve_game_media(
    data_root: &str,
    app_data_dir: &Path,
    system_id: &str,
    file_name: &str,
) -> GameMedia {
    let root = Path::new(data_root);
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name);

    let media_base = media_folder_for(root, system_id);
    let scraped_base = scraped_media_folder(app_data_dir, system_id);

    // Lookup helper: checks EmuDeck/Skraper folder first, then scraped folder
    let lookup = |subfolder: &str, exts: &[&str]| -> Option<String> {
        media_base.as_ref().and_then(|base| find_file(&base.join(subfolder), stem, exts))
            .or_else(|| scraped_base.as_ref().and_then(|base| find_file(&base.join(subfolder), stem, exts)))
    };

    // Box art: try miximages > backcovers (as front sometimes) > roms/*/downloaded_images
    let box_art = lookup("box2dfront", IMG_EXTS)
        .or_else(|| lookup("miximages", IMG_EXTS))
        .or_else(|| {
            find_file(
                &root.join("roms").join(system_id).join("downloaded_images"),
                stem,
                IMG_EXTS,
            )
        });

    GameMedia {
        box_art,
        back_cover: lookup("backcovers", IMG_EXTS),
        screenshot: lookup("screenshots", IMG_EXTS),
        title_screen: lookup("titlescreens", IMG_EXTS),
        fan_art: lookup("fanart", IMG_EXTS),
        wheel: lookup("wheel", IMG_EXTS),
        marquee: lookup("marquees_bak", IMG_EXTS),
        mix_image: lookup("miximages", IMG_EXTS),
        video: lookup("videos", VID_EXTS),
        manual: lookup("manual", &["pdf"]),
    }
}

pub fn resolve_system_media(data_root: &str, system_id: &str) -> SystemMedia {
    let root = Path::new(data_root);
    let Some(base) = media_folder_for(root, system_id) else {
        return SystemMedia::default();
    };

    SystemMedia {
        fan_art: find_any_file(&base.join("fanart"), IMG_EXTS),
        wheel: find_any_file(&base.join("wheel"), IMG_EXTS),
        marquee: find_any_file(&base.join("marquees_bak"), IMG_EXTS),
    }
}
