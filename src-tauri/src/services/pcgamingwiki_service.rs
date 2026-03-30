//! PCGamingWiki MediaWiki API client.
//! Free, no auth, courtesy rate limit 1 req/s.

use tokio::time::{sleep, Duration};

const API: &str = "https://www.pcgamingwiki.com/w/api.php";
const UA: &str = "cubi-frontend/0.1";

#[derive(Debug, Clone)]
pub struct PcgwResult {
    pub page_title: String,
    pub page_url: String,
}

#[derive(Debug, Default, Clone)]
pub struct PcgwInfobox {
    pub metacritic_score: Option<i32>,
    pub opencritic_score: Option<i32>,
    pub steam_appid: Option<String>,
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(UA)
        .build()
        .map_err(|e| e.to_string())
}

/// Search PCGamingWiki for a game page by title.
pub async fn find_page(title: &str) -> Result<Option<PcgwResult>, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(title, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!(
        "{}?action=opensearch&search={}&limit=3&format=json",
        API, encoded
    );

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Ok(None);
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    // opensearch returns [query, [titles], [descs], [urls]]
    let titles = json[1].as_array().cloned().unwrap_or_default();
    let urls = json[3].as_array().cloned().unwrap_or_default();

    if titles.is_empty() { return Ok(None); }

    // Find best match
    let norm_q = super::normalize_title(title);
    let best_idx = titles.iter().enumerate().max_by_key(|(_, t)| {
        let n = super::normalize_title(t.as_str().unwrap_or(""));
        if n == norm_q { 1000u32 } else if n.contains(&norm_q) { 500 } else { 0 }
    }).map(|(i, _)| i).unwrap_or(0);

    let page_title = titles[best_idx].as_str().unwrap_or("").to_string();
    let page_url = urls.get(best_idx)
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();

    if page_title.is_empty() || page_url.is_empty() {
        return Ok(None);
    }

    sleep(Duration::from_millis(1100)).await;
    Ok(Some(PcgwResult { page_title, page_url }))
}

/// Fetch infobox data from PCGamingWiki Cargo API.
pub async fn fetch_infobox(page_title: &str) -> Result<PcgwInfobox, String> {
    let client = build_client()?;
    let encoded = percent_encoding::utf8_percent_encode(page_title, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!(
        "{}?action=cargoquery&tables=Infobox_game&fields=Steam_AppID,Metacritic,OpenCritic&where=_pageName%3D%22{}%22&format=json",
        API, encoded
    );

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() { return Ok(PcgwInfobox::default()); }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let first = json["cargoquery"]
        .as_array()
        .and_then(|a| a.first());

    if let Some(row) = first {
        let title_field = &row["title"];
        let metacritic = title_field["Metacritic"].as_str()
            .and_then(|s| s.parse::<i32>().ok());
        let opencritic = title_field["OpenCritic"].as_str()
            .and_then(|s| s.parse::<i32>().ok());
        let steam_appid = title_field["Steam AppID"].as_str()
            .filter(|s| !s.is_empty())
            .map(str::to_string);
        Ok(PcgwInfobox { metacritic_score: metacritic, opencritic_score: opencritic, steam_appid })
    } else {
        Ok(PcgwInfobox::default())
    }
}
