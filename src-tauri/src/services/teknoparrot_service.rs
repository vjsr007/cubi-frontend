//! TeknoParrot integration.
//!
//! TeknoParrot stores one XML *game profile* per configured game in its
//! `UserProfiles/` directory (next to `TeknoParrotUi.exe`). A profile becomes
//! "playable" once the user points its `<GamePath>` at the installed game
//! executable. Games are launched with:
//!
//! ```text
//! TeknoParrotUi.exe --profile=<ProfileName>.xml --emulator
//! ```
//!
//! Rather than require the user to manually copy profiles into
//! `roms/teknoparrot/`, we discover the configured profiles directly from the
//! TeknoParrot install and surface every *installed* game (one whose
//! `<GamePath>` exists on disk). The profile's bundled icon is used as box art.

use std::path::{Path, PathBuf};
use serde::Deserialize;
use crate::models::GameInfo;

/// A parsed TeknoParrot game profile (only the fields we care about).
struct TpProfile {
    profile_name: String,
    game_name: Option<String>,
    genre: Option<String>,
    game_path: Option<String>,
    icon_name: Option<String>,
}

/// Canonical display metadata from `Metadata/<ProfileName>.json`. TeknoParrot's
/// UI uses these files for game names, genres, icons and platform — they are
/// richer and more reliable than the user profile XML (some profiles omit the
/// name/icon entirely).
#[derive(Debug, Default, Deserialize)]
struct TpMetadata {
    game_name: Option<String>,
    game_genre: Option<String>,
    icon_name: Option<String>,
    platform: Option<String>,
    release_year: Option<String>,
}

/// Load `Metadata/<profile_name>.json` from the TeknoParrot install root.
fn load_metadata(tp_root: Option<&Path>, profile_name: &str) -> TpMetadata {
    let Some(root) = tp_root else { return TpMetadata::default() };
    let path = root.join("Metadata").join(format!("{profile_name}.json"));
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => TpMetadata::default(),
    }
}

/// Resolve the TeknoParrot `UserProfiles` directory.
///
/// Resolution order:
/// 1. From the configured `TeknoParrotUi.exe` path (its parent + `UserProfiles`).
/// 2. From known EmuDeck install locations under `emudeck_path`.
pub fn resolve_userprofiles_dir(exe_path: Option<&str>, emudeck_path: &str) -> Option<PathBuf> {
    // 1. Derive from the configured executable path.
    if let Some(exe) = exe_path.filter(|p| !p.is_empty()) {
        if let Some(dir) = Path::new(exe).parent() {
            let up = dir.join("UserProfiles");
            if up.is_dir() {
                return Some(up);
            }
        }
    }

    // 2. Probe EmuDeck install locations.
    if !emudeck_path.is_empty() {
        for rel in ["TeknoParrot/UserProfiles", "teknoparrot/UserProfiles"] {
            let up = PathBuf::from(emudeck_path)
                .join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
            if up.is_dir() {
                return Some(up);
            }
        }
    }

    None
}

