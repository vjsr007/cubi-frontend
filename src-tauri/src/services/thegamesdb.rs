use crate::models::{GameInfo, ScraperConfig};

const TGDB_API_BASE: &str = "https://api.thegamesdb.net/v1";

/// Map our system IDs to TheGamesDB platform IDs
fn tgdb_platform_id(system_id: &str) -> Option<u32> {
    match system_id {
        "nes"           => Some(7),
        "snes"          => Some(6),
        "n64"           => Some(3),
        "gb"            => Some(4),
        "gbc"           => Some(41),
        "gba"           => Some(5),
        "nds"           => Some(8),
        "3ds"           => Some(4912),
        "gc"            => Some(2),
        "wii"           => Some(9),
        "wiiu"          => Some(38),
        "switch"        => Some(4971),
        "megadrive" | "genesis" => Some(18),
        "mastersystem"  => Some(35),
        "gamegear"      => Some(21),
        "saturn"        => Some(17),
        "dreamcast"     => Some(16),
        "psx"           => Some(10),
        "ps2"           => Some(11),
        "ps3"           => Some(12),
        "psp"           => Some(13),
        "psvita"        => Some(39),
        "ps4"           => Some(4919),
        "atari2600"     => Some(22),
        "atari7800"     => Some(26),
        "pcengine"      => Some(34),
        "neogeo"        => Some(24),
        "mame" | "arcade" | "fbneo" => Some(23),
        "xbox"          => Some(14),
        "xbox360"       => Some(15),
        "colecovision"  => Some(29),
        "intellivision" => Some(30),
        _ => None,
    }
}

pub struct TgdbGameData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub players: Option<i32>,
    pub rating: Option<f64>,
    pub box_art_front_url: Option<String>,
    pub box_art_back_url: Option<String>,
    pub screenshot_urls: Vec<String>,
    pub fanart_urls: Vec<String>,
}

pub async fn scrape_game(
    config: &ScraperConfig,
    game: &GameInfo,
) -> Result<TgdbGameData, String> {
    let Some(platform_id) = tgdb_platform_id(&game.system_id) else {
        return Err(format!("No TheGamesDB platform ID for: {}", game.system_id));
    };

    let api_key = config.api_key.as_deref().unwrap_or("").to_string();
    if api_key.is_empty() {
        return Err("TheGamesDB requiere un API key. Obtén uno gratis en https://forums.thegamesdb.net/ y configúralo en la sección de Scrappers.".into());
    }
    let key_param = format!("&apikey={}", api_key);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // Search by name + platform
    let title_query = urlencoding_simple(&game.title);
    let search_url = format!(
        "{}/Games/ByGameName?name={}&filter[platform]={}&fields=overview,developers,publishers,genres,players,rating{}",
        TGDB_API_BASE, title_query, platform_id, key_param
    );

    let resp = client.get(&search_url)
        .send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        if status.as_u16() == 418 || status.as_u16() == 403 {
            return Err("TheGamesDB rechazó la solicitud. Verifica tu API key en la configuración del scraper.".into());
        }
        return Err(format!("TheGamesDB HTTP {}", status));
    }

    let json: serde_json::Value = resp.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

    let games_arr = json.pointer("/data/games")
        .and_then(serde_json::Value::as_array)
        .ok_or("No games in TheGamesDB response")?;

    if games_arr.is_empty() {
        return Err("Game not found in TheGamesDB".into());
    }

    // Take the best match (first result)
    let g = &games_arr[0];
    let game_id = g.pointer("/id").and_then(serde_json::Value::as_u64).unwrap_or(0);

    let title = g.pointer("/game_title").and_then(serde_json::Value::as_str).map(|s| s.to_owned());
    let description = g.pointer("/overview").and_then(serde_json::Value::as_str).map(|s| s.to_owned());
    let year = g.pointer("/release_date")
        .and_then(serde_json::Value::as_str)
        .map(|s| s.get(..4).unwrap_or(s).to_owned());

    let players = g.pointer("/players").and_then(serde_json::Value::as_i64).map(|n| n as i32);
    let rating = g.pointer("/rating").and_then(serde_json::Value::as_str)
        .and_then(|s| s.parse::<f64>().ok())
        .map(|r| r / 10.0);

    // Developer / publisher names from included data
    let developer = extract_first_name(&json, "/include/developers/data", game_id);
    let publisher = extract_first_name(&json, "/include/publishers/data", game_id);
    let genre = extract_first_genre(&json, game_id);

    // Fetch images
    let (box_art_front_url, box_art_back_url, screenshot_urls, fanart_urls) =
        if game_id > 0 {
            fetch_images(&client, game_id, &key_param, &json).await
        } else {
            (None, None, vec![], vec![])
        };

    Ok(TgdbGameData {
        title,
        description,
        developer,
        publisher,
        year,
        genre,
        players,
        rating,
        box_art_front_url,
        box_art_back_url,
        screenshot_urls,
        fanart_urls,
    })
}

