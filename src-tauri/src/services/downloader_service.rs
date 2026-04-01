use std::path::{Path, PathBuf};

/// Map system IDs to Libretro thumbnail folder names (used only for download URLs).
/// These are the naming convention on https://thumbnails.libretro.com
fn libretro_system_folder(system_id: &str) -> Option<&'static str> {
    match system_id {
        "nes" | "famicom" => Some("Nintendo - Nintendo Entertainment System"),
        "snes" | "sfc" => Some("Nintendo - Super Nintendo Entertainment System"),
        "n64" => Some("Nintendo - Nintendo 64"),
        "gb" => Some("Nintendo - Game Boy"),
        "gbc" => Some("Nintendo - Game Boy Color"),
        "gba" => Some("Nintendo - Game Boy Advance"),
        "nds" => Some("Nintendo - Nintendo DS"),
        "3ds" | "n3ds" => Some("Nintendo - Nintendo 3DS"),
        "gc" | "gamecube" | "ngc" => Some("Nintendo - GameCube"),
        "wii" => Some("Nintendo - Wii"),
        "wiiu" => Some("Nintendo - Wii U"),
        "switch" => Some("Nintendo - Switch"),
        "fds" => Some("Nintendo - Famicom Disk System"),
        "satellaview" => Some("Nintendo - Satellaview"),
        "gw" => Some("Nintendo - Game & Watch"),
        "megadrive" | "genesis" => Some("Sega - Mega Drive - Genesis"),
        "mastersystem" => Some("Sega - Master System - Mark III"),
        "gamegear" => Some("Sega - Game Gear"),
        "saturn" => Some("Sega - Saturn"),
        "dreamcast" => Some("Sega - Dreamcast"),
        "sg1000" | "sg-1000" => Some("Sega - SG-1000"),
        "model2" => Some("Sega - Model 2"),
        "supermodel" => Some("Sega - Model 3"),
        "ps1" | "psx" => Some("Sony - PlayStation"),
        "ps2" => Some("Sony - PlayStation 2"),
        "ps3" => Some("Sony - PlayStation 3"),
        "psp" => Some("Sony - PlayStation Portable"),
        "psvita" => Some("Sony - PlayStation Vita"),
        "atari2600" => Some("Atari - 2600"),
        "atari5200" => Some("Atari - 5200"),
        "atari7800" => Some("Atari - 7800"),
        "atarilynx" => Some("Atari - Lynx"),
        "atarist" => Some("Atari - ST"),
        "atarijaguar" => Some("Atari - Jaguar"),
        "pcengine" => Some("NEC - PC Engine - TurboGrafx-16"),
        "neogeo" => Some("SNK - Neo Geo"),
        "ngpc" => Some("SNK - Neo Geo Pocket Color"),
        "mame" | "arcade" => Some("MAME"),
        "fbneo" => Some("FinalBurn Neo"),
        "cps1" => Some("Capcom - CPS-1"),
        "cps2" => Some("Capcom - CPS-2"),
        "cps3" => Some("Capcom - CPS-3"),
        "xbox" => Some("Microsoft - Xbox"),
        "xbox360" => Some("Microsoft - Xbox 360"),
        "colecovision" => Some("Coleco - ColecoVision"),
        "intellivision" => Some("Mattel - Intellivision"),
        "wswan" | "wonderswan" => Some("Bandai - WonderSwan"),
        "wswanc" | "wonderswancolor" => Some("Bandai - WonderSwan Color"),
        "amiga" => Some("Commodore - Amiga"),
        "c64" => Some("Commodore - 64"),
        "msx" => Some("Microsoft - MSX"),
        "scummvm" => Some("ScummVM"),
        "3do" => Some("The 3DO Company - 3DO"),
        _ => None,
    }
}

const LIBRETRO_BASE: &str = "https://thumbnails.libretro.com";
const RETROPIE_CARBON_BASE: &str = "https://raw.githubusercontent.com/RetroPie/es-theme-carbon/master";

fn url_encode(s: &str) -> String {
    s.chars()
        .flat_map(|c| match c {
            ' ' => "%20".chars().collect::<Vec<_>>(),
            '&' => "%26".chars().collect::<Vec<_>>(),
            '#' => "%23".chars().collect::<Vec<_>>(),
            '\'' => "%27".chars().collect::<Vec<_>>(),
            _ => vec![c],
        })
        .collect()
}

