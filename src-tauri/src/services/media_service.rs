use std::path::{Path, PathBuf};
use crate::models::media::{GameMedia, SystemMedia};

/// Map our short system IDs to storage/downloaded_media/ folder names (ScreenScraper convention)
pub fn system_to_media_folder(system_id: &str) -> Option<&'static str> {
    match system_id {
        "nes" => Some("Nintendo - Nintendo Entertainment System"),
        "snes" => Some("Nintendo - Super Nintendo"),
        "n64" => Some("Nintendo - Nintendo 64"),
        "gb" => Some("Nintendo - Game Boy"),
        "gbc" => Some("Nintendo - Game Boy Color"),
        "gba" => Some("Nintendo - Game Boy Advance"),
        "nds" => Some("Nintendo - DS"),
        "3ds" => Some("Nintendo - 3DS"),
        "gc" => Some("Nintendo - GameCube"),
        "wii" => Some("Nintendo - Wii"),
        "wiiu" => Some("Nintendo - Wii U"),
        "switch" => Some("Nintendo - Switch"),
        "megadrive" | "genesis" => Some("Sega - Mega Drive - Genesis"),
        "mastersystem" => Some("Sega - Master System - Mark III"),
        "gamegear" => Some("Sega - Game Gear"),
        "saturn" => Some("Sega - Saturn"),
        "dreamcast" => Some("Sega - Dreamcast"),
        "psx" => Some("Sony - PlayStation"),
        "ps2" => Some("Sony - PlayStation 2"),
        "ps3" => Some("Sony - PlayStation 3"),
        "psp" => Some("Sony - PlayStation Portable"),
        "psvita" => Some("Sony - PlayStation Vita"),
        "ps4" => Some("Sony - PlayStation 4"),
        "atari2600" => Some("Atari - 2600"),
        "atari5200" => Some("Atari - 5200"),
        "atari7800" => Some("Atari - 7800"),
        "pcengine" => Some("NEC - PC Engine - TurboGrafx-16"),
        "neogeo" => Some("SNK - Neo Geo"),
        "ngpc" => Some("SNK - Neo Geo Pocket Color"),
        "mame" => Some("MAME"),
        "fbneo" => Some("FinalBurn Neo"),
        "xbox" => Some("Microsoft - Xbox"),
        "xbox360" => Some("Microsoft - Xbox 360"),
        "sg1000" => Some("Sega - SG-1000"),
        "colecovision" => Some("Coleco - ColecoVision"),
        "intellivision" => Some("Mattel - Intellivision"),
        "wswan" => Some("Bandai - WonderSwan"),
        "wswanc" => Some("Bandai - WonderSwan Color"),
        "arcade" => Some("MAME"),
        _ => None,
    }
}

fn find_file(dir: &Path, stem: &str, extensions: &[&str]) -> Option<String> {
    for ext in extensions {
        let p = dir.join(format!("{}.{}", stem, ext));
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

fn find_any_file(dir: &Path, extensions: &[&str]) -> Option<String> {
    let Ok(entries) = std::fs::read_dir(dir) else { return None };
    for entry in entries.flatten() {
        let p = entry.path();
        if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
            if extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }
    None
}

const IMG_EXTS: &[&str] = &["png", "jpg", "jpeg", "webp"];
const VID_EXTS: &[&str] = &["mp4", "avi", "mkv"];

pub fn resolve_game_media(
    data_root: &str,
    system_id: &str,
    file_name: &str,
) -> GameMedia {
    let root = Path::new(data_root);
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name);

    let media_base: Option<PathBuf> = system_to_media_folder(system_id).map(|folder| {
        root.join("storage").join("downloaded_media").join(folder)
    });

    let lookup = |subfolder: &str, exts: &[&str]| -> Option<String> {
        media_base.as_ref().and_then(|base| {
            find_file(&base.join(subfolder), stem, exts)
        })
    };

    // Box art: try storage/downloaded_media first, then roms/*/downloaded_images
    let box_art = lookup("box2dfront", IMG_EXTS).or_else(|| {
        find_file(
            &root.join("roms").join(system_id).join("downloaded_images"),
            stem,
            IMG_EXTS,
        )
    });

    GameMedia {
        box_art,
        back_cover: lookup("box2dback", IMG_EXTS),
        screenshot: lookup("ss", IMG_EXTS),
        title_screen: lookup("sstitle", IMG_EXTS),
        fan_art: lookup("fanart", IMG_EXTS),
        wheel: lookup("wheel", IMG_EXTS),
        marquee: lookup("marquee", IMG_EXTS),
        mix_image: lookup("mixrbv2", IMG_EXTS),
        video: lookup("video", VID_EXTS),
    }
}

pub fn resolve_system_media(data_root: &str, system_id: &str) -> SystemMedia {
    let Some(folder) = system_to_media_folder(system_id) else {
        return SystemMedia::default();
    };
    let base = Path::new(data_root)
        .join("storage")
        .join("downloaded_media")
        .join(folder);

    SystemMedia {
        fan_art: find_any_file(&base.join("fanart"), IMG_EXTS),
        wheel: find_any_file(&base.join("wheel"), IMG_EXTS),
        marquee: find_any_file(&base.join("marquee"), IMG_EXTS),
    }
}
