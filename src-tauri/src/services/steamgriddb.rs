//! SteamGridDB API v2 client + Steam CDN helpers.
//!
//! All fetch_* functions return the **remote URL** of the best
//! 600×900 portrait cover — nothing is downloaded locally.

use reqwest::Client;
use serde::Deserialize;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};

const BASE_URL: &str = "https://www.steamgriddb.com/api/v2";

// ── Response shapes ────────────────────────────────────────────────────

#[derive(Deserialize)]
struct SgdbResponse<T> {
    success: bool,
    data: Option<T>,
}

#[derive(Deserialize)]
struct SgdbGame {
    id: u64,
}

#[derive(Deserialize)]
struct SgdbGrid {
    url: String,
}

// ── Public helpers ─────────────────────────────────────────────────────

/// Returns the Valve CDN URL for the 600×900 library cover.
/// Works for every Steam appid without any API key.
pub fn steam_cover_url(appid: &str) -> String {
    format!(
        "https://cdn.akamai.steamstatic.com/steam/apps/{}/library_600x900.jpg",
        appid
    )
}

/// Fetch the best 600×900 portrait grid from SteamGridDB using a Steam appid.
/// Returns `None` if the API key is wrong, the game isn't listed, or any
/// network error occurs.
pub async fn fetch_grid_by_steam_appid(appid: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;

    // Step 1 — resolve SGDB game entity from Steam appid
    let resp = client
        .get(format!("{BASE_URL}/games/steam/{appid}"))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let game: SgdbResponse<SgdbGame> = resp.json().await.ok()?;
    if !game.success {
        return None;
    }
    let game_id = game.data?.id;

    // Step 2 — fetch grids
    fetch_grids_for_id(game_id, api_key, &client).await
}

/// Search SteamGridDB by title and return the best 600×900 cover URL.
/// Used for Epic, EA, GOG and manually-added games.
pub async fn fetch_grid_by_name(name: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;

    // Percent-encode the title for safe use in a URL path segment
    let encoded = utf8_percent_encode(name, NON_ALPHANUMERIC).to_string();
    let resp = client
        .get(format!("{BASE_URL}/search/autocomplete/{encoded}"))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let search: SgdbResponse<Vec<SgdbGame>> = resp.json().await.ok()?;
    if !search.success {
        return None;
    }
    let game_id = search.data?.into_iter().next()?.id;

    fetch_grids_for_id(game_id, api_key, &client).await
}

// ── Extended asset types (TASK-015-04) ────────────────────────────────

/// Fetch hero/banner image URL (1920×620) by Steam appid.
pub async fn fetch_hero_by_steam_appid(appid: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_appid(appid, api_key, &client).await?;
    fetch_asset_for_id("heroes", game_id, api_key, &client).await
}

/// Fetch hero/banner image URL (1920×620) by game title.
pub async fn fetch_hero_by_name(name: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_name(name, api_key, &client).await?;
    fetch_asset_for_id("heroes", game_id, api_key, &client).await
}

/// Fetch logo URL (transparent PNG) by Steam appid.
pub async fn fetch_logo_by_steam_appid(appid: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_appid(appid, api_key, &client).await?;
    fetch_asset_for_id("logos", game_id, api_key, &client).await
}

/// Fetch logo URL (transparent PNG) by game title.
pub async fn fetch_logo_by_name(name: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_name(name, api_key, &client).await?;
    fetch_asset_for_id("logos", game_id, api_key, &client).await
}

/// Fetch background art URL by Steam appid.
pub async fn fetch_background_by_steam_appid(appid: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_appid(appid, api_key, &client).await?;
    fetch_asset_for_id("backgrounds", game_id, api_key, &client).await
}

/// Fetch background art URL by game title.
pub async fn fetch_background_by_name(name: &str, api_key: &str) -> Option<String> {
    let client = build_client()?;
    let game_id = resolve_game_id_by_name(name, api_key, &client).await?;
    fetch_asset_for_id("backgrounds", game_id, api_key, &client).await
}

// ── Internal helpers ───────────────────────────────────────────────────

async fn resolve_game_id_by_appid(appid: &str, api_key: &str, client: &Client) -> Option<u64> {
    let resp = client
        .get(format!("{BASE_URL}/games/steam/{appid}"))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let game: SgdbResponse<SgdbGame> = resp.json().await.ok()?;
    if !game.success { return None; }
    Some(game.data?.id)
}

async fn resolve_game_id_by_name(name: &str, api_key: &str, client: &Client) -> Option<u64> {
    let encoded = utf8_percent_encode(name, NON_ALPHANUMERIC).to_string();
    let resp = client
        .get(format!("{BASE_URL}/search/autocomplete/{encoded}"))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let search: SgdbResponse<Vec<SgdbGame>> = resp.json().await.ok()?;
    if !search.success { return None; }
    Some(search.data?.into_iter().next()?.id)
}

async fn fetch_asset_for_id(asset_type: &str, game_id: u64, api_key: &str, client: &Client) -> Option<String> {
    let resp = client
        .get(format!("{BASE_URL}/{asset_type}/game/{game_id}?limit=1"))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let result: SgdbResponse<Vec<SgdbGrid>> = resp.json().await.ok()?;
    if !result.success { return None; }
    result.data?.into_iter().next().map(|g| g.url)
}

fn build_client() -> Option<Client> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("cubi-frontend/0.1")
        .build()
        .ok()
}

async fn fetch_grids_for_id(game_id: u64, api_key: &str, client: &Client) -> Option<String> {
    let resp = client
        .get(format!(
            "{BASE_URL}/grids/game/{game_id}?dimensions=600x900&limit=1"
        ))
        .bearer_auth(api_key)
        .send()
        .await
        .ok()?;
    let grids: SgdbResponse<Vec<SgdbGrid>> = resp.json().await.ok()?;
    if !grids.success {
        return None;
    }
    grids.data?.into_iter().next().map(|g| g.url)
}
