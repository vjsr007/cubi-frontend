use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::Database;
use crate::models::{GameInfo, ScrapeFilter, ScrapeJob, ScrapeProgress, ScrapeResult};
use crate::services::{screenscraper, thegamesdb, libretro};

pub async fn run_scrape_job(
    app: AppHandle,
    job: ScrapeJob,
    cancel_flag: Arc<AtomicBool>,
) -> Result<ScrapeResult, String> {
    let db = app.state::<Database>();

    // Resolve scraper config
    let scrapers = db.get_scrapers().map_err(|e| e.to_string())?;
    let config = scrapers
        .iter()
        .find(|s| s.id == job.scraper_id)
        .ok_or_else(|| format!("Scraper '{}' not found", job.scraper_id))?
        .clone();

    if !config.enabled {
        return Err(format!("Scraper '{}' is disabled", config.id));
    }

    // Collect games to scrape
    let games: Vec<GameInfo> = if let Some(ids) = &job.game_ids {
        // Specific games requested
        let mut list = Vec::new();
        for id in ids {
            if let Ok(Some(g)) = db.get_game(id) {
                list.push(g);
            }
        }
        list
    } else if let Some(sys_id) = &job.system_id {
        db.get_games(sys_id).map_err(|e| e.to_string())?
    } else {
        // All systems
        let systems = db.get_systems().map_err(|e| e.to_string())?;
        let mut all = Vec::new();
        for sys in &systems {
            let mut games = db.get_games(&sys.id).map_err(|e| e.to_string())?;
            all.append(&mut games);
        }
        all
    };

    let total = games.len();
    let mut scraped = 0usize;
    let mut skipped = 0usize;
    let mut errors = 0usize;
    let mut messages = Vec::new();

    // Get app data dir for media storage
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    for (idx, game) in games.iter().enumerate() {
        if cancel_flag.load(Ordering::Relaxed) {
            messages.push("Scrape job cancelled by user".into());
            break;
        }

        // Emit progress
        let _ = app.emit("scrape-progress", ScrapeProgress {
            total,
            current: idx,
            game_title: game.title.clone(),
            status: "scraping".into(),
            errors: vec![],
            done: false,
        });

        // Skip logic for MissingOnly
        if job.filter == ScrapeFilter::MissingOnly {
            let has_meta = game.description.is_some() || game.developer.is_some();
            let has_art = game.box_art.is_some();
            if has_meta && has_art {
                skipped += 1;
                continue;
            }
        }

        let result = scrape_single_game(&app, &config, game, &job.filter, &data_dir, job.overwrite).await;

        match result {
            Ok(msg) => {
                if msg == "skipped" {
                    skipped += 1;
                } else {
                    scraped += 1;
                    if !msg.is_empty() {
                        messages.push(format!("{}: {}", game.title, msg));
                    }
                }
            }
            Err(e) => {
                errors += 1;
                messages.push(format!("ERROR {}: {}", game.title, e));
                log::warn!("Scrape error for {}: {}", game.title, e);
            }
        }
    }

    // Emit done
    let _ = app.emit("scrape-progress", ScrapeProgress {
        total,
        current: total,
        game_title: String::new(),
        status: "done".into(),
        errors: messages.iter().filter(|m| m.starts_with("ERROR")).cloned().collect(),
        done: true,
    });

    Ok(ScrapeResult { scraped, skipped, errors, messages })
}

async fn scrape_single_game(
    app: &AppHandle,
    config: &crate::models::ScraperConfig,
    game: &GameInfo,
    filter: &ScrapeFilter,
    data_dir: &std::path::PathBuf,
    overwrite: bool,
) -> Result<String, String> {
    match config.id.as_str() {
        "screenscraper" => {
            scrape_screenscraper(app, config, game, filter, data_dir, overwrite).await
        }
        "thegamesdb" => {
            scrape_thegamesdb(app, config, game, filter, data_dir, overwrite).await
        }
        "libretro" => {
            scrape_libretro(app, game, filter, data_dir, overwrite).await
        }
        other => Err(format!("Scraper '{}' not yet implemented", other)),
    }
}

