use std::path::Path;
use crate::models::{GameInfo, ScraperConfig};

const DEV_ID: &str = "cubi";
const DEV_PASS: &str = "";
const SOFT_NAME: &str = "cubi-frontend";

/// Map our system IDs to ScreenScraper system IDs
fn ss_system_id(system_id: &str) -> Option<u32> {
    match system_id {
        "nes"          => Some(3),
        "snes"         => Some(4),
        "n64"          => Some(14),
        "gb"           => Some(9),
        "gbc"          => Some(10),
        "gba"          => Some(12),
        "nds"          => Some(15),
        "3ds"          => Some(17),
        "gc" | "gamecube" | "ngc" => Some(13),
        "wii"          => Some(16),
        "wiiu"         => Some(18),
        "switch"       => Some(225),
        "megadrive" | "genesis" => Some(1),
        "mastersystem" => Some(2),
        "gamegear"     => Some(21),
        "saturn"       => Some(22),
        "dreamcast"    => Some(23),
        "psx"          => Some(57),
        "ps2"          => Some(58),
        "ps3"          => Some(59),
        "psp"          => Some(61),
        "psvita"       => Some(62),
        "ps4"          => Some(63),
        "atari2600"    => Some(26),
        "atari5200"    => Some(40),
        "atari7800"    => Some(41),
        "pcengine"     => Some(31),
        "neogeo"       => Some(142),
        "ngpc"         => Some(25),
        "mame" | "arcade" => Some(75),
        "fbneo"        => Some(75),
        "xbox"         => Some(32),
        "xbox360"      => Some(33),
        "colecovision" => Some(48),
        "intellivision"=> Some(115),
        "sg1000"       => Some(109),
        "wswan"        => Some(45),
        "wswanc"       => Some(46),
        _ => None,
    }
}

pub struct SsGameData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub players: Option<i32>,
    pub rating: Option<f64>,
    pub media_urls: Vec<SsMedia>,
}

pub struct SsMedia {
    pub media_type: String,  // "ss","sstitle","box-2D","wheel","fanart","video-normalized"
    pub url: String,
    pub format: String,      // "png","jpg","mp4"
}

pub async fn scrape_game(
    config: &ScraperConfig,
    game: &GameInfo,
) -> Result<SsGameData, String> {
    let Some(sysid) = ss_system_id(&game.system_id) else {
        return Err(format!("No ScreenScraper system ID for: {}", game.system_id));
    };

    let username = config.username.as_deref().unwrap_or("");
    let password = config.password.as_deref().unwrap_or("");
    if username.is_empty() {
        return Err("ScreenScraper username not configured".into());
    }

    // Compute CRC32 of the ROM file for accurate matching
    let crc = compute_crc32(&game.file_path).unwrap_or_default();
    let rom_name = Path::new(&game.file_name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&game.file_name);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/jeuInfos.php", config.url);
    let response = client.get(&url)
        .query(&[
            ("devid",      DEV_ID),
            ("devpassword", DEV_PASS),
            ("softname",   SOFT_NAME),
            ("ssid",       username),
            ("sspassword", password),
            ("crc",        &crc),
            ("systemeid",  &sysid.to_string()),
            ("romtype",    "rom"),
            ("romnom",     rom_name),
            ("output",     "json"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("ScreenScraper HTTP {}", response.status()));
    }

    let json: serde_json::Value = response.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;

    let jeu = json.pointer("/response/jeu")
        .ok_or("Game not found in ScreenScraper response")?;

    // Parse metadata
    let title = find_text_by_lang(jeu.pointer("/noms"), "en")
        .or_else(|| jeu.pointer("/noms/0/text").and_then(serde_json::Value::as_str).map(|s| s.to_owned()));

    let description = find_text_by_lang(jeu.pointer("/synopsis"), "en");

    let developer = jeu.pointer("/developpeur/text")
        .and_then(serde_json::Value::as_str).map(|s| s.to_owned());
    let publisher = jeu.pointer("/editeur/text")
        .and_then(serde_json::Value::as_str).map(|s| s.to_owned());

    let year = jeu.pointer("/dates/0/text")
        .and_then(serde_json::Value::as_str)
        .map(|s| s.get(..4).unwrap_or(s).to_owned());

    let genre = jeu.pointer("/genres/0/noms/0/text")
        .and_then(serde_json::Value::as_str).map(|s| s.to_owned());

    let players = jeu.pointer("/joueurs/text")
        .and_then(serde_json::Value::as_str)
        .and_then(|s| s.split('-').next_back()?.trim().parse().ok());

    let rating = jeu.pointer("/note/text")
        .and_then(serde_json::Value::as_str)
        .and_then(|s| s.parse::<f64>().ok())
        .map(|n| n / 20.0); // SS uses 0-20, we use 0-1

    // Parse media URLs
    let mut media_urls = Vec::new();
    if let Some(medias) = jeu.pointer("/medias").and_then(serde_json::Value::as_array) {
        for m in medias {
            let mtype = m.pointer("/type").and_then(serde_json::Value::as_str).unwrap_or("");
            let url = m.pointer("/url").and_then(serde_json::Value::as_str).unwrap_or("");
            let fmt = m.pointer("/format").and_then(serde_json::Value::as_str).unwrap_or("png");
            if !url.is_empty() && is_wanted_media_type(mtype) {
                media_urls.push(SsMedia {
                    media_type: mtype.to_owned(),
                    url: url.to_owned(),
                    format: fmt.to_owned(),
                });
            }
        }
    }

    Ok(SsGameData {
        title,
        description,
        developer,
        publisher,
        year,
        genre,
        players,
        rating,
        media_urls,
    })
}

fn is_wanted_media_type(t: &str) -> bool {
    matches!(t, "sstitle" | "ss" | "box-2D" | "box-2D-back" | "wheel" | "wheel-hd"
              | "fanart" | "video-normalized" | "marquee")
}

fn find_text_by_lang(arr: Option<&serde_json::Value>, lang: &str) -> Option<String> {
    let arr = arr?.as_array()?;
    // First try exact lang match
    for item in arr {
        if item.pointer("/langue").and_then(serde_json::Value::as_str) == Some(lang) {
            return item.pointer("/text").and_then(serde_json::Value::as_str).map(|s| s.to_owned());
        }
    }
    // Fallback to first
    arr.first()
        .and_then(|item| item.pointer("/text"))
        .and_then(serde_json::Value::as_str)
        .map(|s| s.to_owned())
}

fn compute_crc32(path: &str) -> Option<String> {
    let data = std::fs::read(path).ok()?;
    // Simple CRC32 using crc32fast or manual — use a lightweight approach
    let mut crc: u32 = 0xFFFFFFFF;
    for byte in &data {
        crc ^= *byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
        }
    }
    Some(format!("{:08X}", crc ^ 0xFFFFFFFF))
}

/// Download a ScreenScraper media file to the given destination path
pub async fn download_ss_media(url: &str, dest: &Path) -> Result<(), String> {
    if dest.exists() {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() < 8 {
        return Err("Response too small".into());
    }
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}

/// Map SS media type to our media folder name
pub fn ss_type_to_folder(ss_type: &str) -> Option<&'static str> {
    match ss_type {
        "box-2D"           => Some("box2dfront"),
        "box-2D-back"      => Some("box2dback"),
        "ss"               => Some("screenshots"),
        "sstitle"          => Some("titlescreens"),
        "fanart"           => Some("fanart"),
        "wheel" | "wheel-hd" => Some("wheel"),
        "marquee"          => Some("marquees_bak"),
        "video-normalized" => Some("videos"),
        _ => None,
    }
}
