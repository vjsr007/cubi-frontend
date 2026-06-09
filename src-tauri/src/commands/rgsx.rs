use crate::models::{RgsxPlatform, RgsxGame, RgsxDownloadResult, RgsxProgress, RgsxPlatformsResponse};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use std::time::Duration;

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())
}

/// List all platforms available in the RGSX instance.
#[tauri::command]
pub async fn rgsx_get_platforms(url: String) -> Result<Vec<RgsxPlatform>, String> {
    let base = url.trim_end_matches('/');
    let endpoint = format!("{}/api/platforms", base);
    let resp = client()?
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| format!("RGSX unreachable: {}", e))?;
    let body: RgsxPlatformsResponse = resp.json().await
        .map_err(|e| format!("RGSX response parse error: {}", e))?;
    Ok(body.platforms)
}

/// List all games for a given RGSX platform name (as returned by /api/platforms → platform_name).
#[tauri::command]
pub async fn rgsx_get_games(url: String, platform_name: String) -> Result<Vec<RgsxGame>, String> {
    let base = url.trim_end_matches('/');
    let encoded = utf8_percent_encode(&platform_name, NON_ALPHANUMERIC).to_string();
    let endpoint = format!("{}/api/games/{}", base, encoded);
    let resp = client()?
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| format!("RGSX unreachable: {}", e))?;
    let games: Vec<RgsxGame> = resp.json().await
        .map_err(|e| format!("RGSX response parse error: {}", e))?;
    Ok(games)
}

/// Trigger a ROM download in RGSX. Uses game_name for fuzzy lookup on the RGSX side.
#[tauri::command]
pub async fn rgsx_download_game(
    url: String,
    platform_name: String,
    game_name: String,
    queue: bool,
) -> Result<RgsxDownloadResult, String> {
    let base = url.trim_end_matches('/');
    let endpoint = format!("{}/api/download", base);
    let mode = if queue { "queue" } else { "now" };
    let body = serde_json::json!({
        "platform": platform_name,
        "game_name": game_name,
        "mode": mode,
    });
    let resp = client()?
        .post(&endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("RGSX unreachable: {}", e))?;
    let result: RgsxDownloadResult = resp.json().await
        .map_err(|e| format!("RGSX response parse error: {}", e))?;
    Ok(result)
}

/// Get current download progress from RGSX.
#[tauri::command]
pub async fn rgsx_get_progress(url: String) -> Result<RgsxProgress, String> {
    let base = url.trim_end_matches('/');
    let endpoint = format!("{}/api/progress", base);
    let resp = client()?
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| format!("RGSX unreachable: {}", e))?;
    // /api/progress returns { downloads: {...} }
    let raw: serde_json::Value = resp.json().await
        .map_err(|e| format!("RGSX response parse error: {}", e))?;
    let downloads_val = raw.get("downloads").cloned().unwrap_or(serde_json::Value::Object(Default::default()));
    let downloads = serde_json::from_value(downloads_val)
        .unwrap_or_default();
    Ok(RgsxProgress { downloads })
}
