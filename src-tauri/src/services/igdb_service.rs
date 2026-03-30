//! IGDB (Twitch) API client — full PC game metadata + artwork.
//! Covers Steam, Epic, GOG, EA games by title search.

use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

const TWITCH_TOKEN_URL: &str = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE: &str = "https://api.igdb.com/v4";
const UA: &str = "cubi-frontend/0.1";

#[derive(Debug, Clone)]
struct IgdbToken {
    access_token: String,
    expires_at: std::time::Instant,
}

#[derive(Debug, Default, Clone)]
pub struct IgdbGameData {
    pub igdb_id: i64,
    pub title: Option<String>,
    pub description: Option<String>,
    pub genre: Option<String>,
    pub year: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub rating: Option<f32>,
    pub cover_url: Option<String>,
    pub screenshot_urls: Vec<String>,
    pub artwork_urls: Vec<String>,
    pub trailer_youtube_id: Option<String>,
    pub website: Option<String>,
}

pub struct IgdbService {
    client_id: String,
    client_secret: String,
    token: Arc<Mutex<Option<IgdbToken>>>,
    http: reqwest::Client,
}

impl IgdbService {
    pub fn new(client_id: String, client_secret: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(UA)
            .build()
            .expect("reqwest client");
        Self {
            client_id,
            client_secret,
            token: Arc::new(Mutex::new(None)),
            http,
        }
    }

    async fn get_token(&self) -> Result<String, String> {
        let mut guard = self.token.lock().await;
        if let Some(tok) = guard.as_ref() {
            if tok.expires_at > std::time::Instant::now() + Duration::from_secs(60) {
                return Ok(tok.access_token.clone());
            }
        }
        // Fetch new token
        let resp = self.http
            .post(TWITCH_TOKEN_URL)
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.as_str()),
                ("grant_type", "client_credentials"),
            ])
            .send()
            .await
            .map_err(|e| format!("IGDB auth: {}", e))?;
        if !resp.status().is_success() {
            return Err(format!("IGDB auth HTTP {}", resp.status()));
        }
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let token = json["access_token"].as_str()
            .ok_or("IGDB: missing access_token")?
            .to_string();
        let expires_in = json["expires_in"].as_u64().unwrap_or(3600 * 24 * 60);
        *guard = Some(IgdbToken {
            access_token: token.clone(),
            expires_at: std::time::Instant::now() + Duration::from_secs(expires_in),
        });
        log::info!("IGDB token acquired (expires in {}s)", expires_in);
        Ok(token)
    }

    async fn post_igdb(&self, endpoint: &str, body: &str) -> Result<serde_json::Value, String> {
        let token = self.get_token().await?;
        let resp = self.http
            .post(format!("{}/{}", IGDB_BASE, endpoint))
            .header("Client-ID", &self.client_id)
            .bearer_auth(&token)
            .header("Content-Type", "text/plain")
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("IGDB {} HTTP {}", endpoint, resp.status()));
        }
        resp.json().await.map_err(|e| e.to_string())
    }

    /// Search for a game by title on PC platform (id=6).
    pub async fn search_game(&self, title: &str) -> Result<Option<IgdbGameData>, String> {
        let query = format!(
            r#"fields name,summary,genres.name,first_release_date,
                     involved_companies.company.name,involved_companies.developer,
                     involved_companies.publisher,rating,screenshots.url,
                     artworks.url,cover.url,websites.url,websites.category,
                     videos.video_id;
               where platforms = (6) & version_parent = null;
               search "{}";
               limit 5;"#,
            title.replace('"', "'")
        );
        let results = self.post_igdb("games", &query).await?;
        let arr = results.as_array().ok_or("IGDB: expected array")?;
        if arr.is_empty() { return Ok(None); }

        // Pick best match by title similarity
        let norm_query = super::normalize_title(title);
        let best = arr.iter().max_by_key(|g| {
            let game_title = g["name"].as_str().unwrap_or("");
            let norm = super::normalize_title(game_title);
            similarity_score(&norm_query, &norm)
        });
        let game = match best { Some(g) => g, None => return Ok(None) };

        let igdb_id = game["id"].as_i64().unwrap_or(0);
        let name = game["name"].as_str().map(str::to_string);
        let description = game["summary"].as_str().map(str::to_string);

        let genre = game["genres"].as_array().map(|arr| {
            arr.iter().filter_map(|g| g["name"].as_str()).collect::<Vec<_>>().join(", ")
        }).filter(|s| !s.is_empty());

        let year = game["first_release_date"].as_i64().map(|ts| {
            let secs = ts;
            let dt = chrono::DateTime::from_timestamp(secs, 0)
                .unwrap_or_default();
            dt.format("%Y").to_string()
        });

        let (mut developer, mut publisher) = (None::<String>, None::<String>);
        if let Some(companies) = game["involved_companies"].as_array() {
            for co in companies {
                let company_name = co["company"]["name"].as_str().map(str::to_string);
                if co["developer"].as_bool().unwrap_or(false) && developer.is_none() {
                    developer = company_name.clone();
                }
                if co["publisher"].as_bool().unwrap_or(false) && publisher.is_none() {
                    publisher = company_name;
                }
            }
        }

        let rating = game["rating"].as_f64().map(|r| (r / 100.0) as f32);

        let cover_url = game["cover"]["url"].as_str()
            .map(|u| fix_igdb_url(u, "t_cover_big"));

        let screenshot_urls: Vec<String> = game["screenshots"].as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|s| s["url"].as_str().map(|u| fix_igdb_url(u, "t_1080p")))
                    .take(5)
                    .collect()
            })
            .unwrap_or_default();

        let artwork_urls: Vec<String> = game["artworks"].as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|a| a["url"].as_str().map(|u| fix_igdb_url(u, "t_1080p")))
                    .take(3)
                    .collect()
            })
            .unwrap_or_default();

        let trailer_youtube_id = game["videos"].as_array()
            .and_then(|arr| arr.first())
            .and_then(|v| v["video_id"].as_str())
            .map(str::to_string);

        // Official website (category 1)
        let website = game["websites"].as_array().and_then(|arr| {
            arr.iter()
                .find(|w| w["category"].as_i64() == Some(1))
                .and_then(|w| w["url"].as_str())
                .map(str::to_string)
        });

        Ok(Some(IgdbGameData {
            igdb_id,
            title: name,
            description,
            genre,
            year,
            developer,
            publisher,
            rating,
            cover_url,
            screenshot_urls,
            artwork_urls,
            trailer_youtube_id,
            website,
        }))
    }

    /// Download cover + screenshots to local media paths.
    pub async fn download_igdb_media(
        &self,
        data: &IgdbGameData,
        dest_dir: &Path,
        game_name: &str,
        max_screenshots: u32,
        overwrite: bool,
    ) -> Result<IgdbMediaPaths, String> {
        let safe = sanitize(game_name);
        let mut paths = IgdbMediaPaths::default();

        if let Some(url) = &data.cover_url {
            let dest = dest_dir.join("pc").join("box2dfront").join(format!("{}.jpg", safe));
            if !dest.exists() || overwrite {
                if download_url(&self.http, url, &dest).await.is_ok() {
                    paths.cover = Some(dest.to_string_lossy().to_string());
                }
            } else {
                paths.cover = Some(dest.to_string_lossy().to_string());
            }
        }

        for (i, url) in data.screenshot_urls.iter().enumerate().take(max_screenshots as usize) {
            let dest = dest_dir.join("pc").join("screenshots").join(format!("{}_{}.jpg", safe, i));
            if !dest.exists() || overwrite {
                if download_url(&self.http, url, &dest).await.is_ok() {
                    paths.screenshots.push(dest.to_string_lossy().to_string());
                }
            } else {
                paths.screenshots.push(dest.to_string_lossy().to_string());
            }
            sleep(Duration::from_millis(100)).await;
        }

        Ok(paths)
    }
}

