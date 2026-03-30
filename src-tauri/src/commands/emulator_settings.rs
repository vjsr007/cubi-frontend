use tauri::State;
use crate::db::Database;
use crate::models::{ConfigWriterInfo, EmulatorSettingValue, SettingDefinition};
use crate::services::emulator_settings_service;

#[tauri::command]
pub fn get_setting_definitions(db: State<'_, Database>) -> Result<Vec<SettingDefinition>, String> {
    emulator_settings_service::get_setting_defs(&db)
}

#[tauri::command]
pub fn get_config_writers_info() -> Vec<ConfigWriterInfo> {
    emulator_settings_service::get_all_config_writers_info()
}

#[tauri::command]
pub fn get_emulator_settings(
    db: State<'_, Database>,
    emulator_name: String,
) -> Result<Vec<EmulatorSettingValue>, String> {
    db.get_emulator_settings(&emulator_name)
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_all_emulator_settings(
    db: State<'_, Database>,
) -> Result<Vec<EmulatorSettingValue>, String> {
    emulator_settings_service::get_all_emulator_setting_values(&db)
}

#[tauri::command]
pub fn set_emulator_setting(
    db: State<'_, Database>,
    emulator_name: String,
    setting_key: String,
    value: String,
) -> Result<(), String> {
    emulator_settings_service::set_setting(&db, &emulator_name, &setting_key, &value)
}

#[tauri::command]
pub fn reset_emulator_settings(
    db: State<'_, Database>,
    emulator_name: String,
) -> Result<(), String> {
    emulator_settings_service::reset_settings(&db, &emulator_name)
}

#[tauri::command]
pub fn preview_emulator_config(
    db: State<'_, Database>,
    emulator_name: String,
) -> Result<String, String> {
    emulator_settings_service::preview_emulator_config(&db, &emulator_name)
}
