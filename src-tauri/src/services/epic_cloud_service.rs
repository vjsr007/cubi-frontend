//! Epic Games cloud library integration (REQ-024).
//!
//! Attempts to read the locally-stored Epic OAuth token from two locations:
//! 1. Legendary CLI user.json  (`%APPDATA%\legendary\user.json`)
//! 2. Epic Games Launcher GameUserSettings.ini (`[RememberMe]` section,
//!    key `RememberMeData`, JSON with `accessToken`)
//!
//! If no token is found, returns an empty vec and the caller falls back
//! to the local-manifest scan in `pc_import_service::import_epic`.

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashSet;
use std::path::PathBuf;
use std::time::Duration;

use crate::db::{Database, PcCacheRow};
use super::pc_import_service::PcImportGame;

// ── API response types ────────────────────────────────────────────────

#[derive(Deserialize)]
struct EpicEntitlement {
    #[serde(rename = "catalogItemId", default)]
    catalog_item_id: String,
    #[serde(rename = "catalogNamespace", default)]
    namespace: String,
}

#[derive(Deserialize, Default)]
struct EpicCatalogBatch {
    #[serde(default)]
    data: std::collections::HashMap<String, EpicCatalogElement>,
}

#[derive(Deserialize, Default)]
struct EpicCatalogElement {
    #[serde(default)]
    data: EpicCatalogData,
}

#[derive(Deserialize, Default)]
struct EpicCatalogData {
    #[serde(default)]
    title: String,
    #[serde(rename = "keyImages", default)]
    key_images: Vec<EpicKeyImage>,
    #[serde(default)]
    developer: Option<String>,
    #[serde(default)]
    publisher: Option<String>,
}

#[derive(Deserialize)]
struct EpicKeyImage {
    #[serde(rename = "type")]
    img_type: String,
    url: String,
}

// ── Token reading ─────────────────────────────────────────────────────

/// Read the Epic access token + account_id from Legendary's user.json.
fn read_legendary_token() -> Option<(String, String)> {
    let config_dir = dirs::config_dir()?;
    let legendary_path = config_dir.join("legendary").join("user.json");
    let content = std::fs::read_to_string(&legendary_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let token = json["access_token"].as_str()?.to_string();
    let account_id = json["account_id"].as_str()?.to_string();
    if token.is_empty() || account_id.is_empty() {
        return None;
    }
    log::info!("epic_cloud: using Legendary token for account '{}'", account_id);
    Some((account_id, token))
}

/// Read the Epic access token from the Epic Games Launcher GameUserSettings.ini.
/// Looks for `[RememberMe]` → `RememberMeData` JSON → `accessToken`.
fn read_launcher_token() -> Option<(String, String)> {
    let local_dir = dirs::data_local_dir()?;
    let ini_path = local_dir
        .join("EpicGamesLauncher")
        .join("Saved")
        .join("Config")
        .join("Windows")
        .join("GameUserSettings.ini");
    let content = std::fs::read_to_string(&ini_path).ok()?;

    let mut in_section = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.eq_ignore_ascii_case("[RememberMe]") {
            in_section = true;
            continue;
        }
        if in_section && trimmed.starts_with('[') {
            break; // moved to next section
        }
        if in_section && trimmed.to_lowercase().starts_with("remembermedata=") {
            let json_str = trimmed
                .splitn(2, '=')
                .nth(1)
                .unwrap_or("")
                .trim();
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                let token = json["accessToken"]
                    .as_str()
                    .or_else(|| json["access_token"].as_str())
                    .map(|s| s.to_string())?;
                let account_id = json["accountId"]
                    .as_str()
                    .or_else(|| json["account_id"].as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                if !token.is_empty() {
                    log::info!("epic_cloud: using Epic launcher token");
                    return Some((account_id, token));
                }
            }
        }
    }
    None
}

fn read_epic_token() -> Option<(String, String)> {
    read_legendary_token().or_else(read_launcher_token)
}

// ── Local manifest helpers ────────────────────────────────────────────

/// Collect AppNames from locally-installed Epic manifest files.
fn installed_epic_app_names() -> HashSet<String> {
    let mut names = HashSet::new();
    let manifests = PathBuf::from(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests");
    let Ok(entries) = std::fs::read_dir(&manifests) else {
        return names;
    };
    for e in entries.flatten() {
        let p = e.path();
        if p.extension().and_then(|x| x.to_str()) == Some("item") {
            if let Ok(content) = std::fs::read_to_string(&p) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = json["AppName"].as_str() {
                        names.insert(name.to_string());
                    }
                }
            }
        }
    }
    names
}

// ── Public API ────────────────────────────────────────────────────────

