use std::collections::HashMap;
use tauri::State;
use crate::db::Database;
use crate::models::{GameVerificationResult, VerificationSummary};
use crate::models::config::EmulatorOverride;
use crate::services::{config_service, verification_service};

/// Verify all games in the library (file checks only, no launch test).
#[tauri::command]
pub fn verify_all_games(db: State<'_, Database>) -> Result<VerificationSummary, String> {
    let config = config_service::load_config().map_err(|e| e.to_string())?;
    let emudeck_path = config.paths.emudeck_path;
    verification_service::verify_all_games(&db, &emudeck_path)
}

/// Verify games for a specific system (file checks only).
#[tauri::command]
pub fn verify_system_games(
    system_id: String,
    db: State<'_, Database>,
) -> Result<VerificationSummary, String> {
    let config = config_service::load_config().map_err(|e| e.to_string())?;
    let emudeck_path = config.paths.emudeck_path;
    verification_service::verify_system_games(&db, &system_id, &emudeck_path)
}

/// Test-launch a single game with its emulator to verify it actually works.
/// The emulator runs for up to `timeout_secs` (default 5). If it crashes before
/// the timeout the game is marked as LaunchFailed; if still running it is killed
/// and marked Ok.
#[tauri::command]
pub async fn test_launch_game(
    game_id: String,
    timeout_secs: Option<u64>,
    db: State<'_, Database>,
) -> Result<GameVerificationResult, String> {
    let config = config_service::load_config().map_err(|e| e.to_string())?;
    let emudeck_path = config.paths.emudeck_path;
    let data_root = config.paths.data_root;

    let game = db
        .get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Juego no encontrado: {}", game_id))?;

    // Build overrides map from config
    let overrides: HashMap<String, EmulatorOverride> = config
        .emulators
        .into_iter()
        .collect();

    let timeout = timeout_secs.unwrap_or(5);
    let result = verification_service::test_launch_single(
        &db, &game, &emudeck_path, &data_root, &overrides, timeout,
    )
    .await;

    Ok(result)
}

/// Get all games that failed verification (any non-ok status).
#[tauri::command]
pub fn get_broken_games(db: State<'_, Database>) -> Result<Vec<GameVerificationResult>, String> {
    let mut results = Vec::new();

    for status in &["file_missing", "file_unreadable", "emulator_missing", "launch_failed"] {
        let games = db.get_games_by_verification(status).map_err(|e| e.to_string())?;
        for game in games {
            results.push(GameVerificationResult {
                game_id: game.id,
                title: game.title,
                system_id: game.system_id,
                status: game.verification_status,
                message: game.verification_message.unwrap_or_default(),
            });
        }
    }

    Ok(results)
}

/// Delete a game from the library (and optionally from disk).
#[tauri::command]
pub fn delete_broken_game(
    game_id: String,
    delete_file: bool,
    db: State<'_, Database>,
) -> Result<String, String> {
    verification_service::delete_game_with_file(&db, &game_id, delete_file)
}

/// Batch-delete multiple games (by IDs) from the library and optionally from disk.
#[tauri::command]
pub fn delete_broken_games(
    game_ids: Vec<String>,
    delete_files: bool,
    db: State<'_, Database>,
) -> Result<String, String> {
    let mut deleted = 0u32;
    let mut errors = Vec::new();

    for game_id in &game_ids {
        match verification_service::delete_game_with_file(&db, game_id, delete_files) {
            Ok(_) => deleted += 1,
            Err(e) => errors.push(format!("{}: {}", game_id, e)),
        }
    }

    if errors.is_empty() {
        Ok(format!("{} juegos eliminados correctamente", deleted))
    } else {
        Ok(format!(
            "{} eliminados, {} errores: {}",
            deleted,
            errors.len(),
            errors.join("; ")
        ))
    }
}
