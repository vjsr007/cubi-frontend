use tauri::State;
use crate::db::Database;
use crate::models::{CatalogSystemStats, CatalogPage, CatalogFilter, CatalogSync, CatalogConfig};
use std::collections::HashMap;

#[tauri::command]
pub fn get_catalog_stats(db: State<Database>) -> Result<Vec<CatalogSystemStats>, String> {
    db.get_catalog_stats()
        .map_err(|e| format!("Failed to get catalog stats: {}", e))
}

#[tauri::command]
pub fn get_catalog_games(db: State<Database>, filter: CatalogFilter) -> Result<CatalogPage, String> {
    db.get_catalog_games(&filter)
        .map_err(|e| format!("Failed to get catalog games: {}", e))
}

#[tauri::command]
pub fn import_dat_file(db: State<Database>, system_id: String, file_path: String) -> Result<CatalogSync, String> {
    crate::services::catalog_service::import_dat_file(&db, &system_id, &file_path)
}

#[tauri::command]
pub async fn sync_catalog(db: State<'_, Database>, system_id: String, url: Option<String>) -> Result<CatalogSync, String> {
    // Resolve URL: explicit param > user config > default mapping
    let download_url = if let Some(u) = url {
        u
    } else {
        let config = crate::services::catalog_service::get_catalog_config()?;
        if let Some(u) = config.download_urls.get(&system_id) {
            u.clone()
        } else {
            let defaults = crate::services::catalog_service::get_default_dat_urls();
            defaults.get(&system_id).cloned()
                .ok_or_else(|| format!("No download URL configured for system '{}'. Set one via Catalog > URL config.", system_id))?
        }
    };

    crate::services::catalog_service::download_and_import_dat(&db, &system_id, &download_url).await
}

#[tauri::command]
pub fn get_default_dat_urls() -> Result<HashMap<String, String>, String> {
    Ok(crate::services::catalog_service::get_default_dat_urls())
}

#[tauri::command]
pub fn refresh_catalog_ownership(db: State<Database>, system_id: Option<String>) -> Result<u32, String> {
    crate::services::catalog_service::refresh_ownership(&db, system_id.as_deref())
}

#[tauri::command]
pub fn get_catalog_config() -> Result<CatalogConfig, String> {
    crate::services::catalog_service::get_catalog_config()
}

#[tauri::command]
pub fn set_catalog_download_url(system_id: String, url: String) -> Result<(), String> {
    crate::services::catalog_service::set_download_url(&system_id, &url)
}
