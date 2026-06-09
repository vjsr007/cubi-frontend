use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxPlatform {
    /// Display name from RGSX (e.g. "Super Nintendo Entertainment System")
    pub platform_name: String,
    /// ROM folder name — maps to cubi system_id (e.g. "snes")
    #[serde(default)]
    pub folder: String,
    #[serde(default)]
    pub games_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxGame {
    pub name: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub size: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxDownloadResult {
    pub success: bool,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub queued: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxDownloadItem {
    #[serde(default)]
    pub downloaded_size: u64,
    #[serde(default)]
    pub total_size: u64,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub progress_percent: f32,
    #[serde(default)]
    pub game_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxProgress {
    /// Map of download URL → progress item
    #[serde(default)]
    pub downloads: HashMap<String, RgsxDownloadItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxQueueItem {
    pub game_name: String,
    pub platform: String,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgsxPlatformsResponse {
    pub success: bool,
    #[serde(default)]
    pub platforms: Vec<RgsxPlatform>,
}
