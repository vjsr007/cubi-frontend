use std::path::PathBuf;
use crate::models::AppConfig;

pub fn get_config_path() -> Result<PathBuf, String> {
    let dirs = directories::ProjectDirs::from("dev", "cubi", "cubi-frontend")
        .ok_or_else(|| "Could not determine config directory".to_string())?;
    let config_dir = dirs.config_dir().to_path_buf();
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Could not create config directory: {}", e))?;
    Ok(config_dir.join("config.toml"))
}

pub fn load_config() -> Result<AppConfig, String> {
    let path = get_config_path()?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Could not read config: {}", e))?;
    toml::from_str(&content)
        .map_err(|e| format!("Invalid config format: {}", e))
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path()?;
    let content = toml::to_string_pretty(config)
        .map_err(|e| format!("Could not serialize config: {}", e))?;
    std::fs::write(&path, content)
        .map_err(|e| format!("Could not write config: {}", e))
}

pub fn detect_emudeck() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let p = PathBuf::from(&appdata).join("emudeck").join("Emulators");
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
        }
        for drive in &["C:", "D:", "E:"] {
            let p = PathBuf::from(drive).join("EmuDeck").join("Emulators");
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let p = PathBuf::from(&home).join("Emulation");
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }
    None
}
