use tauri::State;
use crate::db::Database;
use crate::models::{InputProfile, ButtonBinding, SystemProfileAssignment, ControllerType, all_actions, button_label};
use crate::services::input_mapping_service::{DefaultPresets, get_exporter};
use crate::services::exporters::{RetroArchExporter, EmulatorExporter};

/// Reads `input_joypad_driver` from an existing retroarch.cfg text.
/// Falls back to the platform default when the key is absent or empty.
fn detect_retroarch_driver(cfg_text: &str) -> String {
    for line in cfg_text.lines() {
        let t = line.trim();
        if t.starts_with("input_joypad_driver") {
            if let Some(pos) = t.find('=') {
                let val = t[pos + 1..].trim().trim_matches('"').trim();
                if !val.is_empty() {
                    return val.to_string();
                }
            }
        }
    }
    // Default: xinput on Windows (native Xbox controller driver),
    //          sdl2 on Linux/macOS.
    #[cfg(target_os = "windows")]
    { "xinput".to_string() }
    #[cfg(not(target_os = "windows"))]
    { "sdl2".to_string() }
}

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

// ── Bulk assignment ───────────────────────────────────────────────────────────

/// Assigns `profile_id` to every system currently in the library DB.
/// Returns the number of systems updated.
#[tauri::command]
pub fn assign_profile_to_all_systems(
    db: State<'_, Database>,
    profile_id: String,
) -> Result<usize, String> {
    let systems = db.get_systems().map_err(|e| e.to_string())?;
    let count = systems.len();
    for sys in &systems {
        db.set_system_profile_assignment(&sys.id, &profile_id)
            .map_err(|e| e.to_string())?;
    }
    Ok(count)
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

/// Writes the selected profile's input bindings directly into
/// RetroArch config by patching only the input keys. Detects EmuDeck portable
/// install automatically. Returns the absolute path of the file written.
#[tauri::command]
pub fn write_profile_to_retroarch(
    db: State<'_, Database>,
    profile_id: String,
) -> Result<String, String> {
    let bindings = db.get_profile_bindings(&profile_id).map_err(|e| e.to_string())?;

    let cfg_path = resolve_retroarch_cfg_path()?;

    // Read existing config; keep every line that isn't an input binding we'll replace.
    let existing = if cfg_path.exists() {
        std::fs::read_to_string(&cfg_path).map_err(|e| format!("Read cfg: {}", e))?
    } else {
        String::new()
    };

    // Detect which joypad driver RetroArch is already using so we write
    // matching button indices (xinput vs sdl2 have different numbering).
    let driver = detect_retroarch_driver(&existing);
    let exporter = RetroArchExporter { driver };
    let input_text = exporter.export(&bindings);

    let kept: String = existing
        .lines()
        .filter(|l| {
            let t = l.trim_start();
            !t.starts_with("input_player1_b_btn")
                && !t.starts_with("input_player1_a_btn")
                && !t.starts_with("input_player1_x_btn")
                && !t.starts_with("input_player1_y_btn")
                && !t.starts_with("input_player1_b_axis")
                && !t.starts_with("input_player1_a_axis")
                && !t.starts_with("input_player1_x_axis")
                && !t.starts_with("input_player1_y_axis")
                && !t.starts_with("input_player1_l_btn")
                && !t.starts_with("input_player1_r_btn")
                && !t.starts_with("input_player1_l2")
                && !t.starts_with("input_player1_r2")
                && !t.starts_with("input_player1_l3")
                && !t.starts_with("input_player1_r3")
                && !t.starts_with("input_player1_start")
                && !t.starts_with("input_player1_select")
                && !t.starts_with("input_player1_up")
                && !t.starts_with("input_player1_down")
                && !t.starts_with("input_player1_left")
                && !t.starts_with("input_player1_right")
                && !t.starts_with("input_player1_joypad_index")
                && !t.starts_with("input_enable_hotkey")
                && !t.starts_with("input_save_state")
                && !t.starts_with("input_load_state")
                && !t.starts_with("input_toggle_fast_forward")
                && !t.starts_with("input_screenshot")
                && !t.starts_with("input_joypad_driver")
                && !t.starts_with("input_autoconfig_enable")
                && !t.starts_with("input_driver =")
                && !t.starts_with("input_driver=")
                && !t.starts_with("# RetroArch input config")
                && !t.starts_with("# Generated:")
        })
        .collect::<Vec<_>>()
        .join("\n");

    let mut out = kept;
    if !out.is_empty() && !out.ends_with('\n') {
        out.push('\n');
    }
    out.push('\n');
    out.push_str(&input_text);

    if let Some(parent) = cfg_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Create dir: {}", e))?;
    }
    std::fs::write(&cfg_path, out).map_err(|e| format!("Write cfg: {}", e))?;
    Ok(cfg_path.to_string_lossy().to_string())
}