/// Fetch Epic-owned games using the locally stored OAuth token.
/// Returns an empty vec if no token is available (caller uses local scan).
pub async fn fetch_epic_owned(
    db: &Database,
    force_refresh: bool,
) -> Vec<PcImportGame> {
    let installed = installed_epic_app_names();

    // Serve cache if still fresh
    if !force_refresh {
        if let Ok(cache) = db.read_cloud_cache("epic", 86400) {
            if !cache.is_empty() {
                return rows_to_games(cache, &installed);
            }
        }
    }

    // Need a token to proceed
    let (account_id, token) = match read_epic_token() {
        Some(t) => t,
        None => {
            log::info!("epic_cloud: no Epic token found — skipping cloud fetch");
            return Vec::new();
        }
    };

    // Fetch entitlements
    let entitlements_url = format!(
        "https://entitlement-public-service-prod08.ol.epicgames.com/\
         entitlement/api/account/{}/entitlements?start=0&count=5000",
        account_id
    );
    let client = Client::new();
    let entitlements_resp = match client
        .get(&entitlements_url)
        .bearer_auth(&token)
        .timeout(Duration::from_secs(30))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::warn!("epic_cloud: entitlements HTTP error: {}", e);
            return Vec::new();
        }
    };

    let entitlements: Vec<EpicEntitlement> = match entitlements_resp.json().await {
        Ok(v) => v,
        Err(e) => {
            log::warn!("epic_cloud: entitlements JSON parse error: {}", e);
            return Vec::new();
        }
    };

    if entitlements.is_empty() {
        return Vec::new();
    }

    // Build namespace+item pairs; each entitlement may belong to different namespace
    // For simplicity we use the catalog_item_id as the game key
    let item_ids: Vec<String> = entitlements
        .iter()
        .filter(|e| !e.catalog_item_id.is_empty() && !e.namespace.is_empty())
        .map(|e| format!("{}/{}", e.namespace, e.catalog_item_id))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .take(500) // cap to 500 items
        .collect();

    // Batch-fetch catalog details (20 items per request)
    let mut rows: Vec<PcCacheRow> = Vec::new();
    for chunk in item_ids.chunks(20) {
        let ids_param = chunk
            .iter()
            .map(|s| s.split('/').last().unwrap_or(s.as_str()))
            .collect::<Vec<_>>()
            .join(",");
        // Use the first namespace for the batch (they may differ but this is best-effort)
        let namespace = chunk
            .first()
            .and_then(|s| s.split('/').next())
            .unwrap_or("epic");
        let catalog_url = format!(
            "https://catalog-public-service-prod06.ol.epicgames.com/\
             catalog/api/shared/namespace/{}/bulk/items?\
             id={}&country=US&locale=en-US",
            namespace, ids_param
        );
        if let Ok(resp) = client
            .get(&catalog_url)
            .bearer_auth(&token)
            .timeout(Duration::from_secs(15))
            .send()
            .await
        {
            if let Ok(batch) = resp.json::<EpicCatalogBatch>().await {
                for (item_id, element) in batch.data {
                    let data = element.data;
                    if data.title.is_empty() {
                        continue;
                    }
                    // Best-effort box art (DieselGamebox → Thumbnail → first available)
                    let box_art = data
                        .key_images
                        .iter()
                        .find(|img| img.img_type == "DieselGameBoxTall")
                        .or_else(|| {
                            data.key_images
                                .iter()
                                .find(|img| img.img_type == "Thumbnail")
                        })
                        .map(|img| img.url.clone());

                    rows.push(PcCacheRow {
                        game_id: item_id.clone(),
                        title: data.title,
                        box_art,
                        developer: data.developer,
                        publisher: data.publisher,
                        protocol_url: format!(
                            "com.epicgames.launcher://apps/{}?action=install",
                            item_id
                        ),
                    });
                }
            }
        }
    }

    if rows.is_empty() {
        return Vec::new();
    }

    log::info!("epic_cloud: caching {} Epic games", rows.len());
    let _ = db.upsert_cloud_cache("epic", &rows);
    let cached = db.read_cloud_cache("epic", 86400).unwrap_or_else(|_| rows.clone());
    rows_to_games(cached, &installed)
}

// ── Internal helpers ──────────────────────────────────────────────────

fn rows_to_games(rows: Vec<PcCacheRow>, installed: &HashSet<String>) -> Vec<PcImportGame> {
    let mut games: Vec<PcImportGame> = rows
        .into_iter()
        .map(|r| {
            let is_installed = installed.contains(&r.game_id);
            PcImportGame {
                title: r.title,
                file_path: if is_installed {
                    format!(
                        "com.epicgames.launcher://apps/{}?action=launch",
                        r.game_id
                    )
                } else {
                    r.protocol_url
                },
                file_size: 0,
                developer: r.developer,
                publisher: r.publisher,
                source: "epic".to_string(),
                source_id: r.game_id,
                install_path: None,
                box_art: r.box_art,
                installed: is_installed,
            }
        })
        .collect();
    games.sort_by(|a, b| a.title.cmp(&b.title));
    games
}
