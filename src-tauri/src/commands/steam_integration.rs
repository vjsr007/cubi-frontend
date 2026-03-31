use tauri::State;
use crate::db::Database;
use crate::models::game::GameInfoPatch;
use crate::models::steam::{SteamSearchResult, SteamGameData};
use crate::services::steam_store_service;

/// Search Steam Store by game title.
#[tauri::command]
pub async fn search_steam_games(query: String) -> Result<Vec<SteamSearchResult>, String> {
    steam_store_service::search_steam_store(&query).await
}

/// Link a game to a Steam AppID and fetch all Steam data.
#[tauri::command]
pub async fn link_steam_game(
    db: State<'_, Database>,
    game_id: String,
    steam_app_id: u32,
) -> Result<SteamGameData, String> {
    // Save steam_app_id to games table
    let patch = GameInfoPatch {
        steam_app_id: Some(steam_app_id),
        ..Default::default()
    };
    db.patch_game(&game_id, &patch).map_err(|e| e.to_string())?;

    // Fetch full Steam data
    let data = steam_store_service::fetch_full_steam_data(steam_app_id).await?;

    // Cache in DB
    db.save_steam_data(&game_id, &data).map_err(|e| e.to_string())?;

    Ok(data)
}

/// Get cached Steam data for a game, or fetch if not cached.
#[tauri::command]
pub async fn fetch_steam_data(
    db: State<'_, Database>,
    game_id: String,
) -> Result<Option<SteamGameData>, String> {
    // Check cache first
    if let Some(cached) = db.get_steam_data(&game_id).map_err(|e| e.to_string())? {
        return Ok(Some(cached));
    }

    // Try to get steam_app_id from the game
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let app_id = match game.steam_app_id {
        Some(id) => id,
        None => {
            // Try to extract from file_path (steam://rungameid/{appid})
            extract_steam_appid(&game.file_path).unwrap_or(0)
        }
    };

    if app_id == 0 {
        return Ok(None);
    }

    // Fetch and cache
    let data = steam_store_service::fetch_full_steam_data(app_id).await?;
    db.save_steam_data(&game_id, &data).map_err(|e| e.to_string())?;

    // Also save steam_app_id to games table if not set
    if game.steam_app_id.is_none() {
        let patch = GameInfoPatch {
            steam_app_id: Some(app_id),
            ..Default::default()
        };
        let _ = db.patch_game(&game_id, &patch);
    }

    Ok(Some(data))
}

/// Force refresh Steam data.
#[tauri::command]
pub async fn refresh_steam_data(
    db: State<'_, Database>,
    game_id: String,
) -> Result<SteamGameData, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let app_id = game.steam_app_id
        .or_else(|| extract_steam_appid(&game.file_path))
        .ok_or_else(|| "No Steam AppID linked to this game".to_string())?;

    let data = steam_store_service::fetch_full_steam_data(app_id).await?;
    db.save_steam_data(&game_id, &data).map_err(|e| e.to_string())?;

    Ok(data)
}

fn extract_steam_appid(file_path: &str) -> Option<u32> {
    // steam://rungameid/12345 or steam_12345
    if file_path.contains("steam://rungameid/") {
        file_path.split("steam://rungameid/").nth(1)?
            .split('/').next()?
            .parse().ok()
    } else if file_path.starts_with("steam_") {
        file_path.trim_start_matches("steam_").parse().ok()
    } else {
        None
    }
}
