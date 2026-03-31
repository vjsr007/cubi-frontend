use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::db::Database;
use crate::models::game::{GameInfo, GameInfoPatch};
use crate::services::{media_import_service, youtube_service};

// ── Result types ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaImportResult {
    pub saved_path: String,
    pub media_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YoutubeSearchResult {
    pub video_id: String,
    pub title: String,
    pub url: String,
}

// ── Commands ────────────────────────────────────────────────────────────────

/// Update text metadata fields for a game.
#[tauri::command]
pub async fn update_game_metadata(
    db: State<'_, Database>,
    game_id: String,
    patch: GameInfoPatch,
) -> Result<GameInfo, String> {
    db.patch_game(&game_id, &patch).map_err(|e| e.to_string())?;
    db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found after update: {}", game_id))
}

/// Copy a local file into the app media folder and update the DB.
#[tauri::command]
pub async fn import_media_file(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    source_path: String,
    media_type: String,
) -> Result<MediaImportResult, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let stem = game_file_stem(&game.file_name);

    let saved_path = media_import_service::copy_local_file(
        std::path::Path::new(&source_path),
        &app_data_dir,
        &game.system_id,
        &media_type,
        &stem,
    )?;

    update_db_media_field(&db, &game_id, &media_type, &saved_path)?;

    Ok(MediaImportResult { saved_path, media_type })
}

/// Download a file from a URL into the app media folder and update the DB.
#[tauri::command]
pub async fn import_media_url(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    url: String,
    media_type: String,
) -> Result<MediaImportResult, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let stem = game_file_stem(&game.file_name);

    let saved_path = media_import_service::download_from_url(
        &url,
        &app_data_dir,
        &game.system_id,
        &media_type,
        &stem,
    ).await?;

    update_db_media_field(&db, &game_id, &media_type, &saved_path)?;

    Ok(MediaImportResult { saved_path, media_type })
}

/// Delete a media file for a game and clear the DB field.
#[tauri::command]
pub async fn delete_game_media(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    media_type: String,
) -> Result<(), String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    // Find the current path from the DB field
    let current_path = get_db_media_path(&game, &media_type);
    if let Some(path) = current_path {
        media_import_service::delete_media_file(&path)?;
    }

    // Also try to find and delete from the resolved media paths
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let stem = game_file_stem(&game.file_name);

    // Try common extensions
    for ext in &["jpg", "jpeg", "png", "webp", "mp4"] {
        let candidate = media_import_service::media_dest_path(
            &app_data_dir, &game.system_id, &media_type, &stem, ext,
        );
        if candidate.exists() {
            let _ = std::fs::remove_file(&candidate);
        }
    }

    clear_db_media_field(&db, &game_id, &media_type)?;
    Ok(())
}

/// Search YouTube for game videos.
#[tauri::command]
pub async fn search_youtube(query: String) -> Result<Vec<YoutubeSearchResult>, String> {
    search_youtube_multi(&query).await
}

/// Download a YouTube video as the game's trailer.
#[tauri::command]
pub async fn download_youtube_video(
    app: AppHandle,
    db: State<'_, Database>,
    game_id: String,
    youtube_url: String,
) -> Result<MediaImportResult, String> {
    let game = db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Game not found: {}", game_id))?;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let stem = game_file_stem(&game.file_name);

    let dest = media_import_service::media_dest_path(
        &app_data_dir, &game.system_id, "video", &stem, "mp4",
    );

    youtube_service::download_video(&youtube_url, &dest).await?;

    let saved_path = dest.to_string_lossy().to_string();
    let patch = GameInfoPatch {
        trailer_local: Some(saved_path.clone()),
        trailer_url: Some(youtube_url),
        ..Default::default()
    };
    db.patch_game(&game_id, &patch).map_err(|e| e.to_string())?;

    Ok(MediaImportResult {
        saved_path,
        media_type: "video".to_string(),
    })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

fn game_file_stem(file_name: &str) -> String {
    std::path::Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name)
        .to_string()
}

/// Map media_type to the corresponding DB field and update it.
fn update_db_media_field(db: &Database, game_id: &str, media_type: &str, path: &str) -> Result<(), String> {
    let patch = match media_type {
        "box_art" => GameInfoPatch { box_art: Some(path.to_string()), ..Default::default() },
        "hero_art" => GameInfoPatch { hero_art: Some(path.to_string()), ..Default::default() },
        "logo" => GameInfoPatch { logo: Some(path.to_string()), ..Default::default() },
        "background_art" => GameInfoPatch { background_art: Some(path.to_string()), ..Default::default() },
        "screenshot" => {
            // Append to screenshots array
            let game = db.get_game(game_id).map_err(|e| e.to_string())?
                .ok_or_else(|| "Game not found".to_string())?;
            let mut screenshots = game.screenshots.unwrap_or_default();
            screenshots.push(path.to_string());
            GameInfoPatch { screenshots: Some(screenshots), ..Default::default() }
        },
        "video" => GameInfoPatch { trailer_local: Some(path.to_string()), ..Default::default() },
        _ => return Err(format!("Unknown media type: {}", media_type)),
    };
    db.patch_game(game_id, &patch).map_err(|e| e.to_string())
}

