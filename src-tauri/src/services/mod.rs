pub mod config_service;
pub mod scanner_service;
pub mod launcher_service;
pub mod media_service;
pub mod downloader_service;
pub mod gamelist_service;
pub mod screenscraper;
pub mod thegamesdb;
pub mod libretro;
pub mod scraper_service;
pub mod pc_import_service;
pub mod steamgriddb;
pub mod input_mapping_service;
pub mod exporters;
pub mod emulator_settings_service;
pub mod config_writers;
pub mod preferences_service;

// PC Enhanced Metadata (REQ-015)
pub mod steam_store_service;
pub mod igdb_service;
pub mod mobygames_service;
pub mod pcgamingwiki_service;
pub mod youtube_service;
pub mod web_scraper;
pub mod search_service;
pub mod pc_metadata_orchestrator;
pub mod media_import_service;
pub mod verification_service;
pub mod catalog_service;
pub mod system_wiki_service;
pub mod flash_input_service;
pub mod emulator_hotkey_service;

/// Normalize a game title for fuzzy matching:
/// lowercase, remove punctuation, collapse whitespace.
pub fn normalize_title(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' { c.to_ascii_lowercase() } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
