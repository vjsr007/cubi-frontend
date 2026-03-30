//! YouTube search + yt-dlp download service.
//! Uses YouTube Data API v3 (with key) or Invidious (without key).

use std::path::Path;
use tokio::time::{sleep, Duration};

const YT_SEARCH: &str = "https://www.googleapis.com/youtube/v3/search";
const INVIDIOUS: &str = "https://vid.puffyan.us/api/v1/search";
const UA: &str = "cubi-frontend/0.1";

#[derive(Debug, Clone)]
pub struct VideoResult {
    pub video_id: String,
    pub title: String,
    pub url: String,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(UA)
        .build()
        .map_err(|e| e.to_string())
}

/// Search for official trailer. Uses YouTube API if key provided, else Invidious.
pub async fn search_trailer(title: &str, api_key: Option<&str>) -> Result<Option<VideoResult>, String> {
    let query = format!("{} official trailer game", title);
    search_video(&query, api_key).await
}

/// Search for gameplay video.
pub async fn search_gameplay(title: &str, api_key: Option<&str>) -> Result<Option<VideoResult>, String> {
    let query = format!("{} gameplay PC", title);
    search_video(&query, api_key).await
}

async fn search_video(query: &str, api_key: Option<&str>) -> Result<Option<VideoResult>, String> {
    if let Some(key) = api_key {
        search_youtube(query, key).await
    } else {
        search_invidious(query).await
    }
}

async fn search_youtube(query: &str, api_key: &str) -> Result<Option<VideoResult>, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(query, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!(
        "{}?q={}&type=video&maxResults=3&part=snippet&key={}",
        YT_SEARCH, encoded, api_key
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("YouTube API HTTP {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let first = json["items"].as_array().and_then(|a| a.first());
    if let Some(item) = first {
        let video_id = item["id"]["videoId"].as_str().unwrap_or("").to_string();
        let title = item["snippet"]["title"].as_str().unwrap_or("").to_string();
        if !video_id.is_empty() {
            return Ok(Some(VideoResult {
                url: format!("https://www.youtube.com/watch?v={}", video_id),
                video_id,
                title,
            }));
        }
    }
    Ok(None)
}

async fn search_invidious(query: &str) -> Result<Option<VideoResult>, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(query, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!("{}?q={}&type=video&fields=videoId,title", INVIDIOUS, encoded);
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Ok(None); // Non-fatal
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let first = json.as_array().and_then(|a| a.first());
    if let Some(item) = first {
        let video_id = item["videoId"].as_str().unwrap_or("").to_string();
        let title = item["title"].as_str().unwrap_or("").to_string();
        if !video_id.is_empty() {
            return Ok(Some(VideoResult {
                url: format!("https://www.youtube.com/watch?v={}", video_id),
                video_id,
                title,
            }));
        }
    }
    Ok(None)
}

/// Detect yt-dlp binary on the system PATH.
pub fn check_ytdlp() -> Option<std::path::PathBuf> {
    which::which("yt-dlp").ok()
}

/// Download a YouTube (or direct MP4) video using yt-dlp.
/// Returns error if yt-dlp not found.
pub async fn download_video(url: &str, dest_path: &Path) -> Result<(), String> {
    let ytdlp = check_ytdlp()
        .ok_or_else(|| "yt-dlp not found on PATH".to_string())?;

    if let Some(p) = dest_path.parent() { std::fs::create_dir_all(p).ok(); }

    let output = tokio::time::timeout(
        Duration::from_secs(300),
        tokio::process::Command::new(&ytdlp)
            .args([
                "-f", "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "--merge-output-format", "mp4",
                "--no-playlist",
                "--socket-timeout", "30",
                "-o", dest_path.to_str().unwrap_or("video.mp4"),
                url,
            ])
            .output(),
    )
    .await
    .map_err(|_| "yt-dlp timeout (5min)".to_string())?
    .map_err(|e| format!("yt-dlp exec: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr));
    }
    Ok(())
}

/// Detect headless Chrome/Chromium on the system.
pub fn check_chrome() -> Option<std::path::PathBuf> {
    let candidates = [
        "google-chrome", "google-chrome-stable", "chromium",
        "chromium-browser", "chrome",
        // Windows typical paths
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Chromium\Application\chrome.exe",
    ];
    for c in &candidates {
        if let Ok(p) = which::which(c) { return Some(p); }
        let p = std::path::PathBuf::from(c);
        if p.exists() { return Some(p); }
    }
    None
}

fn _rate_limit() -> impl std::future::Future<Output = ()> {
    sleep(Duration::from_millis(200))
}
