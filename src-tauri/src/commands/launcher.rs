use tauri::State;
use crate::db::Database;
use crate::services::{launcher_service, config_service};

#[tauri::command]
pub async fn launch_game(
    db: State<'_, Database>,
    game_id: String,
) -> Result<(), String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let config = config_service::load_config()?;
    launcher_service::launch_game(&game, &config.paths.emudeck_path, &config.paths.data_root, &config.emulators).await?;
    db.update_play_stats(&game_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_emulator_status(system_id: String) -> Result<Option<String>, String> {
    let config = config_service::load_config()?;
    let result = launcher_service::find_emulator(&system_id, &config.paths.emudeck_path);
    Ok(result.map(|(path, name)| format!("{} ({})", name, path)))
}

#[tauri::command]
pub fn get_all_emulator_info() -> Result<Vec<launcher_service::SystemEmulatorInfo>, String> {
    let config = config_service::load_config()?;
    Ok(launcher_service::get_all_emulator_info(
        &config.paths.emudeck_path,
        &config.emulators,
    ))
}
