use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmulatorOverride {
    /// Custom path to the emulator executable (overrides auto-detection).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exe_path: Option<String>,
    /// Custom launch arguments (use {rom} as placeholder). Overrides defaults.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra_args: Option<String>,
    /// For RetroArch systems: custom core name or path (e.g. "snes9x_libretro").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub core: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub paths: PathsConfig,
    #[serde(default)]
    pub scanner: ScannerConfig,
    /// Per-system emulator overrides, keyed by system_id (e.g. "nes", "ps2").
    #[serde(default)]
    pub emulators: HashMap<String, EmulatorOverride>,
    #[serde(default)]
    pub pc_metadata: PcMetadataConfig,
    #[serde(default)]
    pub catalog: super::catalog::CatalogConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            paths: PathsConfig::default(),
            scanner: ScannerConfig::default(),
            emulators: HashMap::new(),
            pc_metadata: PcMetadataConfig::default(),
            catalog: super::catalog::CatalogConfig::default(),
        }
    }
}

fn default_fullscreen() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralConfig {
    pub version: String,
    pub theme: String,
    pub language: String,
    #[serde(default = "default_fullscreen")]
    pub fullscreen: bool,
    /// SteamGridDB API key — used to fetch cover art for PC games.
    /// Get yours at https://www.steamgriddb.com/profile/preferences/api
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steamgriddb_api_key: Option<String>,
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            version: "0.1.0".to_string(),
            theme: "dark".to_string(),
            language: "en".to_string(),
            fullscreen: true,
            steamgriddb_api_key: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathsConfig {
    pub data_root: String,
    pub emudeck_path: String,
}

impl Default for PathsConfig {
    fn default() -> Self {
        Self {
            data_root: String::new(),
            emudeck_path: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannerConfig {
    pub auto_scan: bool,
    pub hash_roms: bool,
}

impl Default for ScannerConfig {
    fn default() -> Self {
        Self {
            auto_scan: false,
            hash_roms: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcMetadataConfig {
    #[serde(default)]
    pub igdb_client_id: Option<String>,
    #[serde(default)]
    pub igdb_client_secret: Option<String>,
    #[serde(default)]
    pub mobygames_api_key: Option<String>,
    #[serde(default)]
    pub youtube_api_key: Option<String>,
    #[serde(default)]
    pub steamgriddb_api_key: Option<String>,
    #[serde(default = "default_max_screenshots")]
    pub max_screenshots: u32,
    #[serde(default)]
    pub download_trailers: bool,
    #[serde(default)]
    pub use_headless_browser: bool,
    #[serde(default = "default_enabled_sources")]
    pub enabled_sources: Vec<String>,
}

fn default_max_screenshots() -> u32 { 5 }
fn default_enabled_sources() -> Vec<String> {
    vec![
        "steam_store".into(), "igdb".into(), "steamgriddb".into(),
        "pcgamingwiki".into(), "youtube".into(), "web_scraper".into(),
    ]
}

impl Default for PcMetadataConfig {
    fn default() -> Self {
        Self {
            igdb_client_id: None,
            igdb_client_secret: None,
            mobygames_api_key: None,
            youtube_api_key: None,
            steamgriddb_api_key: None,
            max_screenshots: 5,
            download_trailers: false,
            use_headless_browser: false,
            enabled_sources: default_enabled_sources(),
        }
    }
}