async fn scrape_screenscraper(
    app: &AppHandle,
    config: &crate::models::ScraperConfig,
    game: &GameInfo,
    filter: &ScrapeFilter,
    data_dir: &std::path::PathBuf,
    overwrite: bool,
) -> Result<String, String> {
    let data = screenscraper::scrape_game(config, game).await?;

    let db = app.state::<Database>();
    let mut updated = game.clone();

    // Apply metadata if filter allows
    if matches!(filter, ScrapeFilter::All | ScrapeFilter::MetadataOnly) {
        if overwrite || updated.title == game.title {
            if let Some(t) = &data.title { updated.title = t.clone(); }
        }
        if overwrite || updated.description.is_none() {
            updated.description = data.description.clone();
        }
        if overwrite || updated.developer.is_none() {
            updated.developer = data.developer.clone();
        }
        if overwrite || updated.publisher.is_none() {
            updated.publisher = data.publisher.clone();
        }
        if overwrite || updated.year.is_none() {
            updated.year = data.year.clone();
        }
        if overwrite || updated.genre.is_none() {
            updated.genre = data.genre.clone();
        }
        if let Some(p) = data.players {
            if overwrite || updated.players == 1 { updated.players = p as u32; }
        }
        if let Some(r) = data.rating {
            if overwrite || updated.rating == 0.0 { updated.rating = r as f32; }
        }
    }

    // Download media if filter allows
    let want_images = matches!(filter, ScrapeFilter::All | ScrapeFilter::ImagesOnly);
    let want_videos = matches!(filter, ScrapeFilter::All | ScrapeFilter::VideosOnly);

    let media_root = data_dir.join("media");
    let mut box_art_path: Option<String> = None;

    for media in &data.media_urls {
        let is_video = media.format == "mp4" || media.format == "webm";
        if is_video && !want_videos { continue; }
        if !is_video && !want_images { continue; }

        let Some(folder) = screenscraper::ss_type_to_folder(&media.media_type) else { continue; };

        let dest_dir = media_root.join(&game.system_id).join(folder);
        let dest_file = dest_dir.join(format!(
            "{}.{}",
            sanitize_filename(&game.title),
            media.format
        ));

        if dest_file.exists() && !overwrite { continue; }

        match screenscraper::download_ss_media(&media.url, &dest_file).await {
            Ok(_) => {
                // Track first box art for the game record
                if media.media_type == "box-2D" && box_art_path.is_none() {
                    box_art_path = Some(dest_file.to_string_lossy().to_string());
                }
            }
            Err(e) => log::warn!("Failed to download {}: {}", media.url, e),
        }
    }

    if let Some(art) = box_art_path {
        if overwrite || updated.box_art.is_none() {
            updated.box_art = Some(art);
        }
    }

    db.upsert_game(&updated).map_err(|e| e.to_string())?;
    Ok(String::new())
}