// ── Generic emulator config writer ──────────────────────────────────────────

/// Strips an INI section (from `[header]` to the next `[section]` or EOF).
fn strip_ini_section(text: &str, section_header: &str) -> String {
    let target = section_header.to_lowercase();
    let mut result = Vec::new();
    let mut skip = false;
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            skip = trimmed.to_lowercase() == target;
        }
        if !skip {
            result.push(line);
        }
    }
    result.join("\n")
}

/// Given an emudeck root path, find retroarch.cfg sitting next to retroarch.exe.
fn find_retroarch_in_emudeck(emudeck: &str) -> Option<std::path::PathBuf> {
    if emudeck.is_empty() { return None; }
    for rel_dir in &["RetroArch", "RetroArch-Win64"] {
        let exe = std::path::PathBuf::from(emudeck)
            .join(rel_dir)
            .join("retroarch.exe");
        if exe.exists() {
            return Some(exe.with_file_name("retroarch.cfg"));
        }
        // Some EmuDeck layouts: emudeck_path already points to RetroArch dir
        let exe2 = std::path::PathBuf::from(emudeck).join("retroarch.exe");
        if exe2.exists() {
            return Some(exe2.with_file_name("retroarch.cfg"));
        }
    }
    None
}

fn resolve_retroarch_cfg_path() -> Result<std::path::PathBuf, String> {
    // 1. EmuDeck portable: use stored emudeck_path from app config
    if let Ok(cfg) = crate::services::config_service::load_config() {
        if let Some(p) = find_retroarch_in_emudeck(&cfg.paths.emudeck_path) {
            log::info!("RetroArch cfg (stored emudeck): {}", p.display());
            return Ok(p);
        }
    }

    // 2. EmuDeck portable: auto-detect even when not configured in settings
    if let Some(detected) = crate::services::config_service::detect_emudeck() {
        if let Some(p) = find_retroarch_in_emudeck(&detected) {
            log::info!("RetroArch cfg (auto-detected emudeck): {}", p.display());
            return Ok(p);
        }
    }

    // 3. Standard AppData location (non-EmuDeck / standalone RetroArch install)
    let appdata = std::env::var_os("APPDATA")
        .ok_or_else(|| "APPDATA not found".to_string())?;
    let p = std::path::PathBuf::from(appdata).join("RetroArch").join("retroarch.cfg");
    log::info!("RetroArch cfg (standard): {}", p.display());
    Ok(p)
}

/// Returns the resolved RetroArch config path and whether that file currently exists.
/// Used by the frontend to inform the user before they click "Write".
#[tauri::command]
pub fn get_retroarch_cfg_path() -> Result<serde_json::Value, String> {
    let path = resolve_retroarch_cfg_path()?;
    Ok(serde_json::json!({
        "path": path.to_string_lossy(),
        "exists": path.exists(),
    }))
}

