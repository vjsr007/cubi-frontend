use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::db::Database;
use crate::models::{ScraperConfig, ScrapeJob, ScrapeResult};
use crate::services::scraper_service;

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