async fn scrape_thegamesdb(
    app: &AppHandle,
    config: &crate::models::ScraperConfig,
    game: &GameInfo,
    filter: &ScrapeFilter,
    data_dir: &std::path::PathBuf,
    overwrite: bool,
) -> Result<String, String> {
    let data = thegamesdb::scrape_game(config, game).await?;

    let db = app.state::<Database>();
    let mut updated = game.clone();

    if matches!(filter, ScrapeFilter::All | ScrapeFilter::MetadataOnly) {
        if let Some(t) = &data.title {
            if overwrite { updated.title = t.clone(); }
        }
        if overwrite || updated.description.is_none() { updated.description = data.description.clone(); }
        if overwrite || updated.developer.is_none()   { updated.developer = data.developer.clone(); }
        if overwrite || updated.publisher.is_none()   { updated.publisher = data.publisher.clone(); }
        if overwrite || updated.year.is_none()        { updated.year = data.year.clone(); }
        if overwrite || updated.genre.is_none()       { updated.genre = data.genre.clone(); }
        if let Some(p) = data.players {
            if overwrite || updated.players == 1 { updated.players = p as u32; }
        }
        if let Some(r) = data.rating {
            if overwrite || updated.rating == 0.0 { updated.rating = r as f32; }
        }
    }

    let want_images = matches!(filter, ScrapeFilter::All | ScrapeFilter::ImagesOnly);
    let media_root = data_dir.join("media");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    if want_images {
        if let Some(url) = &data.box_art_front_url {
            let dest = media_root.join(&game.system_id).join("box2dfront")
                .join(format!("{}.jpg", sanitize_filename(&game.title)));
            if !dest.exists() || overwrite {
                if let Ok(_) = download_url(&client, url, &dest).await {
                    if overwrite || updated.box_art.is_none() {
                        updated.box_art = Some(dest.to_string_lossy().to_string());
                    }
                }
            }
        }
        for (i, url) in data.screenshot_urls.iter().enumerate().take(3) {
            let dest = media_root.join(&game.system_id).join("screenshots")
                .join(format!("{}_{}.jpg", sanitize_filename(&game.title), i));
            if !dest.exists() || overwrite {
                let _ = download_url(&client, url, &dest).await;
            }
        }
        for (i, url) in data.fanart_urls.iter().enumerate().take(2) {
            let dest = media_root.join(&game.system_id).join("fanart")
                .join(format!("{}_{}.jpg", sanitize_filename(&game.title), i));
            if !dest.exists() || overwrite {
                let _ = download_url(&client, url, &dest).await;
            }
        }
    }

    db.upsert_game(&updated).map_err(|e| e.to_string())?;
    Ok(String::new())
}

async fn scrape_libretro(
    app: &AppHandle,
    game: &GameInfo,
    filter: &ScrapeFilter,
    data_dir: &std::path::PathBuf,
    overwrite: bool,
) -> Result<String, String> {
    // Libretro only provides images (box art, snaps, titles), no metadata or video
    let want_images = matches!(filter, ScrapeFilter::All | ScrapeFilter::ImagesOnly | ScrapeFilter::MissingOnly);
    if !want_images {
        return Ok("skipped".into());
    }

    let urls = libretro::get_thumbnail_urls(game)?;
    let media_root = data_dir.join("media");
    let db = app.state::<Database>();
    let mut updated = game.clone();
    let mut downloaded = 0u32;

    let safe_name = sanitize_filename(&game.title);

    // Box art
    if let Some(url) = &urls.box_art_url {
        let dest = media_root.join(&game.system_id).join("box2dfront")
            .join(format!("{}.png", safe_name));
        if !dest.exists() || overwrite {
            match libretro::download_thumbnail(url, &dest).await {
                Ok(true) => {
                    downloaded += 1;
                    if overwrite || updated.box_art.is_none() {
                        updated.box_art = Some(dest.to_string_lossy().to_string());
                    }
                }
                Ok(false) => {} // 404 — not available
                Err(e) => log::warn!("Libretro box art download failed for {}: {}", game.title, e),
            }
        }
    }

    // Screenshots (snaps)
    if let Some(url) = &urls.snap_url {
        let dest = media_root.join(&game.system_id).join("screenshots")
            .join(format!("{}.png", safe_name));
        if !dest.exists() || overwrite {
            match libretro::download_thumbnail(url, &dest).await {
                Ok(true) => { downloaded += 1; }
                Ok(false) => {}
                Err(e) => log::warn!("Libretro snap download failed for {}: {}", game.title, e),
            }
        }
    }

    // Title screens
    if let Some(url) = &urls.title_url {
        let dest = media_root.join(&game.system_id).join("titlescreens")
            .join(format!("{}.png", safe_name));
        if !dest.exists() || overwrite {
            match libretro::download_thumbnail(url, &dest).await {
                Ok(true) => { downloaded += 1; }
                Ok(false) => {}
                Err(e) => log::warn!("Libretro title download failed for {}: {}", game.title, e),
            }
        }
    }

    // Update DB if we got box art
    if updated.box_art != game.box_art {
        db.upsert_game(&updated).map_err(|e| e.to_string())?;
    }

    if downloaded > 0 {
        Ok(format!("{} thumbnails downloaded", downloaded))
    } else {
        Ok("skipped".into())
    }
}

async fn download_url(client: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect()
}
