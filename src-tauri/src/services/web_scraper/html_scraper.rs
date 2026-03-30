//! HTML scraper using reqwest + scraper crate (TASK-015-08).
//! Extracts structured game metadata from static HTML pages.

use scraper::{Html, Selector};
use tokio::time::Duration;

use super::ScrapedGameData;

const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0";

pub async fn scrape_html(url: &str) -> Result<ScrapedGameData, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent(UA)
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let html = resp.text().await.map_err(|e| e.to_string())?;
    Ok(parse_html(&html))
}

pub fn parse_html_str(html: &str) -> ScrapedGameData {
    parse_html(html)
}

fn parse_html(html: &str) -> ScrapedGameData {
    let doc = Html::parse_document(html);
    let mut data = ScrapedGameData::default();

    // --- og:description / meta description ---
    if let Ok(sel) = Selector::parse("meta[property='og:description'], meta[name='description']") {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    data.description = Some(trimmed);
                }
            }
        }
    }

    // --- og:title as fallback title ---
    if let Ok(sel) = Selector::parse("meta[property='og:title']") {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    data.title = Some(trimmed);
                }
            }
        }
    }

    // --- og:image as cover ---
    if let Ok(sel) = Selector::parse("meta[property='og:image']") {
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    data.cover_url = Some(trimmed);
                }
            }
        }
    }

    // --- JSON-LD structured data (VideoGame schema) ---
    if let Ok(sel) = Selector::parse("script[type='application/ld+json']") {
        for el in doc.select(&sel) {
            let text = el.text().collect::<String>();
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                try_extract_json_ld(&json, &mut data);
            }
        }
    }

    // --- Common patterns for game sites ---
    // Try to find developer/publisher in structured content
    if data.developer.is_none() {
        for pattern in &["[itemprop='author']", ".developer", "#developer", ".game-developer"] {
            if let Ok(sel) = Selector::parse(pattern) {
                if let Some(el) = doc.select(&sel).next() {
                    let text = el.text().collect::<String>().trim().to_string();
                    if !text.is_empty() && text.len() < 100 {
                        data.developer = Some(text);
                        break;
                    }
                }
            }
        }
    }

    data
}

fn try_extract_json_ld(json: &serde_json::Value, data: &mut ScrapedGameData) {
    let t = json["@type"].as_str().unwrap_or("");
    if !t.eq_ignore_ascii_case("VideoGame") && !t.eq_ignore_ascii_case("Game") {
        return;
    }
    if data.title.is_none() {
        data.title = json["name"].as_str().map(str::to_string);
    }
    if data.description.is_none() {
        data.description = json["description"].as_str().map(str::to_string);
    }
    if data.developer.is_none() {
        data.developer = json["author"]["name"].as_str()
            .or_else(|| json["developer"]["name"].as_str())
            .map(str::to_string);
    }
    if data.publisher.is_none() {
        data.publisher = json["publisher"]["name"].as_str().map(str::to_string);
    }
    if data.genre.is_none() {
        data.genre = json["genre"].as_str().map(str::to_string);
    }
}
