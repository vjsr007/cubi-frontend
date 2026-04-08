use tauri::State;
use crate::db::Database;
use crate::models::emulator::{EmulatorChoice, SystemEmulatorChoice};
use crate::services::{preferences_service, launcher_service, config_service};
use std::collections::HashSet;

/// Set the emulator preference for a given system
#[tauri::command]
pub async fn set_emulator_preference(
    system_id: String,
    emulator_name: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    preferences_service::set_preference(&system_id, &emulator_name, &conn)?;
    log::info!(
        "Emulator preference set for {}: {}",
        system_id,
        emulator_name
    );
    Ok(())
}

/// Get the currently selected emulator for a system
#[tauri::command]
pub async fn get_emulator_preference(
    system_id: String,
    db: State<'_, Database>,
) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    preferences_service::get_preference(&system_id, &conn)
}

/// Get all available emulators for a specific system with their installation status
#[tauri::command]
pub async fn get_available_emulators_for_system(
    system_id: String,
    db: State<'_, Database>,
) -> Result<SystemEmulatorChoice, String> {
    let config = config_service::load_config()?;
    let registry = launcher_service::get_emulator_registry();

    // Find all unique emulators that support this system
    let mut available = Vec::new();
    let mut seen_emulators = HashSet::new();

    for def in &registry {
        if def.system_ids.contains(&system_id.as_str()) && !seen_emulators.contains(def.name)
        {
            seen_emulators.insert(def.name.to_string());

            // Try to detect emulator path
            let detected_path = launcher_service::find_emulator_path(def.name, &config.paths.emudeck_path)
                .ok()
                .flatten();
            let is_installed = detected_path.is_some();

            available.push(EmulatorChoice {
                emulator_name: def.name.to_string(),
                detected_path,
                is_installed,
            });
        }
    }

    // Get current preference for this system
    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    let selected_emulator = preferences_service::get_preference(&system_id, &conn)?;

    // Find system name from the database
    let systems = db.get_systems().map_err(|e| e.to_string())?;
    let system_name = systems
        .iter()
        .find(|s| s.id == system_id)
        .map(|s| s.full_name.clone())
        .unwrap_or_else(|| system_id.clone());

    Ok(SystemEmulatorChoice {
        system_id,
        system_name,
        available_emulators: available,
        selected_emulator,
    })
}

/// Get all systems with their available emulators and current preferences
#[tauri::command]
pub async fn get_all_systems_with_emulators(
    db: State<'_, Database>,
) -> Result<Vec<SystemEmulatorChoice>, String> {
    let config = config_service::load_config()?;
    let registry = launcher_service::get_emulator_registry();

    // Get all systems from the database
    let all_systems = db.get_systems().map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for system in all_systems {
        // Find emulators for this system
        let mut available = Vec::new();
        let mut seen_emulators = HashSet::new();

        for def in &registry {
            if def.system_ids.contains(&system.id.as_str()) && !seen_emulators.contains(def.name)
            {
                seen_emulators.insert(def.name.to_string());

                let detected_path =
                    launcher_service::find_emulator_path(def.name, &config.paths.emudeck_path)
                        .ok()
                        .flatten();
                let is_installed = detected_path.is_some();

                available.push(EmulatorChoice {
                    emulator_name: def.name.to_string(),
                    detected_path,
                    is_installed,
                });
            }
        }

        // Get preference for this system
        let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
        let selected_emulator = preferences_service::get_preference(&system.id, &conn)?;
        drop(conn);

        result.push(SystemEmulatorChoice {
            system_id: system.id.clone(),
            system_name: system.full_name.clone(),
            available_emulators: available,
            selected_emulator,
        });
    }

    Ok(result)
}

// ── Per-Game Emulator Overrides ────────────────────────────────────────

/// Set the emulator override for a specific game
#[tauri::command]
pub async fn set_game_emulator_override(
    game_id: String,
    emulator_name: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    // Get game to validate system_id
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    preferences_service::set_game_override(&game_id, &emulator_name, &game.system_id, &conn)?;
    
    log::info!(
        "Emulator override set for game {}: {}",
        game_id,
        emulator_name
    );
    Ok(())
}

/// Get the emulator override for a specific game (if exists)
#[tauri::command]
pub async fn get_game_emulator_override(
    game_id: String,
    db: State<'_, Database>,
) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    preferences_service::get_game_override(&game_id, &conn)
}

/// Delete the emulator override for a specific game (revert to system default)
#[tauri::command]
pub async fn delete_game_emulator_override(
    game_id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
    preferences_service::delete_game_override(&game_id, &conn)?;
    
    log::info!("Emulator override deleted for game {}", game_id);
    Ok(())
}
