use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub api_key: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub enabled: bool,
    pub priority: i32,
    /// JSON array of supported types: "box_art","screenshot","video","metadata","wheel","fanart"
    pub supports: Vec<String>,
    pub requires_credentials: bool,
    pub credential_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ScrapeFilter {
    All,
    ImagesOnly,
    VideosOnly,
    MetadataOnly,
    MissingOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeJob {
    pub scraper_id: String,
    pub system_id: Option<String>,
    pub game_ids: Option<Vec<String>>,
    pub filter: ScrapeFilter,
    pub overwrite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeProgress {
    pub total: usize,
    pub current: usize,
    pub game_title: String,
    pub status: String,
    pub errors: Vec<String>,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeResult {
    pub scraped: usize,
    pub skipped: usize,
    pub errors: usize,
    pub messages: Vec<String>,
}

/// Default scrapers to seed on first run
pub fn default_scrapers() -> Vec<ScraperConfig> {
    vec![
        ScraperConfig {
            id: "screenscraper".into(),
            name: "ScreenScraper".into(),
            url: "https://www.screenscraper.fr/api2".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: true,
            priority: 1,
            supports: vec!["box_art","screenshot","video","metadata","wheel","fanart","marquee"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: true,
            credential_hint: Some("Free account at screenscraper.fr — username + password required".into()),
        },
        ScraperConfig {
            id: "thegamesdb".into(),
            name: "TheGamesDB".into(),
            url: "https://api.thegamesdb.net/v1".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: true,
            priority: 2,
            supports: vec!["box_art","screenshot","metadata","fanart"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: false,
            credential_hint: Some("Optional API key from thegamesdb.net for higher rate limits".into()),
        },
        ScraperConfig {
            id: "libretro".into(),
            name: "Libretro Thumbnails".into(),
            url: "https://thumbnails.libretro.com".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: true,
            priority: 3,
            supports: vec!["box_art","screenshot"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: false,
            credential_hint: None,
        },
        ScraperConfig {
            id: "igdb".into(),
            name: "IGDB".into(),
            url: "https://api.igdb.com/v4".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: false,
            priority: 4,
            supports: vec!["box_art","screenshot","video","metadata","fanart"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: true,
            credential_hint: Some("Requires Client-ID and Client-Secret from dev.twitch.tv (free)".into()),
        },
        ScraperConfig {
            id: "mobygames".into(),
            name: "MobyGames".into(),
            url: "https://api.mobygames.com/v1".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: false,
            priority: 5,
            supports: vec!["box_art","screenshot","metadata"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: true,
            credential_hint: Some("Free API key at mobygames.com/info/api".into()),
        },
        ScraperConfig {
            id: "arcadedb".into(),
            name: "ArcadeDB".into(),
            url: "http://adb.arcadeitalia.net/service_scraper.php".into(),
            api_key: None,
            username: None,
            password: None,
            enabled: false,
            priority: 6,
            supports: vec!["box_art","screenshot","metadata","video"].iter().map(|s| s.to_string()).collect(),
            requires_credentials: false,
            credential_hint: Some("No credentials needed — arcade games only".into()),
        },
    ]
}
