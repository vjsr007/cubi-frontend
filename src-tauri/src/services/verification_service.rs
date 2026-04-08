use std::collections::HashMap;
use std::path::Path;
use crate::db::Database;
use crate::models::{GameInfo, GameVerificationResult, VerificationStatus, VerificationSummary};
use crate::models::config::EmulatorOverride;
use crate::services::launcher_service;

/// Verify a single game: check file exists, is readable, and emulator is available.
pub fn verify_game(game: &GameInfo, emudeck_path: &str) -> GameVerificationResult {
    let file_path = Path::new(&game.file_path);

    // 1. Check if file/directory exists
    if !file_path.exists() {
        return GameVerificationResult {
            game_id: game.id.clone(),
            title: game.title.clone(),
            system_id: game.system_id.clone(),
            status: VerificationStatus::FileMissing,
            message: format!("Archivo no encontrado: {}", game.file_path),
        };
    }

    // 2. Check if file is readable (try to open it)
    if file_path.is_file() {
        match std::fs::File::open(file_path) {
            Ok(f) => {
                // Check file size > 0
                if let Ok(meta) = f.metadata() {
                    if meta.len() == 0 {
                        return GameVerificationResult {
                            game_id: game.id.clone(),
                            title: game.title.clone(),
                            system_id: game.system_id.clone(),
                            status: VerificationStatus::FileUnreadable,
                            message: "Archivo vacio (0 bytes)".to_string(),
                        };
                    }
                }
            }
            Err(e) => {
                return GameVerificationResult {
                    game_id: game.id.clone(),
                    title: game.title.clone(),
                    system_id: game.system_id.clone(),
                    status: VerificationStatus::FileUnreadable,
                    message: format!("No se puede leer el archivo: {}", e),
                };
            }
        }

        // 3. If it's a ZIP/7z, validate the magic bytes
        if game.file_path.ends_with(".zip") || game.file_path.ends_with(".7z") {
            use std::io::Read;
            let mut header = [0u8; 4];
            if let Ok(mut f) = std::fs::File::open(file_path) {
                if f.read_exact(&mut header).is_ok() {
                    let is_zip = header[0] == 0x50 && header[1] == 0x4B;
                    let is_7z = header[0] == 0x37 && header[1] == 0x7A;
                    if !is_zip && !is_7z {
                        return GameVerificationResult {
                            game_id: game.id.clone(),
                            title: game.title.clone(),
                            system_id: game.system_id.clone(),
                            status: VerificationStatus::FileUnreadable,
                            message: "Archivo comprimido corrupto o invalido (header incorrecto)".to_string(),
                        };
                    }
                }
            }
        }
    }

    // 4. Check if emulator is available for this system (skip PC games)
    if game.system_id != "pc" {
        if launcher_service::find_emulator(&game.system_id, emudeck_path).is_none() {
            return GameVerificationResult {
                game_id: game.id.clone(),
                title: game.title.clone(),
                system_id: game.system_id.clone(),
                status: VerificationStatus::EmulatorMissing,
                message: format!(
                    "No se encontro emulador para el sistema '{}'",
                    game.system_id
                ),
            };
        }
    }

    // All checks passed
    GameVerificationResult {
        game_id: game.id.clone(),
        title: game.title.clone(),
        system_id: game.system_id.clone(),
        status: VerificationStatus::Ok,
        message: "OK".to_string(),
    }
}

/// Try to launch a game with its emulator and check if it crashes within a timeout.
///
/// The emulator is spawned, then we wait up to `timeout_secs`. If the process exits
/// with a non-zero code before the timeout, the game is considered broken. If it is
/// still running after the timeout we kill it and consider it OK.
pub async fn test_launch_game(
    game: &GameInfo,
    emudeck_path: &str,
    data_root: &str,
    overrides: &HashMap<String, EmulatorOverride>,
    timeout_secs: u64,
) -> GameVerificationResult {
    // Skip PC games — we can't reliably test-launch store URLs
    if game.system_id == "pc" {
        return GameVerificationResult {
            game_id: game.id.clone(),
            title: game.title.clone(),
            system_id: game.system_id.clone(),
            status: VerificationStatus::Ok,
            message: "Juego PC — omitido de prueba de lanzamiento".to_string(),
        };
    }

    // Build the launch command
    let cmd = match launcher_service::build_launch_command(game, emudeck_path, data_root, overrides, None) {
        Ok(c) => c,
        Err(e) => {
            return GameVerificationResult {
                game_id: game.id.clone(),
                title: game.title.clone(),
                system_id: game.system_id.clone(),
                status: VerificationStatus::EmulatorMissing,
                message: e,
            };
        }
    };

    log::info!(
        "Test-launching '{}': {} {:?}",
        game.title,
        cmd.exe_path,
        cmd.args
    );

    // Spawn the emulator process
    let mut child = match tokio::process::Command::new(&cmd.exe_path)
        .args(&cmd.args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return GameVerificationResult {
                game_id: game.id.clone(),
                title: game.title.clone(),
                system_id: game.system_id.clone(),
                status: VerificationStatus::LaunchFailed,
                message: format!(
                    "No se pudo iniciar {}: {}",
                    cmd.emulator_name, e
                ),
            };
        }
    };

    // Wait up to `timeout_secs` to see if the process crashes
    let timeout = tokio::time::Duration::from_secs(timeout_secs);
    match tokio::time::timeout(timeout, child.wait()).await {
        // Process exited before timeout
        Ok(Ok(exit_status)) => {
            if exit_status.success() {
                // Exited with code 0 very fast — could be a "nothing to do" scenario,
                // still treat as OK since the emulator didn't report an error
                GameVerificationResult {
                    game_id: game.id.clone(),
                    title: game.title.clone(),
                    system_id: game.system_id.clone(),
                    status: VerificationStatus::Ok,
                    message: format!(
                        "Emulador finalizo con codigo 0 (en <{}s)",
                        timeout_secs
                    ),
                }
            } else {
                // Read stderr for error details
                let stderr_msg = if let Some(mut stderr) = child.stderr.take() {
                    use tokio::io::AsyncReadExt;
                    let mut buf = Vec::new();
                    let _ = stderr.read_to_end(&mut buf).await;
                    let raw = String::from_utf8_lossy(&buf);
                    // Take last 300 chars to keep it concise
                    let trimmed = if raw.len() > 300 {
                        &raw[raw.len() - 300..]
                    } else {
                        &raw
                    };
                    trimmed.trim().to_string()
                } else {
                    String::new()
                };

                let code = exit_status.code().unwrap_or(-1);
                GameVerificationResult {
                    game_id: game.id.clone(),
                    title: game.title.clone(),
                    system_id: game.system_id.clone(),
                    status: VerificationStatus::LaunchFailed,
                    message: format!(
                        "{} fallo (codigo {}): {}",
                        cmd.emulator_name,
                        code,
                        if stderr_msg.is_empty() {
                            "sin mensaje de error".to_string()
                        } else {
                            stderr_msg
                        }
                    ),
                }
            }
        }
        // Process wait failed
        Ok(Err(e)) => GameVerificationResult {
            game_id: game.id.clone(),
            title: game.title.clone(),
            system_id: game.system_id.clone(),
            status: VerificationStatus::LaunchFailed,
            message: format!("Error esperando al emulador: {}", e),
        },
        // Timeout elapsed — process is still running, it loaded fine
        Err(_) => {
            // Kill the emulator process
            let _ = child.kill().await;
            GameVerificationResult {
                game_id: game.id.clone(),
                title: game.title.clone(),
                system_id: game.system_id.clone(),
                status: VerificationStatus::Ok,
                message: format!(
                    "Emulador ejecuto correctamente por {}s — juego funciona",
                    timeout_secs
                ),
            }
        }
    }
}

