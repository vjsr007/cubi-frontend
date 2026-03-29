use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::Database;
use crate::models::system::get_system_registry;

/// Serializable system definition for the frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemDefInfo {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub folder_names: Vec<String>,
}

/// ROM path override entry returned to the frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct RomPathOverride {
    pub system_id: String,
    pub custom_path: String,
}

#[tauri::command]
pub fn get_system_registry_list() -> Vec<SystemDefInfo> {
    get_system_registry()
        .into_iter()
        .map(|def| SystemDefInfo {
            id: def.id.to_string(),
            name: def.name.to_string(),
            full_name: def.full_name.to_string(),
            folder_names: def.folder_names.iter().map(|s| s.to_string()).collect(),
        })
        .collect()
}

#[tauri::command]
pub fn get_rom_path_overrides(db: State<'_, Database>) -> Result<Vec<RomPathOverride>, String> {
    let map = db.get_rom_path_overrides().map_err(|e| e.to_string())?;
    Ok(map
        .into_iter()
        .map(|(system_id, custom_path)| RomPathOverride {
            system_id,
            custom_path,
        })
        .collect())
}

#[tauri::command]
pub fn set_rom_path_override(
    db: State<'_, Database>,
    system_id: String,
    custom_path: String,
) -> Result<(), String> {
    if custom_path.trim().is_empty() {
        return Err("Custom path cannot be empty".to_string());
    }
    let path = std::path::Path::new(&custom_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", custom_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", custom_path));
    }
    db.set_rom_path_override(&system_id, &custom_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_rom_path_override(
    db: State<'_, Database>,
    system_id: String,
) -> Result<(), String> {
    db.delete_rom_path_override(&system_id)
        .map_err(|e| e.to_string())
}
