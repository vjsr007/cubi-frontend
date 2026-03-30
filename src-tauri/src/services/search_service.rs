//! DuckDuckGo search + official site detection (TASK-015-09).
//! Uses DuckDuckGo Instant Answer API (free, no key).

use tokio::time::Duration;

const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0";

/// Search result from DuckDuckGo.
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

/// Search DuckDuckGo for the official game site. Returns up to `limit` results.
pub async fn search_official_site(game_title: &str, limit: usize) -> Vec<SearchResult> {
    let query = format!("{} official site game", game_title);
    search_ddg(&query, limit).await
}

/// Search DuckDuckGo for gameplay videos on YouTube.
pub async fn search_youtube_url(game_title: &str) -> Option<String> {
    let query = format!("site:youtube.com {} official trailer OR gameplay", game_title);
    let results = search_ddg(&query, 3).await;
    results.into_iter()
        .find(|r| r.url.contains("youtube.com/watch"))
        .map(|r| r.url)
}

async fn search_ddg(query: &str, limit: usize) -> Vec<SearchResult> {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(UA)
        .build()
    {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let encoded = percent_encoding::utf8_percent_encode(query, percent_encoding::NON_ALPHANUMERIC)
        .to_string();
    let url = format!("https://api.duckduckgo.com/?q={}&format=json&no_html=1&skip_disambig=1", encoded);

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    if !resp.status().is_success() { return vec![]; }
    let json: serde_json::Value = match resp.json().await {
        Ok(j) => j,
        Err(_) => return vec![],
    };

    let mut results = Vec::new();

    // AbstractURL — top result
    if let (Some(title), Some(url_val)) = (
        json["Heading"].as_str(),
        json["AbstractURL"].as_str(),
    ) {
        if !url_val.is_empty() {
            results.push(SearchResult {
                title: title.to_string(),
                url: url_val.to_string(),
                snippet: json["Abstract"].as_str().unwrap_or("").to_string(),
            });
        }
    }

    // RelatedTopics
    if let Some(topics) = json["RelatedTopics"].as_array() {
        for topic in topics.iter().take(limit) {
            if let (Some(text), Some(url_val)) = (
                topic["Text"].as_str(),
                topic["FirstURL"].as_str(),
            ) {
                if !url_val.is_empty() {
                    results.push(SearchResult {
                        title: text.chars().take(80).collect(),
                        url: url_val.to_string(),
                        snippet: text.to_string(),
                    });
                }
            }
        }
    }

    results.truncate(limit);
    results
}

/// Heuristic: pick the most likely official website from a list of URLs.
/// Prioritizes matching domain keywords, avoids stores/wikis/social.
pub fn pick_official_site(urls: &[String], game_title: &str) -> Option<String> {
    let norm = super::normalize_title(game_title);
    let noise = ["wikipedia", "fandom", "gamefaqs", "steamdb", "steam", "ign",
                 "gamespot", "metacritic", "opencritic", "youtube", "twitch",
                 "pcgamingwiki", "mobygames", "igdb", "gog.com", "epicgames"];

    // First pass: domain contains game name keyword
    for url in urls {
        let lower = url.to_lowercase();
        if noise.iter().any(|n| lower.contains(n)) { continue; }
        let domain = extract_domain(url);
        let norm_domain = super::normalize_title(&domain);
        if norm_domain.contains(&norm) || norm.contains(&norm_domain) {
            return Some(url.clone());
        }
    }

    // Second pass: any URL that doesn't look like a store/wiki
    for url in urls {
        let lower = url.to_lowercase();
        if !noise.iter().any(|n| lower.contains(n)) {
            return Some(url.clone());
        }
    }

    None
}

fn extract_domain(url: &str) -> String {
    let stripped = url.trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("www.");
    stripped.split('/').next().unwrap_or("").to_string()
}
