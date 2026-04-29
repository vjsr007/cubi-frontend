use tauri::State;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo};
use crate::services::pc_import_service::{
    PcImportGame, PcLibraryStatus,
    detect_pc_libraries, import_steam, import_epic, import_ea, import_gog, import_xbox,
};
use crate::services::{steam_cloud_service, epic_cloud_service, gog_cloud_service, xbox_cloud_service};

const PC_SYSTEM_ID: &str = "pc";

fn ensure_pc_system(db: &Database) -> Result<(), String> {
    let system = SystemInfo {
        id: PC_SYSTEM_ID.to_string(),
        name: "PC".to_string(),
        full_name: "Microsoft Windows".to_string(),
        extensions: vec!["exe".to_string(), "lnk".to_string()],
        game_count: 0,
        rom_path: String::new(),
        icon: None,
    };
    db.upsert_system(&system).map_err(|e| e.to_string())?;
    Ok(())
}

fn blake3_id(path: &str) -> String {
    let hash = blake3::hash(path.as_bytes());
    hash.to_hex()[..16].to_string()
}

/// Resolve the SteamGridDB API key: prefer the value passed by the caller
/// (stored in the app config), then fall back to the `STEAMGRIDDB_API_KEY`
/// environment variable set on the host machine.
fn resolve_sgdb_key(provided: Option<String>) -> Option<String> {
    provided
        .filter(|s| !s.is_empty())
        .or_else(|| std::env::var("STEAMGRIDDB_API_KEY").ok().filter(|s| !s.is_empty()))
}

/// Detect which PC game libraries are installed.
#[tauri::command]
pub fn detect_pc_libs() -> Result<PcLibraryStatus, String> {
    Ok(detect_pc_libraries())
}

/// Scan and return all discovered Steam games (not yet saved).
/// When `steam_id` and `steam_api_key` are provided, fetches the full
/// cloud library (installed + uninstalled). Otherwise falls back to the
/// local ACF manifest scan.
#[tauri::command]
pub async fn import_steam_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    steam_id: Option<String>,
    steam_api_key: Option<String>,
    force_refresh: Option<bool>,
) -> Result<Vec<PcImportGame>, String> {
    let sgdb = resolve_sgdb_key(sgdb_key);
    let refresh = force_refresh.unwrap_or(false);

    // Use cloud service if we have both a Steam ID and API key
    if let (Some(sid), Some(key)) = (&steam_id, &steam_api_key) {
        if !sid.trim().is_empty() && !key.trim().is_empty() {
            let games = steam_cloud_service::fetch_steam_owned(
                &db,
                sid.trim(),
                key.trim(),
                refresh,
            )
            .await;
            return Ok(games);
        }
    }

    // Fallback: local ACF manifest scan
    Ok(import_steam(sgdb.as_deref()).await)
}

/// Scan and return all discovered Epic Games Launcher games.
#[tauri::command]
pub async fn import_epic_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,
) -> Result<Vec<PcImportGame>, String> {
    let refresh = force_refresh.unwrap_or(false);
    // Try cloud service first; if it returns results, use them
    let cloud = epic_cloud_service::fetch_epic_owned(&db, refresh).await;
    if !cloud.is_empty() {
        return Ok(cloud);
    }
    // Fallback to local scan
    Ok(import_epic(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered EA App games.
#[tauri::command]
pub async fn import_ea_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_ea(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered GOG Galaxy games.
#[tauri::command]
pub async fn import_gog_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,
) -> Result<Vec<PcImportGame>, String> {
    let refresh = force_refresh.unwrap_or(false);
    // Try cloud service; fall back to local scan
    let cloud = gog_cloud_service::fetch_gog_owned(&db, refresh).await;
    if !cloud.is_empty() {
        return Ok(cloud);
    }
    Ok(import_gog(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered Xbox Game Pass games.
#[tauri::command]
pub async fn import_xbox_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,
) -> Result<Vec<PcImportGame>, String> {
    let refresh = force_refresh.unwrap_or(false);
    // Try public Game Pass catalog; fall back to local UWP scan
    let cloud = xbox_cloud_service::fetch_xbox_catalog(&db, refresh).await;
    if !cloud.is_empty() {
        return Ok(cloud);
    }
    Ok(import_xbox(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Clear the pc_cloud_cache for a specific store or all stores.
/// Pass `store = None` (or omit) to clear all; pass `"steam"`, `"epic"`, `"gog"`, or `"xbox"` to clear one.
#[tauri::command]
pub fn clear_pc_cloud_cache(
    db: State<'_, Database>,
    store: Option<String>,
) -> Result<(), String> {
    db.clear_cloud_cache(store.as_deref()).map_err(|e| e.to_string())
}

/// Persist a list of imported PC games to the database.
/// Returns the number of games successfully saved.
#[tauri::command]
pub fn save_pc_games(
    db: State<'_, Database>,
    games: Vec<PcImportGame>,
) -> Result<usize, String> {
    ensure_pc_system(&db)?;

    let mut count = 0;
    for import in &games {
        let game = GameInfo {
            id: blake3_id(&import.file_path),
            system_id: PC_SYSTEM_ID.to_string(),
            title: import.title.clone(),
            file_path: import.file_path.clone(),
            file_name: import.title.clone(),
            file_size: import.file_size,
            box_art: import.box_art.clone(),
            developer: import.developer.clone(),
            publisher: import.publisher.clone(),
            players: 1,
            ..Default::default()
        };
        if db.upsert_game(&game).is_ok() {
            count += 1;
        }
    }

    let _ = db.update_system_game_count(PC_SYSTEM_ID);
    Ok(count)
}

/// Manually add a single PC game.
#[tauri::command]
pub fn add_pc_game(
    db: State<'_, Database>,
    title: String,
    exe_path: String,
    box_art: Option<String>,
    developer: Option<String>,
    publisher: Option<String>,
    year: Option<String>,
    genre: Option<String>,
) -> Result<GameInfo, String> {
    ensure_pc_system(&db)?;

    let file_size = std::fs::metadata(&exe_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file_name = std::path::Path::new(&exe_path)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(&title)
        .to_string();

    let game = GameInfo {
        id: blake3_id(&exe_path),
        system_id: PC_SYSTEM_ID.to_string(),
        title: title.clone(),
        file_path: exe_path.clone(),
        file_name,
        file_size,
        box_art,
        developer,
        publisher,
        year,
        genre,
        players: 1,
        ..Default::default()
    };

    db.upsert_game(&game).map_err(|e| e.to_string())?;
    let _ = db.update_system_game_count(PC_SYSTEM_ID);
    Ok(game)
}

/// Delete a PC game from the database.
#[tauri::command]
pub fn delete_pc_game(
    db: State<'_, Database>,
    game_id: String,
) -> Result<(), String> {
    db.delete_game(&game_id).map_err(|e| e.to_string())?;
    let _ = db.update_system_game_count(PC_SYSTEM_ID);
    Ok(())
}
