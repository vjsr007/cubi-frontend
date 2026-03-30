//! Steam Store API client — fetches full metadata for Steam games.
//! No authentication required. Rate limit: ~200 req/5min.

use std::path::Path;
use tokio::time::{sleep, Duration};

const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0";

#[derive(Debug, Default)]
pub struct SteamStoreData {
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub metacritic_score: Option<i32>,
    pub tags: Vec<String>,
    pub website: Option<String>,
    pub background_url: Option<String>,
    pub screenshot_urls: Vec<String>,
    pub trailer_url: Option<String>,
}

pub struct SteamMediaPaths {
    pub background: Option<String>,
    pub screenshots: Vec<String>,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent(UA)
        .build()
        .map_err(|e| e.to_string())
}

/// Fetch metadata from Steam Store API for a given AppID.
pub async fn fetch_steam_store(appid: &str) -> Result<Option<SteamStoreData>, String> {
    let client = build_client()?;
    let url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}&cc=us&l=en",
        appid
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Steam Store HTTP {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let app_data = &json[appid];
    if !app_data["success"].as_bool().unwrap_or(false) {
        log::warn!("Steam Store: success=false for appid {}", appid);
        return Ok(None);
    }
    let data = &app_data["data"];
    if data.is_null() { return Ok(None); }

    let description = data["detailed_description"]
        .as_str()
        .map(strip_html)
        .filter(|s| !s.is_empty());

    let developer = data["developers"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let publisher = data["publishers"]
        .as_array()
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let year = data["release_date"]["date"]
        .as_str()
        .and_then(parse_year);

    let genre = data["genres"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|g| g["description"].as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .filter(|s| !s.is_empty());

    let metacritic_score = data["metacritic"]["score"].as_i64().map(|v| v as i32);

    let tags: Vec<String> = data["categories"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|c| c["description"].as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();

    let website = data["website"].as_str()
        .filter(|s| !s.is_empty())
        .map(str::to_string);

    let background_url = data["background_raw"].as_str()
        .or_else(|| data["background"].as_str())
        .map(str::to_string);

    let screenshot_urls: Vec<String> = data["screenshots"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|s| s["path_full"].as_str().map(str::to_string))
                .take(5)
                .collect()
        })
        .unwrap_or_default();

    // First MP4 trailer
    let trailer_url = data["movies"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|m| {
            m["mp4"]["max"].as_str()
                .or_else(|| m["mp4"]["480"].as_str())
                .or_else(|| m["webm"]["max"].as_str())
        })
        .map(str::to_string);

    Ok(Some(SteamStoreData {
        description,
        developer,
        publisher,
        year,
        genre,
        metacritic_score,
        tags,
        website,
        background_url,
        screenshot_urls,
        trailer_url,
    }))
}

/// Download background + screenshots to local media dirs.
pub async fn download_steam_media(
    data: &SteamStoreData,
    dest_dir: &Path,
    game_name: &str,
    max_screenshots: u32,
    overwrite: bool,
) -> Result<SteamMediaPaths, String> {
    let client = build_client()?;
    let safe_name = sanitize(game_name);
    let mut result = SteamMediaPaths { background: None, screenshots: Vec::new() };

    // Background
    if let Some(url) = &data.background_url {
        let ext = url.rsplit('.').next().unwrap_or("jpg");
        let dest = dest_dir.join("pc").join("background").join(format!("{}.{}", safe_name, ext));
        if !dest.exists() || overwrite {
            if download_file(&client, url, &dest).await.is_ok() {
                result.background = Some(dest.to_string_lossy().to_string());
            }
        } else {
            result.background = Some(dest.to_string_lossy().to_string());
        }
    }

    // Screenshots
    for (i, url) in data.screenshot_urls.iter().enumerate().take(max_screenshots as usize) {
        let ext = url.rsplit('.').next().unwrap_or("jpg");
        let dest = dest_dir.join("pc").join("screenshots").join(format!("{}_{}.{}", safe_name, i, ext));
        if !dest.exists() || overwrite {
            if download_file(&client, url, &dest).await.is_ok() {
                result.screenshots.push(dest.to_string_lossy().to_string());
            }
        } else {
            result.screenshots.push(dest.to_string_lossy().to_string());
        }
        sleep(Duration::from_millis(200)).await;
    }

    Ok(result)
}

/// Courtesy sleep between Steam API calls
pub async fn rate_limit_sleep() {
    sleep(Duration::from_millis(1500)).await;
}

// ── Helpers ──────────────────────────────────────────────────────────────

fn strip_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    // Collapse whitespace
    let mut result = String::new();
    let mut prev_ws = false;
    for c in out.chars() {
        if c.is_whitespace() {
            if !prev_ws { result.push(' '); }
            prev_ws = true;
        } else {
            result.push(c);
            prev_ws = false;
        }
    }
    result.trim().to_string()
}

fn parse_year(date: &str) -> Option<String> {
    // Formats: "21 Nov, 2023" | "Nov 2023" | "2023" | "Q4 2023"
    date.split_whitespace()
        .find_map(|tok| {
            let t = tok.trim_matches(',');
            if t.len() == 4 && t.chars().all(|c| c.is_ascii_digit()) {
                Some(t.to_string())
            } else {
                None
            }
        })
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

async fn download_file(client: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String> {
    if let Some(p) = dest.parent() { std::fs::create_dir_all(p).ok(); }
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() < 8 { return Err("file too small".into()); }
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}
