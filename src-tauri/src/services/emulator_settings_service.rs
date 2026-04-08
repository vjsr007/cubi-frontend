use std::collections::HashMap;

use crate::db::Database;
use crate::models::{
    all_setting_definitions, ConfigWriterInfo, EmulatorSettingValue, SettingDefinition,
};
use crate::services::config_writers::{
    DolphinConfigWriter, DuckStationConfigWriter, EmulatorConfigWriter, Pcsx2ConfigWriter,
    PpssppConfigWriter, RetroArchConfigWriter, Rpcs3ConfigWriter, RuffleConfigWriter,
    RyujinxConfigWriter, XemuConfigWriter,
};

/// Seed all canonical setting definitions into the database.
pub fn seed_setting_definitions(db: &Database) {
    for def in all_setting_definitions() {
        if let Err(e) = db.upsert_setting_definition(&def) {
            log::warn!("Failed to seed setting definition '{}': {}", def.key, e);
        }
    }
    log::info!("Emulator setting definitions seeded");
}

/// Factory: return the config writer for a given emulator name.
pub fn get_config_writer(emulator_name: &str) -> Option<Box<dyn EmulatorConfigWriter>> {
    match emulator_name {
        "RetroArch"   => Some(Box::new(RetroArchConfigWriter)),
        "Dolphin"     => Some(Box::new(DolphinConfigWriter)),
        "PCSX2"       => Some(Box::new(Pcsx2ConfigWriter)),
        "DuckStation" => Some(Box::new(DuckStationConfigWriter)),
        "PPSSPP"      => Some(Box::new(PpssppConfigWriter)),
        "RPCS3"       => Some(Box::new(Rpcs3ConfigWriter)),
        "xemu"        => Some(Box::new(XemuConfigWriter)),
        "Ryujinx"     => Some(Box::new(RyujinxConfigWriter)),
        "Ruffle"      => Some(Box::new(RuffleConfigWriter)),
        _ => None,
    }
}

/// Returns info for all 8 config writers (frontend needs this for tabs/UI).
pub fn get_all_config_writers_info() -> Vec<ConfigWriterInfo> {
    let writers: Vec<Box<dyn EmulatorConfigWriter>> = vec![
        Box::new(RetroArchConfigWriter),
        Box::new(DolphinConfigWriter),
        Box::new(Pcsx2ConfigWriter),
        Box::new(DuckStationConfigWriter),
        Box::new(PpssppConfigWriter),
        Box::new(Rpcs3ConfigWriter),
        Box::new(XemuConfigWriter),
        Box::new(RyujinxConfigWriter),
        Box::new(RuffleConfigWriter),
    ];

    writers
        .iter()
        .map(|w| ConfigWriterInfo {
            emulator_name: w.emulator_name().to_string(),
            config_format: w.config_format().to_string(),
            supported_settings: w.supported_settings().iter().map(|s| s.to_string()).collect(),
            default_config_path: w.default_config_path(),
        })
        .collect()
}

/// Load settings for an emulator from DB, merging with canonical defaults.
pub fn get_merged_settings(
    db: &Database,
    emulator_name: &str,
) -> Result<HashMap<String, String>, String> {
    let defs = db
        .get_setting_definitions()
        .map_err(|e| format!("Failed to load setting defs: {}", e))?;
    let stored = db
        .get_emulator_settings(emulator_name)
        .map_err(|e| format!("Failed to load settings for {}: {}", emulator_name, e))?;

    let stored_map: HashMap<String, String> = stored
        .into_iter()
        .map(|s| (s.setting_key, s.value))
        .collect();

    // Get supported keys for this emulator
    let writer = get_config_writer(emulator_name);
    let supported: Vec<&str> = writer
        .as_ref()
        .map(|w| w.supported_settings())
        .unwrap_or_default();

    let mut result = HashMap::new();
    for def in &defs {
        if supported.contains(&def.key.as_str()) {
            // Locked settings (vsync) always use the default
            if def.locked {
                result.insert(def.key.clone(), def.default_value.clone());
            } else if let Some(v) = stored_map.get(&def.key) {
                result.insert(def.key.clone(), v.clone());
            } else {
                result.insert(def.key.clone(), def.default_value.clone());
            }
        }
    }
    Ok(result)
}

/// Preview config for an emulator using its current merged settings.
pub fn preview_emulator_config(db: &Database, emulator_name: &str) -> Result<String, String> {
    let writer = get_config_writer(emulator_name)
        .ok_or_else(|| format!("No config writer for emulator: {}", emulator_name))?;
    let settings = get_merged_settings(db, emulator_name)?;
    Ok(writer.preview_config(&settings))
}

/// Get all stored setting values for all emulators (flat list).
pub fn get_all_emulator_setting_values(db: &Database) -> Result<Vec<EmulatorSettingValue>, String> {
    db.get_all_emulator_settings()
        .map_err(|e| format!("Failed to load all emulator settings: {}", e))
}

/// Get setting definitions from DB.
pub fn get_setting_defs(db: &Database) -> Result<Vec<SettingDefinition>, String> {
    db.get_setting_definitions()
        .map_err(|e| format!("Failed to load setting definitions: {}", e))
}

/// Set a single emulator setting. Enforces locked values (vsync = false always).
pub fn set_setting(
    db: &Database,
    emulator_name: &str,
    setting_key: &str,
    value: &str,
) -> Result<(), String> {
    // Check that this setting is not locked
    let defs = db
        .get_setting_definitions()
        .map_err(|e| format!("DB error: {}", e))?;

    if let Some(def) = defs.iter().find(|d| d.key == setting_key) {
        if def.locked {
            return Err(format!(
                "Setting '{}' is locked and cannot be changed (value is always '{}')",
                setting_key, def.default_value
            ));
        }
    }

    db.set_emulator_setting(emulator_name, setting_key, value)
        .map_err(|e| format!("Failed to save setting: {}", e))
}

/// Reset all settings for an emulator back to defaults.
pub fn reset_settings(db: &Database, emulator_name: &str) -> Result<(), String> {
    db.delete_emulator_settings(emulator_name)
        .map_err(|e| format!("Failed to reset settings for {}: {}", emulator_name, e))
}