fn clear_db_media_field(db: &Database, game_id: &str, media_type: &str) -> Result<(), String> {
    let patch = match media_type {
        "box_art" => GameInfoPatch { box_art: Some(String::new()), ..Default::default() },
        "hero_art" => GameInfoPatch { hero_art: Some(String::new()), ..Default::default() },
        "logo" => GameInfoPatch { logo: Some(String::new()), ..Default::default() },
        "background_art" => GameInfoPatch { background_art: Some(String::new()), ..Default::default() },
        "screenshot" => GameInfoPatch { screenshots: Some(vec![]), ..Default::default() },
        "video" => GameInfoPatch { trailer_local: Some(String::new()), trailer_url: Some(String::new()), ..Default::default() },
        _ => return Err(format!("Unknown media type: {}", media_type)),
    };
    db.patch_game(game_id, &patch).map_err(|e| e.to_string())
}

fn get_db_media_path(game: &GameInfo, media_type: &str) -> Option<String> {
    match media_type {
        "box_art" => game.box_art.clone(),
        "hero_art" => game.hero_art.clone(),
        "logo" => game.logo.clone(),
        "background_art" => game.background_art.clone(),
        "video" => game.trailer_local.clone(),
        _ => None,
    }
}

/// Invidious instances to try in order (public, no auth required).
/// These are frequently unreliable; yt-dlp search is preferred when available.
const INVIDIOUS_INSTANCES: &[&str] = &[
    "https://iv.melmac.space",
    "https://invidious.materialio.us",
    "https://invidious.fdn.fr",
    "https://iv.ggtyler.dev",
    "https://invidious.privacyredirect.com",
    "https://invidious.perennialte.ch",
];

/// Search YouTube: tries yt-dlp first (reliable), falls back to Invidious instances.
async fn search_youtube_multi(query: &str) -> Result<Vec<YoutubeSearchResult>, String> {
    // Try yt-dlp search first (most reliable)
    if let Some(ytdlp) = youtube_service::check_ytdlp() {
        match search_via_ytdlp(&ytdlp, query).await {
            Ok(results) if !results.is_empty() => {
                log::info!("YouTube search via yt-dlp returned {} results", results.len());
                return Ok(results);
            }
            Ok(_) => log::warn!("yt-dlp search returned no results, trying Invidious"),
            Err(e) => log::warn!("yt-dlp search failed: {}, trying Invidious", e),
        }
    }

    // Fallback: Invidious instances
    search_invidious_multiple(query).await
}

/// Use yt-dlp to search YouTube — works even when all Invidious instances are down.
async fn search_via_ytdlp(
    ytdlp: &std::path::Path,
    query: &str,
) -> Result<Vec<YoutubeSearchResult>, String> {
    let search_query = format!("ytsearch8:{}", query);
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        tokio::process::Command::new(ytdlp)
            .args([
                "--dump-json",
                "--flat-playlist",
                "--no-download",
                "--no-warnings",
                &search_query,
            ])
            .output(),
    )
    .await
    .map_err(|_| "yt-dlp search timeout".to_string())?
    .map_err(|e| format!("yt-dlp exec: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp search failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let results: Vec<YoutubeSearchResult> = stdout
        .lines()
        .filter_map(|line| {
            let json: serde_json::Value = serde_json::from_str(line).ok()?;
            let video_id = json["id"].as_str()?.to_string();
            let title = json["title"].as_str().unwrap_or("").to_string();
            if video_id.is_empty() { return None; }
            Some(YoutubeSearchResult {
                url: format!("https://www.youtube.com/watch?v={}", video_id),
                video_id,
                title,
            })
        })
        .take(8)
        .collect();

    Ok(results)
}

/// Search Invidious for multiple results, trying multiple instances on failure.
async fn search_invidious_multiple(query: &str) -> Result<Vec<YoutubeSearchResult>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("cubi-frontend/0.5")
        .build()
        .map_err(|e| e.to_string())?;

    let encoded = percent_encoding::utf8_percent_encode(query, percent_encoding::NON_ALPHANUMERIC)
        .to_string();

    let mut last_err = String::from("All Invidious instances failed");

    for instance in INVIDIOUS_INSTANCES {
        let url = format!(
            "{}/api/v1/search?q={}&type=video&fields=videoId,title",
            instance, encoded
        );

        let resp = match client.get(&url).send().await {
            Ok(r) => r,
            Err(e) => {
                last_err = format!("{}: {}", instance, e);
                log::warn!("Invidious instance {} failed: {}", instance, e);
                continue;
            }
        };

        if !resp.status().is_success() {
            last_err = format!("{}: HTTP {}", instance, resp.status());
            log::warn!("Invidious instance {} returned {}", instance, resp.status());
            continue;
        }

        let text = match resp.text().await {
            Ok(t) => t,
            Err(e) => {
                last_err = format!("{}: read error: {}", instance, e);
                continue;
            }
        };

        // Skip HTML responses (some instances redirect to a web page)
        if text.trim_start().starts_with('<') {
            last_err = format!("{}: returned HTML instead of JSON", instance);
            log::warn!("Invidious instance {} returned HTML", instance);
            continue;
        }

        let json: serde_json::Value = match serde_json::from_str(&text) {
            Ok(j) => j,
            Err(e) => {
                last_err = format!("{}: parse error: {}", instance, e);
                continue;
            }
        };

        let items = match json.as_array() {
            Some(a) => a,
            None => continue,
        };

        let results: Vec<YoutubeSearchResult> = items.iter()
            .filter_map(|item| {
                let video_id = item["videoId"].as_str()?.to_string();
                let title = item["title"].as_str().unwrap_or("").to_string();
                if video_id.is_empty() { return None; }
                Some(YoutubeSearchResult {
                    url: format!("https://www.youtube.com/watch?v={}", video_id),
                    video_id,
                    title,
                })
            })
            .take(8)
            .collect();

        if !results.is_empty() {
            log::info!("YouTube search via {} returned {} results", instance, results.len());
            return Ok(results);
        }
    }

    Err(last_err)
}