fn resolve_emulator_config_path(emulator_name: &str) -> Result<(std::path::PathBuf, Option<&'static str>), String> {
    match emulator_name.to_lowercase().as_str() {
        "retroarch" => {
            let p = resolve_retroarch_cfg_path()?;
            Ok((p, None)) // RetroArch uses line-based patching
        }
        "dolphin" => {
            let docs = dirs::document_dir()
                .ok_or_else(|| "Documents folder not found".to_string())?;
            let p = docs.join("Dolphin Emulator").join("Config").join("GCPadNew.ini");
            Ok((p, Some("[GCPad1]")))
        }
        "pcsx2" => {
            let docs = dirs::document_dir()
                .ok_or_else(|| "Documents folder not found".to_string())?;
            let p = docs.join("PCSX2").join("inis").join("PCSX2.ini");
            Ok((p, Some("[Pad]")))
        }
        "duckstation" => {
            let docs = dirs::document_dir()
                .ok_or_else(|| "Documents folder not found".to_string())?;
            let p = docs.join("DuckStation").join("settings.ini");
            Ok((p, Some("[Controller1]")))
        }
        other => Err(format!("Unsupported emulator for direct write: {}", other)),
    }
}

/// Writes the selected profile's input bindings directly into the emulator's
/// native config file. Supports: retroarch, dolphin, pcsx2, duckstation.
/// Returns the absolute path of the file written.
#[tauri::command]
pub fn write_profile_to_emulator(
    db: State<'_, Database>,
    profile_id: String,
    emulator_name: String,
) -> Result<String, String> {
    let bindings = db.get_profile_bindings(&profile_id).map_err(|e| e.to_string())?;

    let (cfg_path, section_header) = resolve_emulator_config_path(&emulator_name)?;

    if let Some(parent) = cfg_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Create dir: {}", e))?;
    }

    let existing = if cfg_path.exists() {
        std::fs::read_to_string(&cfg_path).map_err(|e| format!("Read cfg: {}", e))?
    } else {
        String::new()
    };

    // For RetroArch, detect the active joypad driver so we write matching
    // button indices.  For other emulators, use the generic exporter.
    let new_config = if section_header.is_none() && emulator_name.to_lowercase() == "retroarch" {
        let driver = detect_retroarch_driver(&existing);
        RetroArchExporter { driver }.export(&bindings)
    } else {
        get_exporter(&emulator_name).export(&bindings)
    };

    let mut out = match section_header {
        None => {
            // RetroArch: strip individual input_ binding lines, keep everything else
            existing
                .lines()
                .filter(|l| {
                    let t = l.trim_start();
                    !t.starts_with("input_player1_b_btn")
                        && !t.starts_with("input_player1_a_btn")
                        && !t.starts_with("input_player1_x_btn")
                        && !t.starts_with("input_player1_y_btn")
                        && !t.starts_with("input_player1_b_axis")
                        && !t.starts_with("input_player1_a_axis")
                        && !t.starts_with("input_player1_x_axis")
                        && !t.starts_with("input_player1_y_axis")
                        && !t.starts_with("input_player1_l_btn")
                        && !t.starts_with("input_player1_r_btn")
                        && !t.starts_with("input_player1_l2")
                        && !t.starts_with("input_player1_r2")
                        && !t.starts_with("input_player1_l3")
                        && !t.starts_with("input_player1_r3")
                        && !t.starts_with("input_player1_start")
                        && !t.starts_with("input_player1_select")
                        && !t.starts_with("input_player1_up")
                        && !t.starts_with("input_player1_down")
                        && !t.starts_with("input_player1_left")
                        && !t.starts_with("input_player1_right")
                        && !t.starts_with("input_player1_joypad_index")
                        && !t.starts_with("input_enable_hotkey")
                        && !t.starts_with("input_save_state")
                        && !t.starts_with("input_load_state")
                        && !t.starts_with("input_toggle_fast_forward")
                        && !t.starts_with("input_screenshot")
                        && !t.starts_with("input_joypad_driver")
                        && !t.starts_with("input_autoconfig_enable")
                        && !t.starts_with("input_driver =")
                        && !t.starts_with("input_driver=")
                        && !t.starts_with("# RetroArch input config")
                        && !t.starts_with("# Generated:")
                })
                .collect::<Vec<_>>()
                .join("\n")
        }
        Some(hdr) => strip_ini_section(&existing, hdr),
    };

    if !out.is_empty() && !out.ends_with('\n') {
        out.push('\n');
    }
    out.push('\n');
    out.push_str(&new_config);

    std::fs::write(&cfg_path, out).map_err(|e| format!("Write cfg: {}", e))?;
    Ok(cfg_path.to_string_lossy().to_string())
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
