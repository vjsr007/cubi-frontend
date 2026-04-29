//! GOG Galaxy cloud library integration (REQ-024).
//!
//! Reads the GOG Galaxy 2.0 local SQLite database to get the user's owned
//! game IDs, then fetches title/art from the GOG public API.
//!
//! DB path: `%LOCALAPPDATA%\GOG.com\Galaxy\storage\galaxy-2.0.db`
//! Opened read-only to avoid interfering with the running GOG Galaxy process.

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashSet;
use std::time::Duration;

use crate::db::{Database, PcCacheRow};
use super::pc_import_service::PcImportGame;

// ── GOG API types ─────────────────────────────────────────────────────

#[derive(Deserialize, Default)]
struct GogOwned {
    #[serde(default)]
    owned: Vec<u64>,
}

#[derive(Deserialize)]
struct GogProduct {
    id: u64,
    #[serde(default)]
    title: String,
    #[serde(default)]
    slug: Option<String>,
    images: Option<GogImages>,
    #[serde(default)]
    developer: Option<String>,
    #[serde(default)]
    publisher: Option<String>,
}

#[derive(Deserialize)]
struct GogImages {
    #[serde(default)]
    logo2x: Option<String>,
    #[serde(default)]
    background: Option<String>,
}

// ── Local GOG path helpers ────────────────────────────────────────────