/// Extract the inner text of the first `<tag>…</tag>` occurrence.
fn extract_tag(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = xml.find(&open)? + open.len();
    let end = xml[start..].find(&close)? + start;
    let value = xml[start..end].trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

fn parse_profile(xml: &str, fallback_name: &str) -> TpProfile {
    TpProfile {
        profile_name: extract_tag(xml, "ProfileName").unwrap_or_else(|| fallback_name.to_string()),
        game_name: extract_tag(xml, "GameNameInternal"),
        genre: extract_tag(xml, "GameGenreInternal"),
        game_path: extract_tag(xml, "GamePath"),
        icon_name: extract_tag(xml, "IconName"),
    }
}

/// Discover all *installed* TeknoParrot games as [`GameInfo`] entries.
///
/// A profile is considered installed when its `<GamePath>` is set and points at
/// an existing file. The returned `file_path` is the profile XML inside
/// `UserProfiles/`, so the launcher's `{rom_stem}` expands to the profile name
/// (`--profile=<ProfileName>.xml`).
pub fn scan_profiles(userprofiles_dir: &Path) -> Vec<GameInfo> {
    // TeknoParrot install root holds the `Icons/` directory referenced by profiles.
    let tp_root = userprofiles_dir.parent();
    let mut games = Vec::new();

    let entries = match std::fs::read_dir(userprofiles_dir) {
        Ok(e) => e,
        Err(e) => {
            log::warn!("Cannot read TeknoParrot UserProfiles dir {}: {}", userprofiles_dir.display(), e);
            return games;
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let is_xml = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("xml"))
            .unwrap_or(false);
        if !path.is_file() || !is_xml {
            continue;
        }

        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string();

        let text = match std::fs::read_to_string(&path) {
            Ok(t) => t,
            Err(e) => {
                log::warn!("Cannot read TeknoParrot profile {}: {}", path.display(), e);
                continue;
            }
        };

        let profile = parse_profile(&text, &stem);

        // Only surface configured/installed games (GamePath set and present).
        let game_path = match profile.game_path.as_deref().filter(|p| !p.is_empty()) {
            Some(gp) if Path::new(gp).exists() => gp.to_string(),
            _ => {
                log::debug!("Skipping unconfigured TeknoParrot profile: {}", profile.profile_name);
                continue;
            }
        };

        // Canonical display metadata (richer than the profile XML).
        let meta = load_metadata(tp_root, &profile.profile_name);

        let file_path_str = path.to_string_lossy().to_string();
        let file_name = format!("{}.xml", profile.profile_name);

        let mut hasher = blake3::Hasher::new();
        hasher.update(file_path_str.as_bytes());
        let id = hasher.finalize().to_hex()[..16].to_string();

        // Title: Metadata json → profile XML → prettified profile name.
        let title = meta.game_name.clone()
            .or_else(|| profile.game_name.clone())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| GameInfo::title_from_filename(&file_name));

        let genre = meta.game_genre.clone().or_else(|| profile.genre.clone());
        let year = meta.release_year.clone().filter(|s| !s.is_empty());
        // Surface the arcade board (e.g. "SEGA RingWide") as the developer field.
        let developer = meta.platform.clone().filter(|s| !s.is_empty());

        // Box art: resolve the icon name (Metadata → profile XML → "<Profile>.png")
        // against the install's Icons/ directory.
        let box_art = tp_root.and_then(|root| {
            let candidates = [
                meta.icon_name.clone(),
                profile.icon_name.clone(),
                Some(format!("{}.png", profile.profile_name)),
            ];
            candidates.into_iter().flatten().find_map(|icon| {
                // Icon names may be bare ("MB.png") or prefixed ("Icons/MB.png").
                let rel = icon.replace('/', std::path::MAIN_SEPARATOR_STR);
                let p = if rel.to_ascii_lowercase().starts_with("icons") {
                    root.join(&rel)
                } else {
                    root.join("Icons").join(&rel)
                };
                if p.exists() { Some(p.to_string_lossy().to_string()) } else { None }
            })
        });

        let file_size = std::fs::metadata(&game_path).map(|m| m.len()).unwrap_or(0);

        games.push(GameInfo {
            id,
            system_id: "teknoparrot".to_string(),
            title,
            file_path: file_path_str,
            file_name,
            file_size,
            box_art,
            developer,
            year,
            genre,
            players: 1,
            ..Default::default()
        });
    }

    games.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    games
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"<?xml version="1.0" encoding="utf-8"?>
<GameProfile>
  <ProfileName>BladeStrangers</ProfileName>
  <GameNameInternal>Blade Strangers</GameNameInternal>
  <GameGenreInternal>Fighting</GameGenreInternal>
  <GamePath>D:\Games\Blade Strangers\himekaku.exe</GamePath>
  <IconName>Icons/BladeStrangers.png</IconName>
</GameProfile>"#;

    #[test]
    fn parses_core_fields() {
        let p = parse_profile(SAMPLE, "fallback");
        assert_eq!(p.profile_name, "BladeStrangers");
        assert_eq!(p.game_name.as_deref(), Some("Blade Strangers"));
        assert_eq!(p.genre.as_deref(), Some("Fighting"));
        assert_eq!(p.game_path.as_deref(), Some(r"D:\Games\Blade Strangers\himekaku.exe"));
        assert_eq!(p.icon_name.as_deref(), Some("Icons/BladeStrangers.png"));
    }

    #[test]
    fn empty_tags_become_none() {
        let xml = "<GameProfile><ProfileName>X</ProfileName><GamePath></GamePath></GameProfile>";
        let p = parse_profile(xml, "fallback");
        assert_eq!(p.profile_name, "X");
        assert_eq!(p.game_path, None);
        assert_eq!(p.game_name, None);
    }

    #[test]
    fn missing_profile_name_uses_fallback() {
        let xml = "<GameProfile><GameNameInternal>Y</GameNameInternal></GameProfile>";
        let p = parse_profile(xml, "fallback");
        assert_eq!(p.profile_name, "fallback");
    }

    #[test]
    fn metadata_json_deserializes() {
        let json = r#"{
            "game_name": "Melty Blood: Actress Again - Current Code",
            "game_genre": "Fighting",
            "icon_name": "MB.png",
            "platform": "SEGA RingWide",
            "release_year": "2010"
        }"#;
        let m: TpMetadata = serde_json::from_str(json).unwrap();
        assert_eq!(m.game_name.as_deref(), Some("Melty Blood: Actress Again - Current Code"));
        assert_eq!(m.game_genre.as_deref(), Some("Fighting"));
        assert_eq!(m.platform.as_deref(), Some("SEGA RingWide"));
        assert_eq!(m.release_year.as_deref(), Some("2010"));
    }
}
