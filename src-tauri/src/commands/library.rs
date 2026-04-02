use tauri::State;
use crate::db::Database;
use crate::models::{GameInfo, GamesPage, SystemInfo};

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

#[tauri::command]
pub fn get_all_games(db: State<Database>) -> Result<Vec<GameInfo>, String> {
    db.get_all_games().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_games_page(db: State<Database>, system_id: String, offset: usize, limit: usize) -> Result<GamesPage, String> {
    db.get_games_page(&system_id, offset, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_games_page(db: State<Database>, offset: usize, limit: usize) -> Result<GamesPage, String> {
    db.get_all_games_page(offset, limit).map_err(|e| e.to_string())
}
