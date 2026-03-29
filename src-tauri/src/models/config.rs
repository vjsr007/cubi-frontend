use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub paths: PathsConfig,
    #[serde(default)]
    pub scanner: ScannerConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            paths: PathsConfig::default(),
            scanner: ScannerConfig::default(),
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
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            version: "0.1.0".to_string(),
            theme: "dark".to_string(),
            language: "en".to_string(),
            fullscreen: true,
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