/// Returns the cache directory for downloaded media
pub fn get_cache_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("media_cache")
}

/// Returns the cached path for a game's box art
pub fn cached_box_art_path(app_data_dir: &Path, system_id: &str, rom_stem: &str) -> PathBuf {
    get_cache_dir(app_data_dir)
        .join(system_id)
        .join(format!("{}.png", sanitize_filename(rom_stem)))
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() || " .-_()[]!#&'".contains(c) { c } else { '_' })
        .collect()
}

/// Download box art for a game from Libretro thumbnails, save to cache, return path
pub async fn download_box_art(
    app_data_dir: &Path,
    system_id: &str,
    rom_stem: &str,
) -> Option<String> {
    let Some(system_folder) = libretro_system_folder(system_id) else {
        log::debug!("No Libretro folder mapping for system: {}", system_id);
        return None;
    };

    let cache_path = cached_box_art_path(app_data_dir, system_id, rom_stem);

    // Return cached file if it exists
    if cache_path.exists() {
        return Some(cache_path.to_string_lossy().to_string());
    }

    // Ensure cache directory exists
    if let Some(parent) = cache_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Try Libretro thumbnails CDN
    let url = format!(
        "{}/{}/Named_Boxarts/{}.png",
        LIBRETRO_BASE,
        url_encode(system_folder),
        url_encode(rom_stem)
    );

    log::info!("Downloading box art: {}", url);

    match download_to_file(&url, &cache_path).await {
        Ok(()) => {
            log::info!("Downloaded: {:?}", cache_path);
            Some(cache_path.to_string_lossy().to_string())
        }
        Err(e) => {
            log::debug!("Failed to download {}: {}", url, e);
            // Try title screens as fallback
            let url2 = format!(
                "{}/{}/Named_Titles/{}.png",
                LIBRETRO_BASE,
                url_encode(system_folder),
                url_encode(rom_stem)
            );
            match download_to_file(&url2, &cache_path).await {
                Ok(()) => Some(cache_path.to_string_lossy().to_string()),
                Err(_) => None,
            }
        }
    }
}

async fn download_to_file(url: &str, dest: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("cubi-frontend/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // Validate it's actually an image (PNG/JPG magic bytes)
    if bytes.len() < 8 {
        return Err("Response too small".into());
    }
    let is_png = bytes.starts_with(b"\x89PNG");
    let is_jpg = bytes.starts_with(b"\xff\xd8\xff");
    if !is_png && !is_jpg {
        return Err("Not a valid image".into());
    }

    std::fs::write(dest, &bytes).map_err(|e| e.to_string())
}

/// Download system logo from RetroPie carbon theme on GitHub
pub async fn download_system_logo(
    app_data_dir: &Path,
    system_id: &str,
) -> Option<String> {
    let cache_path = get_cache_dir(app_data_dir)
        .join("systems")
        .join(format!("{}_logo.png", sanitize_filename(system_id)));

    if cache_path.exists() {
        return Some(cache_path.to_string_lossy().to_string());
    }
    if let Some(parent) = cache_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Try RetroPie carbon theme system art
    let url = format!("{}/{}/art/system.png", RETROPIE_CARBON_BASE, system_id);
    log::info!("Downloading system logo: {}", url);

    match download_to_file(&url, &cache_path).await {
        Ok(()) => {
            log::info!("Downloaded system logo: {:?}", cache_path);
            Some(cache_path.to_string_lossy().to_string())
        }
        Err(e) => {
            log::debug!("Failed to download system logo {}: {}", url, e);
            None
        }
    }
}

/// Download screenshot from Libretro thumbnails
pub async fn download_screenshot(
    app_data_dir: &Path,
    system_id: &str,
    rom_stem: &str,
) -> Option<String> {
    let Some(system_folder) = libretro_system_folder(system_id) else { return None };

    let cache_path = get_cache_dir(app_data_dir)
        .join(system_id)
        .join(format!("{}_snap.png", sanitize_filename(rom_stem)));

    if cache_path.exists() {
        return Some(cache_path.to_string_lossy().to_string());
    }
    if let Some(parent) = cache_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let url = format!(
        "{}/{}/Named_Snaps/{}.png",
        LIBRETRO_BASE,
        url_encode(system_folder),
        url_encode(rom_stem)
    );

    match download_to_file(&url, &cache_path).await {
        Ok(()) => Some(cache_path.to_string_lossy().to_string()),
        Err(_) => None,
    }
}