fn accumulate_result(
    result: &GameVerificationResult,
    summary: &mut VerificationSummary,
) {
    match result.status {
        VerificationStatus::Ok => summary.ok += 1,
        VerificationStatus::FileMissing => {
            summary.file_missing += 1;
            summary.results.push(result.clone());
        }
        VerificationStatus::FileUnreadable => {
            summary.file_unreadable += 1;
            summary.results.push(result.clone());
        }
        VerificationStatus::EmulatorMissing => {
            summary.emulator_missing += 1;
            summary.results.push(result.clone());
        }
        VerificationStatus::LaunchFailed => {
            summary.launch_failed += 1;
            summary.results.push(result.clone());
        }
        VerificationStatus::Unverified => {}
    }
}

/// Verify all games in the database and update their verification status.
pub fn verify_all_games(
    db: &Database,
    emudeck_path: &str,
) -> Result<VerificationSummary, String> {
    let games = db.get_all_games().map_err(|e| e.to_string())?;
    let mut summary = VerificationSummary {
        total: games.len() as u32,
        ok: 0,
        file_missing: 0,
        file_unreadable: 0,
        emulator_missing: 0,
        launch_failed: 0,
        results: Vec::new(),
    };

    for game in &games {
        let result = verify_game(game, emudeck_path);
        let _ = db.update_verification_status(
            &result.game_id,
            &result.status,
            Some(&result.message),
        );
        accumulate_result(&result, &mut summary);
    }

    Ok(summary)
}

/// Verify games for a specific system only.
pub fn verify_system_games(
    db: &Database,
    system_id: &str,
    emudeck_path: &str,
) -> Result<VerificationSummary, String> {
    let games = db.get_games(system_id).map_err(|e| e.to_string())?;
    let mut summary = VerificationSummary {
        total: games.len() as u32,
        ok: 0,
        file_missing: 0,
        file_unreadable: 0,
        emulator_missing: 0,
        launch_failed: 0,
        results: Vec::new(),
    };

    for game in &games {
        let result = verify_game(game, emudeck_path);
        let _ = db.update_verification_status(
            &result.game_id,
            &result.status,
            Some(&result.message),
        );
        accumulate_result(&result, &mut summary);
    }

    Ok(summary)
}

/// Test-launch a single game and return the result.
pub async fn test_launch_single(
    db: &Database,
    game: &GameInfo,
    emudeck_path: &str,
    data_root: &str,
    overrides: &HashMap<String, EmulatorOverride>,
    timeout_secs: u64,
) -> GameVerificationResult {
    let result = test_launch_game(game, emudeck_path, data_root, overrides, timeout_secs).await;
    let _ = db.update_verification_status(
        &result.game_id,
        &result.status,
        Some(&result.message),
    );
    result
}

/// Delete a game from DB and optionally delete the ROM file from disk.
pub fn delete_game_with_file(
    db: &Database,
    game_id: &str,
    delete_file: bool,
) -> Result<String, String> {
    let game = db.get_game(game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Juego no encontrado: {}", game_id))?;

    let system_id = game.system_id.clone();
    let file_path = game.file_path.clone();

    db.delete_game(game_id).map_err(|e| e.to_string())?;
    let _ = db.update_system_game_count(&system_id);

    if delete_file {
        let path = Path::new(&file_path);
        if path.exists() {
            if path.is_dir() {
                std::fs::remove_dir_all(path)
                    .map_err(|e| format!("Error eliminando directorio '{}': {}", file_path, e))?;
            } else {
                std::fs::remove_file(path)
                    .map_err(|e| format!("Error eliminando archivo '{}': {}", file_path, e))?;
            }
        }
    }

    Ok(format!("Juego '{}' eliminado correctamente", game.title))
}
