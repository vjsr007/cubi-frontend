//! PC metadata enrichment pipeline (TASK-015-10).
//! Priority order: Steam Store → IGDB → SteamGridDB → MobyGames → PCGamingWiki → YouTube → Web.

use std::path::Path;

use crate::models::config::PcMetadataConfig;
use crate::models::game::{GameInfo, GameInfoPatch};
use crate::services::{
    igdb_service::IgdbService,
    mobygames_service,
    pcgamingwiki_service,
    search_service,
    steam_store_service,
    steamgriddb,
    web_scraper,
    youtube_service,
};

/// Progress callback type.
pub type ProgressFn = Box<dyn Fn(u32, u32, &str) + Send + Sync>;

pub struct PcMetadataOrchestrator {
    config: PcMetadataConfig,
    media_root: String,
}

impl PcMetadataOrchestrator {
    pub fn new(config: PcMetadataConfig, media_root: String) -> Self {
        Self { config, media_root }
    }

    /// Enrich a single PC game with all enabled metadata sources.
    /// Returns a `GameInfoPatch` with every field that was found.
    pub async fn enrich_game(
        &self,
        game: &GameInfo,
        progress: Option<&ProgressFn>,
    ) -> GameInfoPatch {
        let mut patch = GameInfoPatch::default();
        let title = &game.title;
        let dest = Path::new(&self.media_root);
        let sources = &self.config.enabled_sources;
        let total_steps = sources.len() as u32;
        let mut step = 0u32;

        let notify = |s: u32, msg: &str| {
            if let Some(f) = progress { f(s, total_steps, msg); }
        };

        // ── 1. Steam Store ─────────────────────────────────────────────
        // Steam AppID: extracted from steam:// protocol URL or "steam_" prefix in file_path
        let steam_appid: Option<&str> = {
            let fp = game.file_path.as_str();
            if fp.starts_with("steam://rungameid/") {
                Some(fp.trim_start_matches("steam://rungameid/").trim())
            } else if fp.starts_with("steam_") {
                Some(fp.trim_start_matches("steam_").trim())
            } else {
                None
            }
        };

        if sources.contains(&"steam_store".to_string()) {
            step += 1;
            notify(step, "Steam Store");
            if let Some(appid) = steam_appid {
                match steam_store_service::fetch_steam_store(appid).await {
                    Ok(Some(data)) => {
                        // Download media first (borrows data)
                        if let Ok(media) = steam_store_service::download_steam_media(
                            &data, dest, title,
                            self.config.max_screenshots, false,
                        ).await {
                            if patch.background_art.is_none() { patch.background_art = media.background; }
                            if patch.screenshots.is_none() && !media.screenshots.is_empty() {
                                patch.screenshots = Some(media.screenshots);
                            }
                        }
                        // Then move fields out
                        if patch.description.is_none() { patch.description = data.description; }
                        if patch.developer.is_none() { patch.developer = data.developer; }
                        if patch.publisher.is_none() { patch.publisher = data.publisher; }
                        if patch.year.is_none() { patch.year = data.year; }
                        if patch.genre.is_none() { patch.genre = data.genre; }
                        if patch.metacritic_score.is_none() { patch.metacritic_score = data.metacritic_score; }
                        if patch.website.is_none() { patch.website = data.website; }
                        if patch.tags.is_none() && !data.tags.is_empty() {
                            patch.tags = Some(data.tags);
                        }
                        // Trailer URL (remote)
                        if patch.trailer_url.is_none() { patch.trailer_url = data.trailer_url; }
                        steam_store_service::rate_limit_sleep().await;
                    }
                    Ok(None) => {}
                    Err(e) => log::warn!("Steam Store: {}", e),
                }
            }
        }

        // ── 2. IGDB ────────────────────────────────────────────────────
        if sources.contains(&"igdb".to_string()) {
            if let (Some(id), Some(secret)) = (
                &self.config.igdb_client_id,
                &self.config.igdb_client_secret,
            ) {
                step += 1;
                notify(step, "IGDB");
                let svc = IgdbService::new(id.clone(), secret.clone());
                match svc.search_game(title).await {
                    Ok(Some(data)) => {
                        if patch.description.is_none() { patch.description = data.description.clone(); }
                        if patch.developer.is_none() { patch.developer = data.developer.clone(); }
                        if patch.publisher.is_none() { patch.publisher = data.publisher.clone(); }
                        if patch.year.is_none() { patch.year = data.year.clone(); }
                        if patch.genre.is_none() { patch.genre = data.genre.clone(); }
                        if patch.website.is_none() { patch.website = data.website.clone(); }
                        if patch.igdb_id.is_none() { patch.igdb_id = Some(data.igdb_id); }
                        // YouTube trailer from IGDB videos
                        if patch.trailer_url.is_none() {
                            if let Some(vid_id) = &data.trailer_youtube_id {
                                patch.trailer_url = Some(format!("https://www.youtube.com/watch?v={}", vid_id));
                            }
                        }
                        // Download cover + screenshots
                        if let Ok(media) = svc.download_igdb_media(
                            &data, dest, title,
                            self.config.max_screenshots, false,
                        ).await {
                            if game.box_art.is_none() && patch.box_art.is_none() {
                                patch.box_art = media.cover;
                            }
                            if patch.screenshots.is_none() && !media.screenshots.is_empty() {
                                patch.screenshots = Some(media.screenshots);
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(e) => log::warn!("IGDB: {}", e),
                }
            }
        }

        // ── 3. SteamGridDB (hero, logo, background) ───────────────────
        if sources.contains(&"steamgriddb".to_string()) {
            if let Some(sgdb_key) = &self.config.steamgriddb_api_key {
                step += 1;
                notify(step, "SteamGridDB");
                let hero = if let Some(appid) = steam_appid {
                    steamgriddb::fetch_hero_by_steam_appid(appid, sgdb_key).await
                } else {
                    steamgriddb::fetch_hero_by_name(title, sgdb_key).await
                };
                if patch.hero_art.is_none() { patch.hero_art = hero; }

                let logo = if let Some(appid) = steam_appid {
                    steamgriddb::fetch_logo_by_steam_appid(appid, sgdb_key).await
                } else {
                    steamgriddb::fetch_logo_by_name(title, sgdb_key).await
                };
                if patch.logo.is_none() { patch.logo = logo; }

                if patch.background_art.is_none() {
                    let bg = if let Some(appid) = steam_appid {
                        steamgriddb::fetch_background_by_steam_appid(appid, sgdb_key).await
                    } else {
                        steamgriddb::fetch_background_by_name(title, sgdb_key).await
                    };
                    patch.background_art = bg;
                }
            }
        }

        // ── 4. MobyGames ──────────────────────────────────────────────
        if sources.contains(&"mobygames".to_string()) {
            if let Some(moby_key) = &self.config.mobygames_api_key {
                step += 1;
                notify(step, "MobyGames");
                match mobygames_service::search_game(moby_key, title).await {
                    Ok(Some(data)) => {
                        if patch.description.is_none() { patch.description = data.description; }
                        if patch.developer.is_none() { patch.developer = data.developer; }
                        if patch.publisher.is_none() { patch.publisher = data.publisher; }
                        if patch.year.is_none() { patch.year = data.year; }
                        if patch.genre.is_none() { patch.genre = data.genre; }

                        if data.moby_id > 0 && patch.screenshots.is_none() {
                            let urls = mobygames_service::fetch_screenshots(
                                moby_key, data.moby_id,
                                self.config.max_screenshots as usize,
                            ).await;
                            if !urls.is_empty() {
                                let paths = mobygames_service::download_screenshots(
                                    &urls, dest, title, false,
                                ).await;
                                if !paths.is_empty() { patch.screenshots = Some(paths); }
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(e) => log::warn!("MobyGames: {}", e),
                }
            }
        }

        // ── 5. PCGamingWiki ───────────────────────────────────────────
        if sources.contains(&"pcgamingwiki".to_string()) {
            step += 1;
            notify(step, "PCGamingWiki");
            match pcgamingwiki_service::find_page(title).await {
                Ok(Some(page)) => {
                    if patch.pcgamingwiki_url.is_none() {
                        patch.pcgamingwiki_url = Some(page.page_url.clone());
                    }
                    // Fetch infobox for scores
                    match pcgamingwiki_service::fetch_infobox(&page.page_title).await {
                        Ok(info) => {
                            if patch.metacritic_score.is_none() { patch.metacritic_score = info.metacritic_score; }
                            // Prefer PCGamingWiki Steam AppID if we don't have one yet
                            if let Some(appid) = info.steam_appid {
                                log::debug!("PCGamingWiki found Steam AppID: {}", appid);
                            }
                        }
                        Err(e) => log::warn!("PCGamingWiki infobox: {}", e),
                    }
                }
                Ok(None) => {}
                Err(e) => log::warn!("PCGamingWiki: {}", e),
            }
        }

        // ── 6. YouTube trailer ────────────────────────────────────────
        if sources.contains(&"youtube".to_string()) && patch.trailer_url.is_none() {
            step += 1;
            notify(step, "YouTube");
            let yt_key = self.config.youtube_api_key.as_deref();
            match youtube_service::search_trailer(title, yt_key).await {
                Ok(Some(video)) => {
                    if self.config.download_trailers {
                        let ext = "mp4";
                        let safe = sanitize(title);
                        let local = dest.join("pc").join("trailers").join(format!("{}.{}", safe, ext));
                        match youtube_service::download_video(&video.url, &local).await {
                            Ok(_) => patch.trailer_local = Some(local.to_string_lossy().to_string()),
                            Err(e) => {
                                log::warn!("yt-dlp download: {}", e);
                                patch.trailer_url = Some(video.url);
                            }
                        }
                    } else {
                        patch.trailer_url = Some(video.url);
                    }
                }
                Ok(None) => {}
                Err(e) => log::warn!("YouTube: {}", e),
            }
        }

        // ── 7. Web scraper (official site) ────────────────────────────
        if sources.contains(&"web_scraper".to_string()) {
            // Only run if we still have gaps
            let has_gaps = patch.description.is_none()
                || patch.developer.is_none()
                || patch.website.is_none();

            if has_gaps {
                step += 1;
                notify(step, "Web Scraper");
                let search_results = search_service::search_official_site(title, 5).await;
                let urls: Vec<String> = search_results.iter().map(|r| r.url.clone()).collect();
                if let Some(site_url) = search_service::pick_official_site(&urls, title) {
                    if patch.website.is_none() {
                        patch.website = Some(site_url.clone());
                    }
                    let scraped = web_scraper::scrape(&site_url, self.config.use_headless_browser).await;
                    if patch.description.is_none() { patch.description = scraped.description; }
                    if patch.developer.is_none() { patch.developer = scraped.developer; }
                    if patch.publisher.is_none() { patch.publisher = scraped.publisher; }
                    if patch.genre.is_none() { patch.genre = scraped.genre; }
                }
            }
        }

        patch
    }
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| match c { '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_', c => c })
        .collect::<String>()
        .trim()
        .to_string()
}
