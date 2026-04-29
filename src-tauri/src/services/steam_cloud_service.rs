//! Steam Web API cloud library integration (REQ-024).
//! Fetches all games owned by a Steam user (installed + uninstalled) and
//! merges with locally-installed ACF manifest data.

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::db::{Database, PcCacheRow};
use super::pc_import_service::PcImportGame;

// ── Steam API response types ──────────────────────────────────────────

#[derive(Deserialize, Default)]
struct OwnedGamesResp {
    response: OwnedGamesInner,
}

#[derive(Deserialize, Default)]
struct OwnedGamesInner {
    #[serde(default)]
    games: Vec<SteamGameEntry>,
}

#[derive(Deserialize)]
struct SteamGameEntry {
    appid: u64,
    #[serde(default)]
    name: String,
}

#[derive(Deserialize, Default)]
struct VanityResp {
    response: VanityInner,
}

#[derive(Deserialize, Default)]
struct VanityInner {
    steamid: Option<String>,
    #[serde(default)]
    success: u32,
}

// ── Local Steam path helpers ──────────────────────────────────────────

#[cfg(windows)]
fn find_steam_root() -> Option<PathBuf> {
    use winreg::{enums::*, RegKey};
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(k) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam") {
        if let Ok(p) = k.get_value::<String, _>("InstallPath") {
            let pb = PathBuf::from(p);
            if pb.exists() {
                return Some(pb);
            }
        }
    }
    for d in &["C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"] {
        let p = PathBuf::from(d);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

#[cfg(not(windows))]
fn find_steam_root() -> Option<PathBuf> {
    None
}

fn steam_library_paths(root: &Path) -> Vec<PathBuf> {
    let mut libs = vec![root.to_path_buf()];
    let vdf = root.join("steamapps").join("libraryfolders.vdf");
    if let Ok(content) = std::fs::read_to_string(&vdf) {
        for line in content.lines() {
            let t = line.trim();
            if t.to_lowercase().starts_with("\"path\"") {
                let parts: Vec<&str> = t.split('"').collect();
                if parts.len() >= 4 && !parts[3].is_empty() {
                    let p = PathBuf::from(parts[3].replace("\\\\", "\\"));
                    if p.exists() && !libs.contains(&p) {
                        libs.push(p);
                    }
                }
            }
        }
    }
    libs
}

/// Returns the set of appids that have installed ACF manifests in any Steam library.
fn installed_steam_appids() -> HashSet<String> {
    let mut ids = HashSet::new();
    let root = match find_steam_root() {
        Some(r) => r,
        None => return ids,
    };
    for lib in steam_library_paths(&root) {
        let steamapps = lib.join("steamapps");
        let Ok(entries) = std::fs::read_dir(&steamapps) else {
            continue;
        };
        for e in entries.flatten() {
            let p = e.path();
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name.starts_with("appmanifest_")
                && p.extension().and_then(|ext| ext.to_str()) == Some("acf")
            {
                // Extract appid from filename: appmanifest_730.acf → "730"
                if let Some(id) = name
                    .strip_prefix("appmanifest_")
                    .and_then(|s| s.strip_suffix(".acf"))
                {
                    ids.insert(id.to_string());
                }
            }
        }
    }
    ids
}

// ── Public API ────────────────────────────────────────────────────────

/// Resolve a Steam identifier to a 64-bit numeric Steam ID.
/// If `input` is already all-digits (≥15 chars) it is returned as-is.
/// Otherwise the Steam ResolveVanityURL API is called.
pub async fn resolve_steam_id(input: &str, api_key: &str) -> Option<String> {
    let input = input.trim();
    if input.chars().all(|c| c.is_ascii_digit()) && input.len() >= 15 {
        return Some(input.to_string());
    }
    let url = format!(
        "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key={}&vanityurl={}&type=1",
        api_key, input
    );
    let resp = Client::new()
        .get(&url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .ok()?;
    let body: VanityResp = resp.json().await.ok()?;
    if body.response.success == 1 {
        body.response.steamid
    } else {
        log::warn!(
            "steam_cloud: could not resolve vanity '{}': success={}",
            input,
            body.response.success
        );
        None
    }
}

/// Fetch all games owned by the user on Steam (installed + uninstalled).
///
/// - If `force_refresh` is `false` and a cached result younger than 24 h exists, returns cache.
/// - Returns an empty vec if `steam_id` or `api_key` are blank or the API call fails.
pub async fn fetch_steam_owned(
    db: &Database,
    steam_id: &str,
    api_key: &str,
    force_refresh: bool,
) -> Vec<PcImportGame> {
    if steam_id.trim().is_empty() || api_key.trim().is_empty() {
        return Vec::new();
    }

    let installed = installed_steam_appids();

    // Return cache if still fresh
    if !force_refresh {
        if let Ok(cache) = db.read_cloud_cache("steam", 86400) {
            if !cache.is_empty() {
                return rows_to_games(cache, &installed);
            }
        }
    }

    // Resolve vanity URL / numeric ID
    let sid = match resolve_steam_id(steam_id, api_key).await {
        Some(s) => s,
        None => {
            log::warn!("steam_cloud: could not resolve Steam ID '{}' — returning empty", steam_id);
            return Vec::new();
        }
    };

    // Fetch owned games from the Steam Web API
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/\
         ?key={}&steamid={}&include_appinfo=1&include_played_free_games=1&format=json",
        api_key, sid
    );
    let resp = match Client::new()
        .get(&url)
        .timeout(Duration::from_secs(30))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::warn!("steam_cloud: HTTP error: {}", e);
            return Vec::new();
        }
    };
    let body: OwnedGamesResp = match resp.json().await {
        Ok(b) => b,
        Err(e) => {
            log::warn!("steam_cloud: JSON parse error: {}", e);
            return Vec::new();
        }
    };

    // Filter known non-game / redistributable appids
    const SKIP: &[u64] = &[228980, 1070560, 1391110, 1628350, 250820, 1493710, 2180100];
    let rows: Vec<PcCacheRow> = body
        .response
        .games
        .into_iter()
        .filter(|g| !SKIP.contains(&g.appid) && !g.name.is_empty())
        .map(|g| PcCacheRow {
            game_id: g.appid.to_string(),
            title: g.name,
            box_art: Some(format!(
                "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/library_600x900.jpg",
                g.appid
            )),
            developer: None,
            publisher: None,
            protocol_url: format!("steam://install/{}", g.appid),
        })
        .collect();

    if rows.is_empty() {
        log::info!("steam_cloud: no games returned from API for Steam ID '{}'", sid);
        return Vec::new();
    }

    log::info!("steam_cloud: caching {} games for Steam ID '{}'", rows.len(), sid);
    let _ = db.upsert_cloud_cache("steam", &rows);

    // Re-read from cache to use the canonical conversion path
    let cached = db.read_cloud_cache("steam", 86400).unwrap_or_else(|_| rows.clone());
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
                    format!("steam://rungameid/{}", r.game_id)
                } else {
                    r.protocol_url // steam://install/<appid>
                },
                file_size: 0,
                developer: r.developer,
                publisher: r.publisher,
                source: "steam".to_string(),
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
