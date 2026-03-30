//! MobyGames API client — fallback metadata for PC games not found by IGDB.
//! Platform 3 = Windows PC. Rate limit: 1 req/s (free tier).

use std::path::Path;
use tokio::time::{sleep, Duration};

const BASE: &str = "https://api.mobygames.com/v1";
const UA: &str = "cubi-frontend/0.1";

#[derive(Debug, Default)]
pub struct MobyGameData {
    pub moby_id: u64,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub rating: Option<f32>,
    pub screenshot_urls: Vec<String>,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent(UA)
        .build()
        .map_err(|e| e.to_string())
}

/// Search MobyGames for a PC game by title. Returns first match.
pub async fn search_game(api_key: &str, title: &str) -> Result<Option<MobyGameData>, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(title, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!(
        "{}/games?title={}&platform_id=3&api_key={}&limit=3",
        BASE, encoded, api_key
    );

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("MobyGames HTTP {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let games = json["games"].as_array().ok_or("MobyGames: expected games array")?;

    // Find best title match
    let norm_q = super::normalize_title(title);
    let best = games.iter().max_by_key(|g| {
        let n = super::normalize_title(g["title"].as_str().unwrap_or(""));
        title_similarity(&norm_q, &n)
    });
    let game = match best { Some(g) => g, None => return Ok(None) };

    let moby_id = game["game_id"].as_u64().unwrap_or(0);
    let description = game["description"].as_str()
        .map(strip_html)
        .filter(|s| !s.is_empty());

    // Platform-specific release info
    let (mut developer, mut publisher, mut year) = (None, None, None);
    if let Some(platforms) = game["platforms"].as_array() {
        for p in platforms {
            if p["platform_id"].as_u64() == Some(3) {
                year = p["first_release_date"].as_str()
                    .and_then(|d| d.split('-').next().map(str::to_string));
            }
        }
    }

    // Genres
    let genre = game["genres"].as_array().map(|arr| {
        arr.iter()
            .filter_map(|g| g["genre_name"].as_str())
            .collect::<Vec<_>>()
            .join(", ")
    }).filter(|s| !s.is_empty());

    // MobyScore 0-5 → 0-1
    let rating = game["moby_score"].as_f64().map(|s| (s / 5.0) as f32);

    // Get involved companies via separate call (rate-limited)
    sleep(Duration::from_millis(1100)).await;
    if moby_id > 0 {
        let co_url = format!("{}/games/{}/platforms/3?api_key={}", BASE, moby_id, api_key);
        if let Ok(co_resp) = client.get(&co_url).send().await {
            if let Ok(co_json) = co_resp.json::<serde_json::Value>().await {
                developer = co_json["games"][0]["developers"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|d| d["developer_name"].as_str())
                    .map(str::to_string);
                publisher = co_json["games"][0]["publishers"]
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|p| p["publisher_name"].as_str())
                    .map(str::to_string);
            }
        }
    }

    Ok(Some(MobyGameData {
        moby_id,
        description,
        developer,
        publisher,
        year,
        genre,
        rating,
        screenshot_urls: Vec::new(),
    }))
}

/// Fetch up to `limit` screenshot URLs for a MobyGames game ID.
pub async fn fetch_screenshots(api_key: &str, moby_id: u64, limit: usize) -> Vec<String> {
    let client = match build_client() { Ok(c) => c, Err(_) => return vec![] };
    let url = format!(
        "{}/games/{}/screenshots?platform_id=3&api_key={}&limit={}",
        BASE, moby_id, api_key, limit
    );
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            return json["screenshots"].as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|s| s["image"].as_str().map(str::to_string))
                        .collect()
                })
                .unwrap_or_default();
        }
    }
    vec![]
}

pub async fn download_screenshots(
    urls: &[String],
    dest_dir: &Path,
    game_name: &str,
    overwrite: bool,
) -> Vec<String> {
    let client = match build_client() { Ok(c) => c, Err(_) => return vec![] };
    let safe = sanitize(game_name);
    let mut paths = Vec::new();
    for (i, url) in urls.iter().enumerate() {
        let dest = dest_dir.join("pc").join("screenshots").join(format!("{}_moby_{}.jpg", safe, i));
        if !dest.exists() || overwrite {
            if let Some(p) = dest.parent() { std::fs::create_dir_all(p).ok(); }
            if let Ok(resp) = client.get(url).send().await {
                if let Ok(bytes) = resp.bytes().await {
                    if std::fs::write(&dest, &bytes).is_ok() {
                        paths.push(dest.to_string_lossy().to_string());
                    }
                }
            }
        } else {
            paths.push(dest.to_string_lossy().to_string());
        }
        tokio::time::sleep(Duration::from_millis(1100)).await;
    }
    paths
}

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
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn title_similarity(a: &str, b: &str) -> u32 {
    if a == b { return 1000; }
    if b.starts_with(a) || a.starts_with(b) { return 900; }
    let a_w: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let b_w: std::collections::HashSet<&str> = b.split_whitespace().collect();
    a_w.intersection(&b_w).count() as u32 * 100
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| match c { '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_', c => c })
        .collect::<String>()
        .trim()
        .to_string()
}
