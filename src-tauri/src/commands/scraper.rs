use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::db::Database;
use crate::models::{ScraperConfig, ScrapeJob, ScrapeResult};
use crate::services::scraper_service;

/// Credentials imported from ES-DE / EmulationStation settings
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct EsDECredentials {
    pub screenscraper_username: Option<String>,
    pub screenscraper_password: Option<String>,
    pub active_scraper: Option<String>,
}

/// Read es_settings.xml from known EmulationStation / ES-DE locations and
/// extract scraper credentials.
#[tauri::command]
pub fn import_esde_credentials() -> Result<EsDECredentials, String> {
    let candidates = esde_settings_candidates();
    for path in &candidates {
        if path.exists() {
            log::info!("Reading ES-DE settings from: {}", path.display());
            let xml = std::fs::read_to_string(path)
                .map_err(|e| format!("Cannot read {}: {}", path.display(), e))?;
            return parse_esde_settings(&xml);
        }
    }
    Err(format!(
        "es_settings.xml not found. Tried: {}",
        candidates.iter().map(|p| p.display().to_string()).collect::<Vec<_>>().join(", ")
    ))
}

fn esde_settings_candidates() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();
    if let Ok(appdata) = std::env::var("APPDATA") {
        // EmuDeck Windows path
        paths.push(std::path::PathBuf::from(format!(
            r"{}\emudeck\EmulationStation-DE\ES-DE\settings\es_settings.xml",
            appdata
        )));
        // Standalone ES-DE
        paths.push(std::path::PathBuf::from(format!(
            r"{}\ES-DE\settings\es_settings.xml",
            appdata
        )));
        // Legacy EmulationStation
        paths.push(std::path::PathBuf::from(format!(
            r"{}\EmulationStation\es_settings.xml",
            appdata
        )));
    }
    if let Ok(home) = std::env::var("USERPROFILE") {
        // Linux-style home in WSL/compat
        paths.push(std::path::PathBuf::from(format!(
            r"{}\.emulationstation\es_settings.xml",
            home
        )));
    }
    paths
}

fn parse_esde_settings(xml: &str) -> Result<EsDECredentials, String> {
    let mut username: Option<String> = None;
    let mut password: Option<String> = None;
    let mut active_scraper: Option<String> = None;

    for line in xml.lines() {
        let trimmed = line.trim();
        if let Some(val) = extract_xml_string(trimmed, "ScraperUsernameScreenScraper") {
            username = if val.is_empty() { None } else { Some(val) };
        } else if let Some(val) = extract_xml_string(trimmed, "ScraperPasswordScreenScraper") {
            password = if val.is_empty() { None } else { Some(val) };
        } else if let Some(val) = extract_xml_string(trimmed, "Scraper") {
            active_scraper = if val.is_empty() { None } else { Some(val) };
        }
    }

    Ok(EsDECredentials {
        screenscraper_username: username,
        screenscraper_password: password,
        active_scraper,
    })
}

/// Extract value= attribute from lines like:
/// <string name="KEY" value="VALUE" />
fn extract_xml_string(line: &str, key: &str) -> Option<String> {
    let name_pat = format!("name=\"{}\"", key);
    if !line.contains(&name_pat) {
        return None;
    }
    // Find value="..."
    let value_start = line.find("value=\"")?;
    let after = &line[value_start + 7..];
    let value_end = after.find('"')?;
    Some(after[..value_end].to_string())
}

/// Global cancel flag — one job at a time
static CANCEL_FLAG: std::sync::OnceLock<Arc<AtomicBool>> = std::sync::OnceLock::new();

fn cancel_flag() -> Arc<AtomicBool> {
    CANCEL_FLAG.get_or_init(|| Arc::new(AtomicBool::new(false))).clone()
}

#[tauri::command]
pub fn get_scrapers(db: State<'_, Database>) -> Result<Vec<ScraperConfig>, String> {
    db.get_scrapers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_scraper(db: State<'_, Database>, scraper: ScraperConfig) -> Result<(), String> {
    db.upsert_scraper(&scraper).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_scraper(db: State<'_, Database>, scraper: ScraperConfig) -> Result<(), String> {
    db.upsert_scraper(&scraper).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_scraper(db: State<'_, Database>, id: String) -> Result<(), String> {
    db.delete_scraper(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn run_scrape_job(app: AppHandle, job: ScrapeJob) -> Result<ScrapeResult, String> {
    let flag = cancel_flag();
    flag.store(false, Ordering::Relaxed);
    scraper_service::run_scrape_job(app, job, flag).await
}

#[tauri::command]
pub fn cancel_scrape_job() -> Result<(), String> {
    cancel_flag().store(true, Ordering::Relaxed);
    Ok(())
}