async fn fetch_images(
    client: &reqwest::Client,
    game_id: u64,
    key_param: &str,
    search_json: &serde_json::Value,
) -> (Option<String>, Option<String>, Vec<String>, Vec<String>) {
    // Try inline images first (included in search response)
    if let Some(images) = search_json.pointer("/include/boxart") {
        let front = images.pointer(&format!("/data/{}/0/filename", game_id))
            .or_else(|| find_boxart_by_side(images, game_id, "front"))
            .and_then(serde_json::Value::as_str)
            .map(|f| format!("https://cdn.thegamesdb.net/images/original/{}", f));
        let back = find_boxart_by_side(images, game_id, "back")
            .and_then(serde_json::Value::as_str)
            .map(|f| format!("https://cdn.thegamesdb.net/images/original/{}", f));
        if front.is_some() {
            return (front, back, vec![], vec![]);
        }
    }

    // Dedicated images endpoint
    let url = format!(
        "https://api.thegamesdb.net/v1/Games/Images?games_id={}&filter[type]=boxart,screenshot,fanart{}",
        game_id, key_param
    );
    let Ok(resp) = client.get(&url).send().await else { return (None, None, vec![], vec![]); };
    let Ok(json) = resp.json::<serde_json::Value>().await else { return (None, None, vec![], vec![]); };

    let base_url = json.pointer("/data/base_url/original")
        .and_then(serde_json::Value::as_str).unwrap_or("https://cdn.thegamesdb.net/images/original/");

    let mut front = None;
    let mut back = None;
    let mut screenshots = vec![];
    let mut fanarts = vec![];

    if let Some(images) = json.pointer(&format!("/data/images/{}", game_id))
        .and_then(serde_json::Value::as_array)
    {
        for img in images {
            let itype = img.pointer("/type").and_then(serde_json::Value::as_str).unwrap_or("");
            let fname = img.pointer("/filename").and_then(serde_json::Value::as_str).unwrap_or("");
            if fname.is_empty() { continue; }
            let full_url = format!("{}{}", base_url, fname);
            match itype {
                "boxart" => {
                    let side = img.pointer("/side").and_then(serde_json::Value::as_str).unwrap_or("front");
                    if side == "front" && front.is_none() { front = Some(full_url); }
                    else if side == "back" && back.is_none() { back = Some(full_url); }
                }
                "screenshot" => screenshots.push(full_url),
                "fanart"     => fanarts.push(full_url),
                _ => {}
            }
        }
    }

    (front, back, screenshots, fanarts)
}

fn find_boxart_by_side<'a>(images: &'a serde_json::Value, game_id: u64, side: &str) -> Option<&'a serde_json::Value> {
    let arr = images.pointer(&format!("/data/{}", game_id))?.as_array()?;
    for img in arr {
        if img.pointer("/side").and_then(serde_json::Value::as_str) == Some(side) {
            return img.pointer("/filename");
        }
    }
    None
}

fn extract_first_name(json: &serde_json::Value, path: &str, _game_id: u64) -> Option<String> {
    let obj = json.pointer(path)?;
    let map = obj.as_object()?;
    map.values().next()
        .and_then(|v| v.pointer("/name"))
        .and_then(serde_json::Value::as_str)
        .map(|s| s.to_owned())
}

fn extract_first_genre(json: &serde_json::Value, _game_id: u64) -> Option<String> {
    let genres = json.pointer("/include/genres/data")?;
    let map = genres.as_object()?;
    map.values().next()
        .and_then(|v| v.pointer("/name"))
        .and_then(serde_json::Value::as_str)
        .map(|s| s.to_owned())
}

/// Minimal URL percent-encoding for query strings (spaces → %20, special chars)
fn urlencoding_simple(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 16);
    for ch in s.chars() {
        match ch {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => out.push(ch),
            ' ' => out.push_str("%20"),
            _ => {
                for byte in ch.to_string().as_bytes() {
                    out.push_str(&format!("%{:02X}", byte));
                }
            }
        }
    }
    out
}
