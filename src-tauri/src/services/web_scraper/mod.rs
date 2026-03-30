//! Web scraper dispatcher (TASK-015-08).
//! Routes to HTML scraper or headless Chrome based on availability/config.

pub mod html_scraper;
pub mod headless_scraper;

#[derive(Debug, Default, Clone)]
pub struct ScrapedGameData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub cover_url: Option<String>,
    pub screenshot_urls: Vec<String>,
}

/// Scrape a URL. If `use_headless` is true and Chrome is available, uses headless mode.
/// Otherwise falls back to static HTML fetch.
pub async fn scrape(url: &str, use_headless: bool) -> ScrapedGameData {
    if use_headless {
        match headless_scraper::scrape_headless(url).await {
            Ok(data) => return data,
            Err(e) => log::warn!("Headless scrape failed ({}), falling back to HTML: {}", url, e),
        }
    }
    match html_scraper::scrape_html(url).await {
        Ok(data) => data,
        Err(e) => {
            log::warn!("HTML scrape failed ({}): {}", url, e);
            ScrapedGameData::default()
        }
    }
}