#[derive(Debug, Default)]
pub struct IgdbMediaPaths {
    pub cover: Option<String>,
    pub screenshots: Vec<String>,
}

// ── Helpers ──────────────────────────────────────────────────────────────

fn fix_igdb_url(url: &str, size: &str) -> String {
    let u = if url.starts_with("//") {
        format!("https:{}", url)
    } else {
        url.to_string()
    };
    // Replace any size token with the desired size
    if let Some(pos) = u.find("/t_") {
        let after_size = &u[pos + 3..];
        let slash = after_size.find('/').unwrap_or(after_size.len());
        let prefix = &u[..pos];
        let suffix = &after_size[slash..];
        format!("{}/{}{}",prefix, size, suffix)
    } else {
        u
    }
}

fn similarity_score(a: &str, b: &str) -> u32 {
    if a == b { return 1000; }
    if b.starts_with(a) || a.starts_with(b) { return 900; }
    if b.contains(a) || a.contains(b) { return 800; }
    // Count common words
    let a_words: std::collections::HashSet<&str> = a.split_whitespace().collect();
    let b_words: std::collections::HashSet<&str> = b.split_whitespace().collect();
    a_words.intersection(&b_words).count() as u32 * 100
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| match c { '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_', c => c })
        .collect::<String>()
        .trim()
        .to_string()
}

async fn download_url(client: &reqwest::Client, url: &str, dest: &Path) -> Result<(), String> {
    if let Some(p) = dest.parent() { std::fs::create_dir_all(p).ok(); }
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() { return Err(format!("HTTP {}", resp.status())); }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() < 8 { return Err("too small".into()); }
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}
