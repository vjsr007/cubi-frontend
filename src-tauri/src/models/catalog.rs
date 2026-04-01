use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A game entry from a DAT file (No-Intro or Redump)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogGame {
    pub id: String,
    pub system_id: String,
    pub title: String,
    pub region: String,
    pub sha1: Option<String>,
    pub md5: Option<String>,
    pub crc32: Option<String>,
    pub file_size: Option<u64>,
    pub file_name: String,
    pub dat_name: String,
    pub owned: bool,
    pub owned_game_id: Option<String>,
}

/// Metadata about a synced DAT source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSync {
    pub system_id: String,
    pub dat_name: String,
    pub dat_version: String,
    pub entry_count: u32,
    pub last_synced: String,
    pub source_url: Option<String>,
}

/// Stats for a system's catalog
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSystemStats {
    pub system_id: String,
    pub system_name: String,
    pub total: u32,
    pub owned: u32,
    pub missing: u32,
    pub last_synced: Option<String>,
}

/// Paginated query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogPage {
    pub games: Vec<CatalogGame>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

/// Filter parameters for catalog queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogFilter {
    pub system_id: String,
    pub status: Option<String>,
    pub region: Option<String>,
    pub search: Option<String>,
    pub page: u32,
    pub page_size: u32,
}

/// Config section for catalog feature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogConfig {
    #[serde(default = "default_dat_source_url")]
    pub dat_source_url: String,
    #[serde(default)]
    pub auto_sync: bool,
    #[serde(default)]
    pub download_urls: HashMap<String, String>,
}

fn default_dat_source_url() -> String {
    String::new()
}

impl Default for CatalogConfig {
    fn default() -> Self {
        Self {
            dat_source_url: default_dat_source_url(),
            auto_sync: false,
            download_urls: HashMap::new(),
        }
    }
}
