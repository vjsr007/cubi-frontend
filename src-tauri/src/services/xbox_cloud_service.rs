//! Xbox Game Pass cloud library integration (REQ-024).
//!
//! Fetches the public Xbox PC Game Pass catalog (no authentication required)
//! and cross-references with locally installed UWP packages and the
//! `C:\XboxGames\` directory.

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashSet;
use std::time::Duration;

use crate::db::{Database, PcCacheRow};
use super::pc_import_service::PcImportGame;

// ── Catalog API types ─────────────────────────────────────────────────

/// One entry from the Game Pass catalog SIGL endpoint.
#[derive(Deserialize)]
struct SiglEntry {
    id: String,
}

/// Display Catalog product response.
#[derive(Deserialize, Default)]
struct DisplayCatalogResp {
    #[serde(rename = "Products", default)]
    products: Vec<DisplayProduct>,
}

#[derive(Deserialize)]
struct DisplayProduct {
    #[serde(rename = "ProductId")]
    product_id: String,
    #[serde(rename = "LocalizedProperties")]
    localized: Vec<LocalizedProps>,
    #[serde(rename = "DisplaySkuAvailabilities", default)]
    sku_avail: Vec<serde_json::Value>,
}

#[derive(Deserialize, Default)]
struct LocalizedProps {
    #[serde(rename = "ProductTitle", default)]
    title: String,
    #[serde(rename = "PublisherName", default)]
    publisher: String,
    #[serde(rename = "DeveloperName", default)]
    developer: String,
    #[serde(rename = "Images", default)]
    images: Vec<ProductImage>,
}

#[derive(Deserialize)]
struct ProductImage {
    #[serde(rename = "ImagePurpose")]
    purpose: String,
    #[serde(rename = "Uri")]
    uri: String,
}

// ── Installed game detection ──────────────────────────────────────────

/// Read installed UWP package family names from the registry.
#[cfg(windows)]
fn installed_uwp_families() -> HashSet<String> {
    use winreg::{enums::*, RegKey};
    let mut families = HashSet::new();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let reg_path = r"SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages";
    if let Ok(key) = hkcu.open_subkey(reg_path) {
        for pkg_name in key.enum_keys().flatten() {
            // Package family name is the prefix up to the last `_`
            if let Some(family) = pkg_name.rsplitn(2, '_').nth(1) {
                families.insert(family.to_string());
            }
            // Also add the full package name as a fallback
            families.insert(pkg_name);
        }
    }
    families
}

#[cfg(not(windows))]
fn installed_uwp_families() -> HashSet<String> {
    HashSet::new()
}

/// Check `C:\XboxGames\` directory for installed title directories.
fn installed_xbox_game_dirs() -> HashSet<String> {
    let mut dirs = HashSet::new();
    let xbox_dir = std::path::Path::new(r"C:\XboxGames");
    if let Ok(entries) = std::fs::read_dir(xbox_dir) {
        for e in entries.flatten() {
            if let Some(name) = e.file_name().to_str() {
                dirs.insert(name.to_lowercase());
            }
        }
    }
    dirs
}

// ── Public API ────────────────────────────────────────────────────────

