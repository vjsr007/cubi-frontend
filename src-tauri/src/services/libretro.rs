use std::path::Path;
use crate::models::GameInfo;

/// Map our system IDs to Libretro thumbnail playlist names.
/// These correspond to folder names at https://thumbnails.libretro.com/
fn libretro_playlist_name(system_id: &str) -> Option<&'static str> {
    match system_id {
        "nes"           => Some("Nintendo - Nintendo Entertainment System"),
        "snes"          => Some("Nintendo - Super Nintendo Entertainment System"),
        "n64"           => Some("Nintendo - Nintendo 64"),
        "gb"            => Some("Nintendo - Game Boy"),
        "gbc"           => Some("Nintendo - Game Boy Color"),
        "gba"           => Some("Nintendo - Game Boy Advance"),
        "nds"           => Some("Nintendo - Nintendo DS"),
        "3ds"           => Some("Nintendo - Nintendo 3DS"),
        "gc" | "gamecube" | "ngc" => Some("Nintendo - GameCube"),
        "wii"           => Some("Nintendo - Wii"),
        "wiiu"          => Some("Nintendo - Wii U"),
        "switch"        => Some("Nintendo - Switch"),
        "megadrive" | "genesis" => Some("Sega - Mega Drive - Genesis"),
        "mastersystem"  => Some("Sega - Master System - Mark III"),
        "gamegear"      => Some("Sega - Game Gear"),
        "saturn"        => Some("Sega - Saturn"),
        "dreamcast"     => Some("Sega - Dreamcast"),
        "psx"           => Some("Sony - PlayStation"),
        "ps2"           => Some("Sony - PlayStation 2"),
        "ps3"           => Some("Sony - PlayStation 3"),
        "psp"           => Some("Sony - PlayStation Portable"),
        "psvita"        => Some("Sony - PlayStation Vita"),
        "atari2600"     => Some("Atari - 2600"),
        "atari5200"     => Some("Atari - 5200"),
        "atari7800"     => Some("Atari - 7800"),
        "pcengine"      => Some("NEC - PC Engine - TurboGrafx 16"),
        "neogeo"        => Some("SNK - Neo Geo"),
        "ngpc"          => Some("SNK - Neo Geo Pocket Color"),
        "mame" | "arcade" | "fbneo" => Some("MAME"),
        "xbox"          => Some("Microsoft - Xbox"),
        "xbox360"       => Some("Microsoft - Xbox 360"),
        "colecovision"  => Some("Coleco - ColecoVision"),
        "intellivision" => Some("Mattel - Intellivision"),
        "sg1000"        => Some("Sega - SG-1000"),
        "wswan"         => Some("Bandai - WonderSwan"),
        "wswanc"        => Some("Bandai - WonderSwan Color"),
        _ => None,
    }
}

pub struct LibretroThumbnails {
    pub box_art_url: Option<String>,
    pub snap_url: Option<String>,
    pub title_url: Option<String>,
}

/// Construct Libretro thumbnail URLs for a game.
/// Libretro thumbnails are served at:
///   https://thumbnails.libretro.com/{Playlist}/{Type}/{GameName}.png
/// where Type is: Named_Boxarts, Named_Snaps, Named_Titles
///
/// Game names must have certain characters replaced for the URL path:
///   & → _  ,  / → _  ,  : → _  etc.
pub fn get_thumbnail_urls(game: &GameInfo) -> Result<LibretroThumbnails, String> {
    let playlist = libretro_playlist_name(&game.system_id)
        .ok_or_else(|| format!("No Libretro playlist mapping for system: {}", game.system_id))?;

    let game_name = libretro_sanitize_name(&game.title);
    let playlist_enc = urlencoding_path(playlist);
    let name_enc = urlencoding_path(&game_name);

    let base = format!(
        "https://thumbnails.libretro.com/{}/",
        playlist_enc
    );

    Ok(LibretroThumbnails {
        box_art_url: Some(format!("{}Named_Boxarts/{}.png", base, name_enc)),
        snap_url: Some(format!("{}Named_Snaps/{}.png", base, name_enc)),
        title_url: Some(format!("{}Named_Titles/{}.png", base, name_enc)),
    })
}

/// Download a Libretro thumbnail image to the destination path.
/// Returns Ok(true) if downloaded, Ok(false) if 404 (not available).
pub async fn download_thumbnail(url: &str, dest: &Path) -> Result<bool, String> {
    if dest.exists() {
        return Ok(true);
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;

    if resp.status().as_u16() == 404 {
        return Ok(false); // Image not available — not an error
    }
    if !resp.status().is_success() {
        return Err(format!("Libretro HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if bytes.len() < 16 {
        return Ok(false); // Too small, probably not a real image
    }
    std::fs::write(dest, &bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Sanitize a game name for Libretro thumbnail URLs.
/// Libretro uses specific character replacements in filenames.
fn libretro_sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '&' | '*' | '/' | ':' | '`' | '<' | '>' | '?' | '\\' | '|' | '"' => '_',
            c => c,
        })
        .collect()
}

/// Percent-encode a path segment (spaces → %20, etc.) but leave / and - alone.
fn urlencoding_path(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 16);
    for ch in s.chars() {
        match ch {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' | '/' => out.push(ch),
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
