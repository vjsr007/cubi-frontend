use tauri::State;
use crate::db::Database;
use crate::services::{launcher_service, config_service, preferences_service, flash_input_service, emulator_hotkey_service};

#[tauri::command]
pub async fn launch_game(
    db: State<'_, Database>,
    game_id: String,
) -> Result<(), String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let config = config_service::load_config()?;

    // Get emulator preference with hierarchy: game override → system preference → default
    let preferred_emulator = {
        let conn = db.conn.lock().map_err(|_| "Failed to acquire database lock".to_string())?;
        
        // Check for game-specific override first
        let game_override = preferences_service::get_game_override(&game_id, &conn)?;
        
        if game_override.is_some() {
            game_override
        } else {
            // Fall back to system preference
            preferences_service::get_preference(&game.system_id, &conn)?
        }
    };

    // ── Resolve process name for hotkey monitor ──────────────────────
    // For systems launched directly (pc, mugen, android, web) we can't easily
    // determine the process name, so hotkey monitor is emulator-only.
    let is_direct_launch = matches!(game.system_id.as_str(), "pc" | "mugen" | "android" | "web");

    let emulator_process_name: Option<String> = if !is_direct_launch {
        launcher_service::build_launch_command(
            &game,
            &config.paths.emudeck_path,
            &config.paths.data_root,
            &config.emulators,
            preferred_emulator.as_deref(),
        ).ok().map(|cmd| {
            // Extract exe filename without extension for process matching
            std::path::Path::new(&cmd.exe_path)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| cmd.emulator_name.clone())
        })
    } else {
        None
    };

    // ── Flash: start gamepad→keyboard relay ──────────────────────────
    let relay = if game.system_id == "flash" {
        let flash_mappings = db.get_flash_key_mappings(&game.id).unwrap_or_default();
        let flash_config = db.get_flash_game_config(&game.id)
            .ok()
            .flatten()
            .unwrap_or_else(|| crate::models::FlashGameConfig::default_for(&game.id));

        let has_work = !flash_mappings.is_empty()
            || flash_config.left_stick_mode != crate::models::LeftStickMode::Disabled
            || flash_config.right_stick_mouse;

        if has_work {
            Some(flash_input_service::start_relay(flash_mappings, flash_config))
        } else {
            None
        }
    } else {
        None
    };

    // ── Launch the game ─────────────────────────────────────────────
    let result = if let Some(emulator_name) = &preferred_emulator {
        launcher_service::launch_game_with_preference(
            &game,
            &config.paths.emudeck_path,
            &config.paths.data_root,
            &config.emulators,
            Some(emulator_name),
        ).await
    } else {
        launcher_service::launch_game(
            &game,
            &config.paths.emudeck_path,
            &config.paths.data_root,
            &config.emulators,
        ).await
    };

    if result.is_err() {
        drop(relay);
        return result;
    }

    // ── Start Select+Start hotkey monitor ────────────────────────────
    // Monitors gamepad and kills the emulator when Select+Start held ~0.5s.
    if let Some(proc_name) = emulator_process_name {
        let proc_name_for_hotkey = proc_name.clone();

        // Also handle Flash relay lifecycle in the same background task
        if let Some(relay_handle) = relay {
            tokio::spawn(async move {
                let _hotkey = emulator_hotkey_service::start_monitor(proc_name_for_hotkey.clone());
                // Wait for emulator to exit, then stop relay
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    if !is_process_running(&proc_name_for_hotkey) {
                        log::info!("Emulator exited, stopping flash input relay");
                        relay_handle.stop();
                        break;
                    }
                }
                // _hotkey dropped here, monitor stops
            });
        } else {
            tokio::spawn(async move {
                let _hotkey = emulator_hotkey_service::start_monitor(proc_name_for_hotkey.clone());
                // Keep monitor alive until emulator exits
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    if !is_process_running(&proc_name_for_hotkey) {
                        break;
                    }
                }
            });
        }
    } else if let Some(relay_handle) = relay {
        // Flash without known process name (shouldn't happen, but handle gracefully)
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            loop {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                if !is_process_running("ruffle") {
                    relay_handle.stop();
                    break;
                }
            }
        });
    }

    db.update_play_stats(&game_id).map_err(|e| e.to_string())?;

    Ok(())
}

/// Check if a process with a name containing the given string is running.
fn is_process_running(name: &str) -> bool {
    let name_lower = name.to_lowercase();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        if let Ok(output) = std::process::Command::new("tasklist")
            .args(["/FO", "CSV", "/NH"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.lines().any(|line| line.to_lowercase().contains(&name_lower))
        } else {
            false
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = std::process::Command::new("tasklist")
            .args(["/FO", "CSV", "/NH"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.lines().any(|line| line.to_lowercase().contains(&name_lower))
        } else {
            false
        }
    }
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
