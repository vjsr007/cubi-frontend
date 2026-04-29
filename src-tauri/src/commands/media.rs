use tauri::{AppHandle, Manager, State};
use crate::db::Database;
use crate::models::media::{GameMedia, SystemMedia};
use crate::services::{config_service, media_service, downloader_service};

/// Download system logo from GitHub (RetroPie carbon theme) if not available locally.
#[tauri::command]
pub async fn download_system_media(
    app: AppHandle,
    system_id: String,
) -> Result<SystemMedia, String> {
    let config = config_service::load_config()?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;

    let mut media = if config.paths.data_root.is_empty() {
        SystemMedia::default()
    } else {
        media_service::resolve_system_media(&config.paths.data_root, &system_id)
    };

    // Download system logo if no wheel/logo available
    if media.wheel.is_none() {
        media.wheel = downloader_service::download_system_logo(
            &app_data_dir,
            &system_id,
        ).await;
    }

    Ok(media)
}

#[tauri::command]
pub fn get_game_media(app: AppHandle, db: State<Database>, game_id: String) -> Result<GameMedia, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let config = config_service::load_config()?;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;

    let mut media = if config.paths.data_root.is_empty() {
        media_service::resolve_game_media(
            "",
            &app_data_dir,
            &game.system_id,
            &game.file_name,
        )
    } else {
        media_service::resolve_game_media(
            &config.paths.data_root,
            &app_data_dir,
            &game.system_id,
            &game.file_name,
        )
    };

    // Fallback: use DB-stored paths / URLs (set by scraper or editor) if resolver didn't find files
    fn try_fill(slot: &mut Option<String>, db_value: &Option<String>) {
        if slot.is_none() {
            if let Some(ref p) = db_value {
                if p.is_empty() { return; }
                let is_remote = p.starts_with("http://") || p.starts_with("https://");
                if is_remote || std::path::Path::new(p).exists() {
                    *slot = Some(p.clone());
                }
            }
        }
    }

    try_fill(&mut media.box_art, &game.box_art);
    try_fill(&mut media.fan_art, &game.hero_art);
    try_fill(&mut media.wheel, &game.logo);
    try_fill(&mut media.fan_art, &game.background_art);
    try_fill(&mut media.video, &game.trailer_local);
    try_fill(&mut media.manual, &game.manual);

    // Screenshots: DB stores a Vec, media only has one slot
    if media.screenshot.is_none() {
        if let Some(ref shots) = game.screenshots {
            if let Some(first) = shots.first() {
                if !first.is_empty() {
                    let is_remote = first.starts_with("http://") || first.starts_with("https://");
                    if is_remote || std::path::Path::new(first).exists() {
                        media.screenshot = Some(first.clone());
                    }
                }
            }
        }
    }

    Ok(media)
}

#[tauri::command]
pub fn get_system_media(system_id: String) -> Result<SystemMedia, String> {
    let config = config_service::load_config()?;
    if config.paths.data_root.is_empty() {
        return Ok(SystemMedia::default());
    }
    Ok(media_service::resolve_system_media(&config.paths.data_root, &system_id))
}

/// Download media from the internet (Libretro thumbnails) if not available locally.
/// Returns the updated GameMedia with any newly downloaded paths filled in.
#[tauri::command]
pub async fn download_game_media(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
) -> Result<GameMedia, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let config = config_service::load_config()?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;

    // Get existing local media first
    let mut media = if config.paths.data_root.is_empty() {
        GameMedia::default()
    } else {
        media_service::resolve_game_media(
            &config.paths.data_root,
            &app_data_dir,
            &game.system_id,
            &game.file_name,
        )
    };

    let stem = std::path::Path::new(&game.file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&game.file_name)
        .to_string();

    // Download box art if missing
    if media.box_art.is_none() {
        media.box_art = downloader_service::download_box_art(
            &app_data_dir,
            &game.system_id,
            &stem,
        ).await;
    }

    // Download screenshot if missing
    if media.screenshot.is_none() {
        media.screenshot = downloader_service::download_screenshot(
            &app_data_dir,
            &game.system_id,
            &stem,
        ).await;
    }

    Ok(media)
}
