//! Headless Chrome scraper for JS-heavy pages (TASK-015-08).
//! Spawns chrome --headless --dump-dom to get the rendered HTML,
//! then delegates parsing to html_scraper.

use tokio::time::Duration;

use super::ScrapedGameData;
use crate::services::youtube_service::check_chrome;

/// Scrape a JS-heavy URL using a headless Chrome subprocess.
/// Falls back to empty data if Chrome is not available.
pub async fn scrape_headless(url: &str) -> Result<ScrapedGameData, String> {
    let chrome = check_chrome().ok_or_else(|| "Chrome not found on system".to_string())?;

    let output = tokio::time::timeout(
        Duration::from_secs(30),
        tokio::process::Command::new(&chrome)
            .args([
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--dump-dom",
                "--timeout=15000",
                url,
            ])
            .output(),
    )
    .await
    .map_err(|_| "Chrome headless timeout".to_string())?
    .map_err(|e| format!("Chrome exec: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Chrome failed: {}", stderr.chars().take(200).collect::<String>()));
    }

    let html = String::from_utf8_lossy(&output.stdout).to_string();
    if html.trim().is_empty() {
        return Err("Chrome returned empty DOM".to_string());
    }

    Ok(super::html_scraper::parse_html_str(&html))
}
