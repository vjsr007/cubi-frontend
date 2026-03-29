use tauri::{AppHandle, Manager, State};
use crate::db::Database;
use crate::models::media::{GameMedia, SystemMedia};
use crate::services::{config_service, media_service, downloader_service};

#[tauri::command]
pub fn get_game_media(db: State<Database>, game_id: String) -> Result<GameMedia, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let config = config_service::load_config()?;
    if config.paths.data_root.is_empty() {
        return Ok(GameMedia::default());
    }

    Ok(media_service::resolve_game_media(
        &config.paths.data_root,
        &game.system_id,
        &game.file_name,
    ))
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