/// Open the GOG Galaxy 2.0 database read-only and try to extract an access token.
/// Returns `None` if the DB is absent or the token table/column doesn't exist.
fn read_gog_token() -> Option<String> {
    let db_path = dirs::data_local_dir()?
        .join("GOG.com")
        .join("Galaxy")
        .join("storage")
        .join("galaxy-2.0.db");
    if !db_path.exists() {
        return None;
    }

    use rusqlite::{Connection, OpenFlags};
    let conn = Connection::open_with_flags(
        &db_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .ok()?;

    // Try several known table/column combinations across GOG Galaxy versions
    let queries = [
        "SELECT token FROM Authentication LIMIT 1",
        "SELECT access_token FROM Authentication LIMIT 1",
        "SELECT localValue FROM UserData WHERE key = 'access_token' LIMIT 1",
        "SELECT localValue FROM Settings WHERE key = 'accessToken' LIMIT 1",
    ];
    for q in &queries {
        if let Ok(token) = conn.query_row(q, [], |row| row.get::<_, String>(0)) {
            if !token.is_empty() {
                return Some(token);
            }
        }
    }
    None
}

/// Read owned product IDs from the GOG Galaxy local database (no API needed).
fn read_gog_local_owned_ids() -> Option<Vec<u64>> {
    let db_path = dirs::data_local_dir()?
        .join("GOG.com")
        .join("Galaxy")
        .join("storage")
        .join("galaxy-2.0.db");
    if !db_path.exists() {
        return None;
    }

    use rusqlite::{Connection, OpenFlags};
    let conn = Connection::open_with_flags(
        &db_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .ok()?;

    // Try LibraryReleases table (GOG Galaxy 2.x)
    let queries = [
        "SELECT CAST(releaseKey AS INTEGER) FROM LibraryReleases WHERE releaseKey NOT LIKE '%_%' LIMIT 2000",
        "SELECT productId FROM Products LIMIT 2000",
    ];
    for q in &queries {
        let mut stmt = match conn.prepare(q) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let ids: Vec<u64> = stmt
            .query_map([], |row| row.get::<_, i64>(0))
            .ok()?
            .filter_map(|r| r.ok())
            .filter(|&id| id > 0)
            .map(|id| id as u64)
            .collect();
        if !ids.is_empty() {
            return Some(ids);
        }
    }
    None
}

/// Collect installed GOG game IDs from the Windows registry.
#[cfg(windows)]
fn installed_gog_ids() -> HashSet<u64> {
    use winreg::{enums::*, RegKey};
    let mut ids = HashSet::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for reg_path in &[
        "SOFTWARE\\WOW6432Node\\GOG.com\\Games",
        "SOFTWARE\\GOG.com\\Games",
    ] {
        if let Ok(gog_key) = hklm.open_subkey(reg_path) {
            for id_str in gog_key.enum_keys().flatten() {
                if let Ok(id) = id_str.parse::<u64>() {
                    ids.insert(id);
                }
            }
        }
    }
    ids
}

#[cfg(not(windows))]
fn installed_gog_ids() -> HashSet<u64> {
    HashSet::new()
}

// ── Public API ────────────────────────────────────────────────────────

/// Fetch all GOG-owned games, merging cloud/local data with installed status.
/// Falls back gracefully if the GOG Galaxy database is not present.
pub async fn fetch_gog_owned(
    db: &Database,
    force_refresh: bool,
) -> Vec<PcImportGame> {
    let installed = installed_gog_ids();

    // Serve cache if still fresh
    if !force_refresh {
        if let Ok(cache) = db.read_cloud_cache("gog", 86400) {
            if !cache.is_empty() {
                return rows_to_games(cache, &installed);
            }
        }
    }

    // Step 1: Try to get owned IDs from the local Galaxy DB first (no API needed)
    let mut product_ids: Vec<u64> = read_gog_local_owned_ids().unwrap_or_default();

    // Step 2: If we have a token, try the embed.gog.com API for a complete list
    if let Some(token) = read_gog_token() {
        let client = Client::new();
        if let Ok(resp) = client
            .get("https://embed.gog.com/user/data/games")
            .header("Cookie", format!("gog-al={}", token))
            .timeout(Duration::from_secs(20))
            .send()
            .await
        {
            if let Ok(owned) = resp.json::<GogOwned>().await {
                if !owned.owned.is_empty() {
                    product_ids = owned.owned;
                }
            }
        }
    }

    if product_ids.is_empty() {
        log::info!("gog_cloud: no GOG product IDs found");
        return Vec::new();
    }

    // Step 3: Batch-fetch product details from GOG API (50 IDs at a time)
    let client = Client::new();
    let mut rows: Vec<PcCacheRow> = Vec::new();

    for chunk in product_ids.chunks(50) {
        let ids_param = chunk
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        let url = format!(
            "https://api.gog.com/products?ids={}&expand=downloads&locale=en-US",
            ids_param
        );
        let resp = match client
            .get(&url)
            .timeout(Duration::from_secs(15))
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                log::warn!("gog_cloud: API error: {}", e);
                continue;
            }
        };
        let products: Vec<GogProduct> = match resp.json().await {
            Ok(p) => p,
            Err(e) => {
                log::warn!("gog_cloud: JSON parse error: {}", e);
                continue;
            }
        };
        for product in products {
            if product.title.is_empty() {
                continue;
            }
            let box_art = product.images.as_ref().and_then(|img| {
                img.logo2x
                    .clone()
                    .or_else(|| img.background.clone())
                    .map(|url| {
                        if url.starts_with("//") {
                            format!("https:{}", url)
                        } else {
                            url
                        }
                    })
            });
            rows.push(PcCacheRow {
                game_id: product.id.to_string(),
                title: product.title,
                box_art,
                developer: product.developer,
                publisher: product.publisher,
                protocol_url: format!("goggalaxy://openGameView/{}", product.id),
            });
        }
    }

    if rows.is_empty() {
        log::info!("gog_cloud: no GOG game details resolved");
        return Vec::new();
    }

    log::info!("gog_cloud: caching {} GOG games", rows.len());
    let _ = db.upsert_cloud_cache("gog", &rows);
    let cached = db.read_cloud_cache("gog", 86400).unwrap_or_else(|_| rows.clone());
    rows_to_games(cached, &installed)
}

// ── Internal helpers ──────────────────────────────────────────────────

fn rows_to_games(rows: Vec<PcCacheRow>, installed: &HashSet<u64>) -> Vec<PcImportGame> {
    let mut games: Vec<PcImportGame> = rows
        .into_iter()
        .map(|r| {
            let id_num: u64 = r.game_id.parse().unwrap_or(0);
            let is_installed = installed.contains(&id_num);
            PcImportGame {
                title: r.title,
                file_path: if is_installed {
                    format!("goggalaxy://openGameView/{}", r.game_id)
                } else {
                    r.protocol_url
                },
                file_size: 0,
                developer: r.developer,
                publisher: r.publisher,
                source: "gog".to_string(),
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
