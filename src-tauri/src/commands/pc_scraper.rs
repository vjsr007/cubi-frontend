//! Tauri commands for PC metadata enrichment (TASK-015-11).

use tauri::{Emitter, State};

use crate::db::Database;
use crate::models::config::PcMetadataConfig;
use crate::models::game::GameInfoPatch;
use crate::services::{
    config_service,
    pc_metadata_orchestrator::PcMetadataOrchestrator,
    youtube_service,
};

/// Status of optional tools (yt-dlp, Chrome).
#[derive(serde::Serialize)]
pub struct PcToolsStatus {
    pub ytdlp_available: bool,
    pub ytdlp_path: Option<String>,
    pub chrome_available: bool,
    pub chrome_path: Option<String>,
}

/// Per-game result returned after scraping.
#[derive(serde::Serialize)]
pub struct PcScrapeResult {
    pub game_id: String,
    pub title: String,
    pub ok: bool,
    pub error: Option<String>,
    pub fields_updated: u32,
}

/// Job progress event payload.
#[derive(Clone, serde::Serialize)]
pub struct PcScrapeProgress {
    pub current: u32,
    pub total: u32,
    pub game_title: String,
    pub source: String,
    pub done: bool,
}

/// Check which optional scraper tools are installed.
#[tauri::command]
pub fn check_pc_scraper_tools() -> PcToolsStatus {
    let ytdlp = youtube_service::check_ytdlp();
    let chrome = youtube_service::check_chrome();
    PcToolsStatus {
        ytdlp_available: ytdlp.is_some(),
        ytdlp_path: ytdlp.map(|p| p.to_string_lossy().to_string()),
        chrome_available: chrome.is_some(),
        chrome_path: chrome.map(|p| p.to_string_lossy().to_string()),
    }
}

/// Get the current PC metadata config section.
#[tauri::command]
pub fn get_pc_metadata_config() -> Result<PcMetadataConfig, String> {
    let cfg = config_service::load_config()?;
    Ok(cfg.pc_metadata)
}

/// Save PC metadata config section (merges into full config).
#[tauri::command]
pub fn save_pc_metadata_config(pc_metadata: PcMetadataConfig) -> Result<(), String> {
    let mut cfg = config_service::load_config()?;
    cfg.pc_metadata = pc_metadata;
    config_service::save_config(&cfg)
}

/// Enrich a single PC game with all enabled metadata sources.
#[tauri::command]
pub async fn scrape_single_pc_game(
    game_id: String,
    db: State<'_, Database>,
) -> Result<PcScrapeResult, String> {
    let game = db.get_game(&game_id).map_err(|e| e.to_string())?.ok_or("Game not found")?;
    let cfg = config_service::load_config()?;
    let media_root = cfg.paths.data_root.clone() + "/storage/downloaded_media";

    let orchestrator = PcMetadataOrchestrator::new(cfg.pc_metadata, media_root);
    let patch = orchestrator.enrich_game(&game, None).await;

    if patch.is_empty() {
        return Ok(PcScrapeResult {
            game_id,
            title: game.title,
            ok: true,
            error: None,
            fields_updated: 0,
        });
    }

    let fields_updated = count_patch_fields(&patch);
    db.patch_game(&game_id, &patch).map_err(|e| e.to_string())?;

    Ok(PcScrapeResult {
        game_id,
        title: game.title,
        ok: true,
        error: None,
        fields_updated,
    })
}

/// Enrich all PC games (system_id = "pc") in batch.
#[tauri::command]
pub async fn run_pc_metadata_job(
    game_ids: Option<Vec<String>>,
    db: State<'_, Database>,
    app: tauri::AppHandle,
) -> Result<Vec<PcScrapeResult>, String> {
    let cfg = config_service::load_config()?;
    let media_root = cfg.paths.data_root.clone() + "/storage/downloaded_media";

    let games = if let Some(ids) = game_ids {
        ids.into_iter()
            .filter_map(|id| db.get_game(&id).ok().flatten())
            .collect::<Vec<_>>()
    } else {
        db.get_pc_games().map_err(|e| e.to_string())?
    };

    let total = games.len() as u32;
    let mut results = Vec::with_capacity(games.len());

    for (i, game) in games.iter().enumerate() {
        // Emit progress
        let _ = app.emit("pc_scrape_progress", PcScrapeProgress {
            current: i as u32 + 1,
            total,
            game_title: game.title.clone(),
            source: "starting".to_string(),
            done: false,
        });

        let orchestrator = PcMetadataOrchestrator::new(cfg.pc_metadata.clone(), media_root.clone());
        let patch = orchestrator.enrich_game(game, None).await;

        let fields_updated = count_patch_fields(&patch);
        if !patch.is_empty() {
            if let Err(e) = db.patch_game(&game.id, &patch) {
                results.push(PcScrapeResult {
                    game_id: game.id.clone(),
                    title: game.title.clone(),
                    ok: false,
                    error: Some(e.to_string()),
                    fields_updated: 0,
                });
                continue;
            }
        }

        results.push(PcScrapeResult {
            game_id: game.id.clone(),
            title: game.title.clone(),
            ok: true,
            error: None,
            fields_updated,
        });
    }

    // Done event
    let _ = app.emit("pc_scrape_progress", PcScrapeProgress {
        current: total,
        total,
        game_title: String::new(),
        source: String::new(),
        done: true,
    });

    Ok(results)
}

fn count_patch_fields(p: &GameInfoPatch) -> u32 {
    [
        p.title.is_some(), p.box_art.is_some(), p.description.is_some(),
        p.developer.is_some(), p.publisher.is_some(), p.year.is_some(),
        p.genre.is_some(), p.hero_art.is_some(), p.logo.is_some(),
        p.background_art.is_some(), p.screenshots.is_some(), p.trailer_url.is_some(),
        p.trailer_local.is_some(), p.metacritic_score.is_some(), p.tags.is_some(),
        p.website.is_some(), p.pcgamingwiki_url.is_some(), p.igdb_id.is_some(),
    ].iter().filter(|&&b| b).count() as u32
}
