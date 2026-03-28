use tauri::State;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo};

#[tauri::command]
pub fn get_systems(db: State<Database>) -> Result<Vec<SystemInfo>, String> {
    db.get_systems().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_games(db: State<Database>, system_id: String) -> Result<Vec<GameInfo>, String> {
    db.get_games(&system_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_game(db: State<Database>, game_id: String) -> Result<Option<GameInfo>, String> {
    db.get_game(&game_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_favorite(db: State<Database>, game_id: String) -> Result<bool, String> {
    db.toggle_favorite(&game_id).map_err(|e| e.to_string())
}
