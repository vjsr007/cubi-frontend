use tauri::State;
use crate::db::Database;
use crate::models::{FlashKeyMapping, FlashGameConfig, LeftStickMode, default_flash_mappings, gamepad_button_label};

#[tauri::command]
pub fn get_flash_key_mappings(db: State<'_, Database>, game_id: String) -> Result<Vec<FlashKeyMapping>, String> {
    db.get_flash_key_mappings(&game_id)
        .map_err(|e| format!("Failed to get flash key mappings: {}", e))
}

#[tauri::command]
pub fn set_flash_key_mapping(
    db: State<'_, Database>,
    game_id: String,
    gamepad_button: i32,
    keyboard_key: String,
) -> Result<(), String> {
    db.set_flash_key_mapping(&game_id, gamepad_button, &keyboard_key)
        .map_err(|e| format!("Failed to set flash key mapping: {}", e))
}

#[tauri::command]
pub fn delete_flash_key_mapping(
    db: State<'_, Database>,
    game_id: String,
    gamepad_button: i32,
) -> Result<(), String> {
    db.delete_flash_key_mapping(&game_id, gamepad_button)
        .map_err(|e| format!("Failed to delete flash key mapping: {}", e))
}

/// Reset all mappings for a Flash game back to the defaults.
#[tauri::command]
pub fn reset_flash_key_mappings(db: State<'_, Database>, game_id: String) -> Result<Vec<FlashKeyMapping>, String> {
    db.delete_all_flash_key_mappings(&game_id)
        .map_err(|e| format!("Failed to clear mappings: {}", e))?;

    let defaults = default_flash_mappings(&game_id);
    for m in &defaults {
        db.set_flash_key_mapping(&m.game_id, m.gamepad_button, &m.keyboard_key)
            .map_err(|e| format!("Failed to seed default mapping: {}", e))?;
    }
    Ok(defaults)
}

/// Get the default flash mappings without saving them (preview).
#[tauri::command]
pub fn get_default_flash_mappings(game_id: String) -> Vec<FlashKeyMapping> {
    default_flash_mappings(&game_id)
}

/// Get human-readable label for a gamepad button index.
#[tauri::command]
pub fn get_flash_button_label(button_index: i32) -> String {
    gamepad_button_label(button_index).to_string()
}

// ── Stick / Mouse config ─────────────────────────────────��───────────

#[tauri::command]
pub fn get_flash_game_config(db: State<'_, Database>, game_id: String) -> Result<FlashGameConfig, String> {
    Ok(db.get_flash_game_config(&game_id)
        .map_err(|e| format!("Failed to get flash game config: {}", e))?
        .unwrap_or_else(|| FlashGameConfig::default_for(&game_id)))
}

#[tauri::command]
pub fn set_flash_game_config(
    db: State<'_, Database>,
    game_id: String,
    left_stick_mode: String,
    right_stick_mouse: bool,
    mouse_sensitivity: i32,
) -> Result<(), String> {
    let cfg = FlashGameConfig {
        game_id,
        left_stick_mode: LeftStickMode::from_str(&left_stick_mode),
        right_stick_mouse,
        mouse_sensitivity: mouse_sensitivity.clamp(1, 100),
    };
    db.set_flash_game_config(&cfg)
        .map_err(|e| format!("Failed to save flash game config: {}", e))
}
