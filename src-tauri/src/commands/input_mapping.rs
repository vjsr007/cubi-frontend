use tauri::State;
use crate::db::Database;
use crate::models::{InputProfile, ButtonBinding, SystemProfileAssignment, ControllerType, all_actions, button_label};
use crate::services::input_mapping_service::{DefaultPresets, get_exporter};

// ── Profile CRUD ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_input_profiles(db: State<'_, Database>) -> Result<Vec<InputProfile>, String> {
    db.get_input_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_input_profile(db: State<'_, Database>, profile_id: String) -> Result<Option<InputProfile>, String> {
    db.get_input_profile(&profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_input_profile(
    db: State<'_, Database>,
    name: String,
    controller_type: String,
    base_profile_id: Option<String>,
) -> Result<InputProfile, String> {
    let ct = ControllerType::from_str(&controller_type);
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let id = format!("custom-{}", uuid::Uuid::new_v4());
    let profile = InputProfile {
        id: id.clone(),
        name,
        controller_type: ct.clone(),
        is_builtin: false,
        created_at: now.clone(),
        updated_at: now,
    };
    db.insert_input_profile(&profile).map_err(|e| e.to_string())?;

    // Copy bindings from base profile, or seed defaults
    let source_bindings = if let Some(ref base_id) = base_profile_id {
        db.get_profile_bindings(base_id).unwrap_or_default()
    } else {
        DefaultPresets::default_bindings_for(&ct, &id)
    };
    for b in &source_bindings {
        let _ = db.set_binding(&id, &b.action, b.button_index, b.axis_index, b.axis_direction.as_deref());
    }

    Ok(profile)
}

#[tauri::command]
pub fn update_input_profile(
    db: State<'_, Database>,
    profile_id: String,
    name: String,
) -> Result<(), String> {
    db.update_input_profile_name(&profile_id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_input_profile(db: State<'_, Database>, profile_id: String) -> Result<(), String> {
    db.delete_input_profile(&profile_id).map_err(|e| e.to_string())
}

// ── Bindings ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_profile_bindings(db: State<'_, Database>, profile_id: String) -> Result<Vec<ButtonBinding>, String> {
    db.get_profile_bindings(&profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_binding(
    db: State<'_, Database>,
    profile_id: String,
    action: String,
    button_index: i32,
    axis_index: Option<i32>,
    axis_direction: Option<String>,
) -> Result<(), String> {
    db.set_binding(&profile_id, &action, button_index, axis_index, axis_direction.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_profile_bindings(db: State<'_, Database>, profile_id: String) -> Result<(), String> {
    let profile = db.get_input_profile(&profile_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Profile not found".to_string())?;

    db.delete_profile_bindings(&profile_id).map_err(|e| e.to_string())?;
    let defaults = DefaultPresets::default_bindings_for(&profile.controller_type, &profile_id);
    for b in &defaults {
        let _ = db.set_binding(&profile_id, &b.action, b.button_index, b.axis_index, b.axis_direction.as_deref());
    }
    Ok(())
}

// ── System ↔ Profile assignments ────────────────────────────────────────────

#[tauri::command]
pub fn get_system_profile_assignments(db: State<'_, Database>) -> Result<Vec<SystemProfileAssignment>, String> {
    db.get_system_profile_assignments().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_system_profile_assignment(
    db: State<'_, Database>,
    system_id: String,
    profile_id: String,
) -> Result<(), String> {
    db.set_system_profile_assignment(&system_id, &profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_system_profile_assignment(db: State<'_, Database>, system_id: String) -> Result<(), String> {
    db.delete_system_profile_assignment(&system_id).map_err(|e| e.to_string())
}

// ── Export ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn export_profile_for_emulator(
    db: State<'_, Database>,
    profile_id: String,
    emulator_name: String,
) -> Result<String, String> {
    let bindings = db.get_profile_bindings(&profile_id).map_err(|e| e.to_string())?;
    let exporter = get_exporter(&emulator_name);
    Ok(exporter.export(&bindings))
}

// ── Metadata helpers ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_all_actions() -> Vec<ActionInfo> {
    all_actions()
        .iter()
        .map(|a| {
            let category = if a.starts_with("ui_") {
                "UI"
            } else if a.starts_with("game_") {
                "Game"
            } else {
                "Hotkey"
            };
            ActionInfo {
                name: a.to_string(),
                category: category.to_string(),
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_button_label(button_index: i32) -> String {
    button_label(button_index).to_string()
}

#[derive(serde::Serialize, Clone)]
pub struct ActionInfo {
    pub name: String,
    pub category: String,
}
