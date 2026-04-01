use tauri::State;
use crate::db::Database;
use crate::models::SystemWiki;

#[tauri::command]
pub fn get_system_wiki(db: State<Database>, system_id: String) -> Result<Option<SystemWiki>, String> {
    db.get_system_wiki(&system_id)
        .map_err(|e| format!("Failed to get system wiki: {}", e))
}

#[tauri::command]
pub fn get_all_system_wiki(db: State<Database>) -> Result<Vec<SystemWiki>, String> {
    db.get_all_system_wiki()
        .map_err(|e| format!("Failed to get all system wiki: {}", e))
}

#[tauri::command]
pub fn update_system_wiki(db: State<Database>, wiki: SystemWiki) -> Result<(), String> {
    db.upsert_system_wiki(&wiki)
        .map_err(|e| format!("Failed to update system wiki: {}", e))
}

#[tauri::command]
pub fn reset_system_wiki(db: State<Database>) -> Result<u32, String> {
    let entries = crate::services::system_wiki_service::get_builtin_wiki_data();
    let count = entries.len() as u32;
    for wiki in &entries {
        db.upsert_system_wiki(wiki)
            .map_err(|e| format!("Failed to reset wiki for {}: {}", wiki.system_id, e))?;
    }
    Ok(count)
}
