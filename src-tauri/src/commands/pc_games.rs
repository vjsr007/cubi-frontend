use tauri::State;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo};
use crate::services::pc_import_service::{
    PcImportGame, PcLibraryStatus,
    detect_pc_libraries, import_steam, import_epic, import_ea, import_gog, import_xbox,
};

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
/// `sgdb_key` is optional — falls back to the `STEAMGRIDDB_API_KEY` env var.
/// Steam CDN covers are always fetched, even without a key.
#[tauri::command]
pub async fn import_steam_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_steam(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered Epic Games Launcher games.
#[tauri::command]
pub async fn import_epic_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_epic(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered EA App games.
#[tauri::command]
pub async fn import_ea_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_ea(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered GOG Galaxy games.
#[tauri::command]
pub async fn import_gog_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_gog(resolve_sgdb_key(sgdb_key).as_deref()).await)
}

/// Scan and return all discovered Xbox Game Pass games.
#[tauri::command]
pub async fn import_xbox_games(sgdb_key: Option<String>) -> Result<Vec<PcImportGame>, String> {
    Ok(import_xbox(resolve_sgdb_key(sgdb_key).as_deref()).await)
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