/// Fetch the Xbox PC Game Pass catalog and mark which titles are installed.
/// The catalog data is public (no authentication required).
pub async fn fetch_xbox_catalog(db: &Database, force_refresh: bool) -> Vec<PcImportGame> {
    let uwp_families = installed_uwp_families();
    let xbox_dirs = installed_xbox_game_dirs();

    // Serve cache if still fresh
    if !force_refresh {
        if let Ok(cache) = db.read_cloud_cache("xbox", 86400) {
            if !cache.is_empty() {
                return rows_to_games(cache, &uwp_families, &xbox_dirs);
            }
        }
    }

    let client = Client::new();

    // Step 1: Fetch catalog SIGL (list of Game Pass PC product IDs)
    let sigl_url = "https://catalog.gamepass.com/sigls/v2\
        ?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-US&market=US";
    let sigl_resp = match client
        .get(sigl_url)
        .timeout(Duration::from_secs(20))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::warn!("xbox_cloud: SIGL fetch error: {}", e);
            return Vec::new();
        }
    };
    let catalog_ids: Vec<SiglEntry> = match sigl_resp.json().await {
        Ok(v) => v,
        Err(e) => {
            log::warn!("xbox_cloud: SIGL JSON error: {}", e);
            return Vec::new();
        }
    };

    if catalog_ids.is_empty() {
        return Vec::new();
    }

    // Step 2: Batch-fetch product details (20 IDs per request)
    let id_list: Vec<String> = catalog_ids.into_iter().map(|e| e.id).collect();
    let mut rows: Vec<PcCacheRow> = Vec::new();

    for chunk in id_list.chunks(20) {
        let big_ids = chunk.join(",");
        let detail_url = format!(
            "https://displaycatalog.mp.microsoft.com/v7.0/products\
             ?bigIds={}&market=US&languages=en-US",
            big_ids
        );
        let resp = match client
            .get(&detail_url)
            .timeout(Duration::from_secs(15))
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                log::warn!("xbox_cloud: product detail error: {}", e);
                continue;
            }
        };
        let catalog: DisplayCatalogResp = match resp.json().await {
            Ok(c) => c,
            Err(e) => {
                log::warn!("xbox_cloud: product detail JSON error: {}", e);
                continue;
            }
        };

        for product in catalog.products {
            let loc = match product.localized.into_iter().next() {
                Some(l) => l,
                None => continue,
            };
            if loc.title.is_empty() {
                continue;
            }

            // Find best box art — prefer "BoxArt" purpose
            let box_art = loc
                .images
                .iter()
                .find(|img| img.purpose == "BoxArt")
                .or_else(|| loc.images.iter().find(|img| img.purpose == "Poster"))
                .or_else(|| loc.images.first())
                .map(|img| {
                    if img.uri.starts_with("//") {
                        format!("https:{}", img.uri)
                    } else {
                        img.uri.clone()
                    }
                });

            rows.push(PcCacheRow {
                game_id: product.product_id.clone(),
                title: loc.title,
                box_art,
                developer: if loc.developer.is_empty() {
                    None
                } else {
                    Some(loc.developer)
                },
                publisher: if loc.publisher.is_empty() {
                    None
                } else {
                    Some(loc.publisher)
                },
                protocol_url: format!(
                    "ms-windows-store://pdp/?productid={}",
                    product.product_id
                ),
            });
        }
    }

    if rows.is_empty() {
        return Vec::new();
    }

    log::info!("xbox_cloud: caching {} Game Pass titles", rows.len());
    let _ = db.upsert_cloud_cache("xbox", &rows);
    let cached = db.read_cloud_cache("xbox", 86400).unwrap_or_else(|_| rows.clone());
    rows_to_games(cached, &uwp_families, &xbox_dirs)
}

// ── Internal helpers ──────────────────────────────────────────────────

fn rows_to_games(
    rows: Vec<PcCacheRow>,
    uwp_families: &HashSet<String>,
    xbox_dirs: &HashSet<String>,
) -> Vec<PcImportGame> {
    let mut games: Vec<PcImportGame> = rows
        .into_iter()
        .map(|r| {
            // Check if this product ID corresponds to an installed UWP package or Xbox dir
            let title_lower = r.title.to_lowercase();
            let is_installed = uwp_families.iter().any(|f| {
                f.to_lowercase().contains(&title_lower)
                    || title_lower.contains(&f.to_lowercase())
            }) || xbox_dirs
                .iter()
                .any(|d| d.contains(&title_lower) || title_lower.contains(d.as_str()));

            PcImportGame {
                title: r.title,
                file_path: if is_installed {
                    format!("ms-windows-store://pdp/?productid={}", r.game_id)
                } else {
                    r.protocol_url
                },
                file_size: 0,
                developer: r.developer,
                publisher: r.publisher,
                source: "xbox".to_string(),
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
