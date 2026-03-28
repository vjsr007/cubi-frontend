use crate::models::AppConfig;
use crate::services::config_service;

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    config_service::load_config()
}

#[tauri::command]
pub fn set_config(config: AppConfig) -> Result<(), String> {
    config_service::save_config(&config)
}

#[tauri::command]
pub fn detect_emudeck() -> Result<Option<String>, String> {
    Ok(config_service::detect_emudeck())
}

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    let path = config_service::get_config_path()?;
    Ok(path.to_string_lossy().to_string())
}
