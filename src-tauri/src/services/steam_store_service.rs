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

// ── Steam Reviews API ──────────────────────────────────────────────────

use crate::models::steam::{SteamSearchResult, SteamGameData, SteamReview};

/// Search Steam Store by game title.
pub async fn search_steam_store(query: &str) -> Result<Vec<SteamSearchResult>, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(query, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!(
        "https://store.steampowered.com/api/storesearch/?term={}&l=english&cc=US",
        encoded
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Steam search HTTP {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let items = json["items"].as_array().map(|arr| {
        arr.iter()
            .filter_map(|item| {
                let app_id = item["id"].as_u64()? as u32;
                let name = item["name"].as_str()?.to_string();
                let icon_url = item["tiny_image"].as_str().map(str::to_string);
                Some(SteamSearchResult { app_id, name, icon_url })
            })
            .take(10)
            .collect()
    }).unwrap_or_default();
    Ok(items)
}

/// Fetch reviews from Steam for a given AppID.
pub async fn fetch_steam_reviews(app_id: u32) -> Result<(String, u32, u32, Vec<SteamReview>), String> {
    let client = build_client()?;
    let url = format!(
        "https://store.steampowered.com/appreviews/{}?json=1&language=all&num_per_page=10&filter=recent&purchase_type=all",
        app_id
    );
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Steam reviews HTTP {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let summary = &json["query_summary"];
    let score_desc = summary["review_score_desc"].as_str().unwrap_or("").to_string();
    let positive = summary["total_positive"].as_u64().unwrap_or(0) as u32;
    let negative = summary["total_negative"].as_u64().unwrap_or(0) as u32;

    let reviews: Vec<SteamReview> = json["reviews"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|r| {
                    let review_text = r["review"].as_str()?.to_string();
                    if review_text.len() < 10 { return None; }
                    // Truncate very long reviews
                    let text = if review_text.len() > 500 {
                        format!("{}...", &review_text[..500])
                    } else {
                        review_text
                    };
                    Some(SteamReview {
                        author_name: r["author"]["steamid"].as_str().unwrap_or("Anonymous").to_string(),
                        hours_played: r["author"]["playtime_forever"].as_f64().unwrap_or(0.0) / 60.0,
                        voted_up: r["voted_up"].as_bool().unwrap_or(true),
                        review_text: text,
                        timestamp: r["timestamp_created"].as_i64().unwrap_or(0),
                    })
                })
                .take(10)
                .collect()
        })
        .unwrap_or_default();

    Ok((score_desc, positive, negative, reviews))
}

/// Fetch full Steam data (details + reviews) for a game.
pub async fn fetch_full_steam_data(app_id: u32) -> Result<SteamGameData, String> {
    let appid_str = app_id.to_string();

    // Fetch app details
    let client = build_client()?;
    let details_url = format!(
        "https://store.steampowered.com/api/appdetails?appids={}&cc=us&l=en",
        app_id
    );
    let resp = client.get(&details_url).send().await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let app_data = &json[&appid_str];
    let data = &app_data["data"];

    let short_description = data["short_description"].as_str()
        .map(|s| strip_html(s))
        .filter(|s| !s.is_empty());

    let categories: Vec<String> = data["categories"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|c| c["description"].as_str().map(str::to_string)).collect())
        .unwrap_or_default();

    let release_date = data["release_date"]["date"].as_str().map(str::to_string);

    let languages = data["supported_languages"].as_str()
        .map(|s| {
            strip_html(s).split(',')
                .map(|lang| lang.trim().split('<').next().unwrap_or("").trim().to_string())
                .filter(|s| !s.is_empty())
                .collect::<Vec<String>>()
        })
        .unwrap_or_default();

    let requirements_min = data["pc_requirements"]["minimum"].as_str()
        .map(|s| strip_html(s));
    let requirements_rec = data["pc_requirements"]["recommended"].as_str()
        .map(|s| strip_html(s));

    let dlc_count = data["dlc"].as_array().map(|a| a.len() as u32).unwrap_or(0);

    let achievements_count = data["achievements"]["total"].as_u64().unwrap_or(0) as u32;

    // Fetch reviews
    rate_limit_sleep().await;
    let (score_desc, positive, negative, reviews) = fetch_steam_reviews(app_id).await
        .unwrap_or_else(|_| (String::new(), 0, 0, Vec::new()));

    Ok(SteamGameData {
        steam_app_id: app_id,
        review_score_desc: if score_desc.is_empty() { None } else { Some(score_desc) },
        review_positive: positive,
        review_negative: negative,
        short_description,
        categories,
        release_date,
        languages,
        requirements_min,
        requirements_rec,
        dlc_count,
        achievements_count,
        reviews,
        store_url: format!("https://store.steampowered.com/app/{}", app_id),
    })
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
