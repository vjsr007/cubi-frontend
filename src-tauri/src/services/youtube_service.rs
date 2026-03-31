//! YouTube search + yt-dlp download service.
//! Uses YouTube Data API v3 (with key) or Invidious (without key).

use std::path::Path;
use tokio::time::{sleep, Duration};

const YT_SEARCH: &str = "https://www.googleapis.com/youtube/v3/search";
const INVIDIOUS_INSTANCES: &[&str] = &[
    "https://iv.melmac.space/api/v1/search",
    "https://invidious.materialio.us/api/v1/search",
    "https://invidious.fdn.fr/api/v1/search",
    "https://iv.ggtyler.dev/api/v1/search",
    "https://invidious.privacyredirect.com/api/v1/search",
    "https://invidious.perennialte.ch/api/v1/search",
];
const UA: &str = "cubi-frontend/0.5";

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

    for instance in INVIDIOUS_INSTANCES {
        let url = format!("{}?q={}&type=video&fields=videoId,title", instance, encoded);
        let resp = match client.get(&url).send().await {
            Ok(r) => r,
            Err(_) => continue,
        };
        if !resp.status().is_success() { continue; }
        let text = match resp.text().await {
            Ok(t) => t,
            Err(_) => continue,
        };
        // Skip HTML responses (some instances redirect to web pages)
        if text.trim_start().starts_with('<') { continue; }
        let json: serde_json::Value = match serde_json::from_str(&text) {
            Ok(j) => j,
            Err(_) => continue,
        };
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
    }
    Ok(None)
}

/// Detect yt-dlp binary on the system PATH or common install locations.
pub fn check_ytdlp() -> Option<std::path::PathBuf> {
    // Try PATH first
    if let Ok(p) = which::which("yt-dlp") {
        return Some(p);
    }

    // Windows: check common install locations
    #[cfg(target_os = "windows")]
    {
        if let Some(local) = dirs::data_local_dir() {
            // WinGet install location
            let winget_dir = local.join("Microsoft").join("WinGet").join("Links");
            let candidate = winget_dir.join("yt-dlp.exe");
            if candidate.exists() { return Some(candidate); }

            // Also search WinGet Packages
            let pkgs_dir = local.join("Microsoft").join("WinGet").join("Packages");
            if pkgs_dir.is_dir() {
                if let Ok(entries) = std::fs::read_dir(&pkgs_dir) {
                    for entry in entries.flatten() {
                        if entry.file_name().to_string_lossy().contains("yt-dlp") {
                            let candidate = entry.path().join("yt-dlp.exe");
                            if candidate.exists() { return Some(candidate); }
                        }
                    }
                }
            }
        }

        // Scoop, Chocolatey, pip
        if let Ok(home) = std::env::var("USERPROFILE") {
            let candidates = [
                format!("{}\\.local\\bin\\yt-dlp.exe", home),
                format!("{}\\scoop\\shims\\yt-dlp.exe", home),
                format!("{}\\AppData\\Roaming\\Python\\Scripts\\yt-dlp.exe", home),
            ];
            for c in &candidates {
                let p = std::path::PathBuf::from(c);
                if p.exists() { return Some(p); }
            }
        }

        let global = [
            r"C:\ProgramData\chocolatey\bin\yt-dlp.exe",
        ];
        for c in &global {
            let p = std::path::PathBuf::from(c);
            if p.exists() { return Some(p); }
        }
    }

    None
}

/// Download a YouTube (or direct MP4) video using yt-dlp.
/// Returns error if yt-dlp not found.
pub async fn download_video(url: &str, dest_path: &Path) -> Result<(), String> {
    let ytdlp = check_ytdlp()
        .ok_or_else(|| "yt-dlp not found on PATH".to_string())?;

    if let Some(p) = dest_path.parent() { std::fs::create_dir_all(p).ok(); }

    // Find ffmpeg next to yt-dlp or in common WinGet paths
    let ffmpeg_location = find_ffmpeg(&ytdlp);

    let dest_str = dest_path.to_str().unwrap_or("video.mp4");

    let mut args: Vec<String> = vec![
        // Prefer single mp4 stream to avoid needing ffmpeg merge
        "-f".to_string(),
        "best[ext=mp4][height<=1080]/best[ext=mp4]/bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best".to_string(),
        "--merge-output-format".to_string(), "mp4".to_string(),
        "--no-playlist".to_string(),
        "--socket-timeout".to_string(), "30".to_string(),
        "-o".to_string(), dest_str.to_string(),
    ];

    // Tell yt-dlp where ffmpeg is if we found it
    if let Some(ref ff_path) = ffmpeg_location {
        args.push("--ffmpeg-location".to_string());
        args.push(ff_path.to_string_lossy().to_string());
    }

    args.push(url.to_string());

    let output = tokio::time::timeout(
        Duration::from_secs(300),
        tokio::process::Command::new(&ytdlp)
            .args(&args)
            .output(),
    )
    .await
    .map_err(|_| "yt-dlp timeout (5min)".to_string())?
    .map_err(|e| format!("yt-dlp exec: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr));
    }

    // yt-dlp may have created the file with a slightly different name; verify
    if !dest_path.exists() {
        // Check for common yt-dlp suffix patterns
        if let Some(parent) = dest_path.parent() {
            if let Some(stem) = dest_path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(entries) = std::fs::read_dir(parent) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with(stem) && name.ends_with(".mp4") && entry.path() != dest_path {
                            std::fs::rename(entry.path(), dest_path)
                                .map_err(|e| format!("Failed to rename downloaded file: {}", e))?;
                            return Ok(());
                        }
                    }
                }
            }
        }
        return Err("yt-dlp completed but output file not found".to_string());
    }
    Ok(())
}

/// Find ffmpeg binary near yt-dlp or in common install locations.
fn find_ffmpeg(ytdlp_path: &Path) -> Option<std::path::PathBuf> {
    // Check if ffmpeg is on PATH
    if which::which("ffmpeg").is_ok() {
        return None; // yt-dlp will find it itself
    }

    // Check same directory as yt-dlp
    if let Some(parent) = ytdlp_path.parent() {
        if parent.join("ffmpeg.exe").exists() || parent.join("ffmpeg").exists() {
            return Some(parent.to_path_buf());
        }
    }

    // Windows: check WinGet install locations for ffmpeg
    #[cfg(target_os = "windows")]
    {
        if let Some(local) = dirs::data_local_dir() {
            // WinGet Links
            let links = local.join("Microsoft").join("WinGet").join("Links");
            if links.join("ffmpeg.exe").exists() {
                return Some(links);
            }

            // WinGet Packages
            let pkgs = local.join("Microsoft").join("WinGet").join("Packages");
            if pkgs.is_dir() {
                if let Ok(entries) = std::fs::read_dir(&pkgs) {
                    for entry in entries.flatten() {
                        if entry.file_name().to_string_lossy().contains("FFmpeg") {
                            let bin = entry.path().join("ffmpeg.exe");
                            if bin.exists() { return Some(entry.path()); }
                            // May be in a subdirectory
                            let bin_sub = entry.path().join("bin").join("ffmpeg.exe");
                            if bin_sub.exists() { return Some(entry.path().join("bin")); }
                            // Search one level deep
                            if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                                for sub in sub_entries.flatten() {
                                    if sub.path().is_dir() {
                                        let candidate = sub.path().join("bin").join("ffmpeg.exe");
                                        if candidate.exists() { return Some(sub.path().join("bin")); }
                                        let candidate2 = sub.path().join("ffmpeg.exe");
                                        if candidate2.exists() { return Some(sub.path()); }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    None
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
