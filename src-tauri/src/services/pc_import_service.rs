use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use super::steamgriddb;

/// A game discovered from a PC library (Steam, Epic, EA, GOG) or added manually.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcImportGame {
    pub title: String,
    /// Exe path or protocol URL (steam://rungameid/…, com.epicgames.launcher://…)
    pub file_path: String,
    pub file_size: u64,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    /// "steam" | "epic" | "ea" | "gog" | "manual"
    pub source: String,
    /// Steam appid, Epic AppName, GOG game id, etc.
    pub source_id: String,
    pub install_path: Option<String>,
    pub box_art: Option<String>,
}

/// Detected PC library status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcLibraryStatus {
    pub steam_found: bool,
    pub steam_path: Option<String>,
    pub epic_found: bool,
    pub ea_found: bool,
    pub gog_found: bool,
}

// ── Steam ─────────────────────────────────────────────────────────────

#[cfg(windows)]
fn find_steam_path() -> Option<PathBuf> {
    use winreg::{enums::*, RegKey};
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam") {
        if let Ok(path) = key.get_value::<String, _>("InstallPath") {
            let p = PathBuf::from(path);
            if p.exists() {
                return Some(p);
            }
        }
    }
    for default in &["C:\\Program Files (x86)\\Steam", "C:\\Program Files\\Steam"] {
        let p = PathBuf::from(default);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

#[cfg(not(windows))]
fn find_steam_path() -> Option<PathBuf> {
    None
}

fn get_steam_library_paths(steam_root: &Path) -> Vec<PathBuf> {
    let mut paths = vec![steam_root.to_path_buf()];
    let vdf = steam_root.join("steamapps").join("libraryfolders.vdf");
    if let Ok(content) = std::fs::read_to_string(&vdf) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.to_lowercase().starts_with("\"path\"") {
                if let Some(val) = extract_kv_value(trimmed) {
                    let p = PathBuf::from(val.replace("\\\\", "\\"));
                    if p.exists() && !paths.contains(&p) {
                        paths.push(p);
                    }
                }
            }
        }
    }
    paths
}

fn extract_kv_value(line: &str) -> Option<String> {
    // Format: "key"  "value"
    let parts: Vec<&str> = line.split('"').collect();
    // ["", "key", "\t\t", "value", ""]
    if parts.len() >= 4 && !parts[3].is_empty() {
        return Some(parts[3].to_string());
    }
    None
}

fn find_acf_value(content: &str, key: &str) -> Option<String> {
    let search = format!("\"{}\"", key.to_lowercase());
    for line in content.lines() {
        if line.trim().to_lowercase().starts_with(&search) {
            if let Some(val) = extract_kv_value(line.trim()) {
                return Some(val);
            }
        }
    }
    None
}

fn parse_steam_manifest(path: &Path) -> Option<PcImportGame> {
    let content = std::fs::read_to_string(path).ok()?;
    let appid = find_acf_value(&content, "appid")?;
    let name = find_acf_value(&content, "name")?;
    let installdir = find_acf_value(&content, "installdir");
    let size: u64 = find_acf_value(&content, "sizeondi")
        .or_else(|| find_acf_value(&content, "SizeOnDisk"))
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    // Skip known utility / redistributable appids
    const SKIP: &[&str] = &[
        "228980", "1070560", "1391110", "1628350", "250820",
        "1493710", "2180100",
    ];
    if SKIP.contains(&appid.as_str()) {
        return None;
    }

    let file_path = format!("steam://rungameid/{}", appid);
    let install_path = path.parent().and_then(|p| {
        installdir.as_ref().map(|dir| {
            p.join("common").join(dir).to_string_lossy().to_string()
        })
    });

    Some(PcImportGame {
        title: name,
        file_path,
        file_size: size,
        developer: None,
        publisher: None,
        source: "steam".to_string(),
        source_id: appid,
        install_path,
        box_art: None,
    })
}

pub async fn import_steam(sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    let mut games = Vec::new();
    let steam_path = match find_steam_path() {
        Some(p) => p,
        None => return games,
    };

    for lib in get_steam_library_paths(&steam_path) {
        let steamapps = lib.join("steamapps");
        let entries = match std::fs::read_dir(&steamapps) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
            if name.starts_with("appmanifest_")
                && path.extension().and_then(|e| e.to_str()) == Some("acf")
            {
                if let Some(game) = parse_steam_manifest(&path) {
                    games.push(game);
                }
            }
        }
    }

    games.sort_by(|a, b| a.title.cmp(&b.title));

    // Always set Steam CDN covers — no API key required
    for game in &mut games {
        game.box_art = Some(steamgriddb::steam_cover_url(&game.source_id));
    }

    // If a SteamGridDB API key is available, override Steam CDN with curated covers
    if let Some(key) = sgdb_key {
        let key_str = key.to_string();
        let futures: Vec<_> = games
            .iter()
            .map(|g| {
                let appid = g.source_id.clone();
                let k = key_str.clone();
                async move { steamgriddb::fetch_grid_by_steam_appid(&appid, &k).await }
            })
            .collect();
        let art_urls = futures::future::join_all(futures).await;
        for (game, url) in games.iter_mut().zip(art_urls) {
            if let Some(u) = url {
                game.box_art = Some(u);
            }
        }
    }

    games
}

// ── Epic Games ────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[allow(non_snake_case, dead_code)]
struct EpicManifest {
    DisplayName: Option<String>,
    InstallLocation: Option<String>,
    LaunchExecutable: Option<String>,
    CatalogNamespace: Option<String>,
    CatalogItemId: Option<String>,
    AppName: Option<String>,
    bIsApplication: Option<bool>,
    InstallSize: Option<i64>,
}

fn parse_epic_manifest(path: &Path) -> Option<PcImportGame> {
    let content = std::fs::read_to_string(path).ok()?;
    let m: EpicManifest = serde_json::from_str(&content).ok()?;

    // Skip if explicitly marked as not a launchable application
    if m.bIsApplication == Some(false) {
        return None;
    }

    let title = m.DisplayName?;
    let app_name = m.AppName?;
    let install_location = m.InstallLocation.unwrap_or_default();

    let file_path = if let Some(exe_rel) = m.LaunchExecutable {
        let exe_full = PathBuf::from(&install_location).join(&exe_rel);
        if exe_full.exists() {
            exe_full.to_string_lossy().to_string()
        } else {
            format!(
                "com.epicgames.launcher://apps/{}?action=launch",
                app_name
            )
        }
    } else {
        format!(
            "com.epicgames.launcher://apps/{}?action=launch",
            app_name
        )
    };

    Some(PcImportGame {
        title,
        file_path,
        file_size: m.InstallSize.unwrap_or(0) as u64,
        developer: None,
        publisher: None,
        source: "epic".to_string(),
        source_id: app_name,
        install_path: if install_location.is_empty() { None } else { Some(install_location) },
        box_art: None,
    })
}

pub async fn import_epic(sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    let mut games = Vec::new();
    let manifests = PathBuf::from(
        r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests",
    );
    if !manifests.exists() {
        return games;
    }
    let entries = match std::fs::read_dir(&manifests) {
        Ok(e) => e,
        Err(_) => return games,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("item") {
            if let Some(game) = parse_epic_manifest(&path) {
                games.push(game);
            }
        }
    }
    games.sort_by(|a, b| a.title.cmp(&b.title));

    // Fetch SteamGridDB covers when API key is configured
    if let Some(key) = sgdb_key {
        let key_str = key.to_string();
        let futures: Vec<_> = games
            .iter()
            .map(|g| {
                let title = g.title.clone();
                let k = key_str.clone();
                async move { steamgriddb::fetch_grid_by_name(&title, &k).await }
            })
            .collect();
        let art_urls = futures::future::join_all(futures).await;
        for (game, url) in games.iter_mut().zip(art_urls) {
            if let Some(u) = url {
                game.box_art = Some(u);
            }
        }
    }

    games
}

// ── EA App ────────────────────────────────────────────────────────────

#[cfg(windows)]
pub async fn import_ea(sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    let mut games = Vec::new();

    // Method 1: EA Desktop InstallData folder
    let ea_data = PathBuf::from(r"C:\ProgramData\EA Desktop\InstallData");
    if ea_data.exists() {
        if let Ok(entries) = std::fs::read_dir(&ea_data) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(game) = parse_ea_game_dir(&path) {
                        games.push(game);
                    }
                }
            }
        }
    }

    // Method 2: Registry fallback
    if games.is_empty() {
        games.extend(import_ea_registry());
    }

    games.sort_by(|a, b| a.title.cmp(&b.title));

    // Fetch SteamGridDB covers when API key is configured
    if let Some(key) = sgdb_key {
        let key_str = key.to_string();
        let futures: Vec<_> = games
            .iter()
            .map(|g| {
                let title = g.title.clone();
                let k = key_str.clone();
                async move { steamgriddb::fetch_grid_by_name(&title, &k).await }
            })
            .collect();
        let art_urls = futures::future::join_all(futures).await;
        for (game, url) in games.iter_mut().zip(art_urls) {
            if let Some(u) = url {
                game.box_art = Some(u);
            }
        }
    }

    games
}

#[cfg(windows)]
fn parse_ea_game_dir(dir: &Path) -> Option<PcImportGame> {
    let xml_path = dir.join("__Installer").join("installerdata.xml");
    if !xml_path.exists() {
        return None;
    }
    let content = std::fs::read_to_string(&xml_path).ok()?;
    let title = extract_xml_text(&content, "gameTitle")
        .or_else(|| extract_xml_text(&content, "DiPTitle"))?;
    let install_path = extract_xml_text(&content, "baseInstallPath");
    let source_id = dir.file_name()?.to_str()?.to_string();

    let file_path = install_path
        .as_deref()
        .and_then(find_main_exe)
        .unwrap_or_else(|| format!("eadm://launch/{}", source_id));

    Some(PcImportGame {
        title,
        file_path,
        file_size: 0,
        developer: Some("Electronic Arts".to_string()),
        publisher: Some("Electronic Arts".to_string()),
        source: "ea".to_string(),
        source_id,
        install_path,
        box_art: None,
    })
}

#[cfg(windows)]
fn import_ea_registry() -> Vec<PcImportGame> {
    use winreg::{enums::*, RegKey};
    let mut games = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for reg_path in &[
        "SOFTWARE\\WOW6432Node\\Electronic Arts",
        "SOFTWARE\\Electronic Arts",
    ] {
        if let Ok(ea_key) = hklm.open_subkey(reg_path) {
            for game_name in ea_key.enum_keys().flatten() {
                if let Ok(gk) = ea_key.open_subkey(&game_name) {
                    let install_dir: Option<String> = gk.get_value("Install Dir").ok();
                    if let Some(ref dir) = install_dir {
                        let file_path = find_main_exe(dir)
                            .unwrap_or_else(|| format!("eadm://launch/{}", game_name));
                        games.push(PcImportGame {
                            title: game_name.clone(),
                            file_path,
                            file_size: 0,
                            developer: Some("Electronic Arts".to_string()),
                            publisher: Some("Electronic Arts".to_string()),
                            source: "ea".to_string(),
                            source_id: game_name,
                            install_path: install_dir,
                            box_art: None,
                        });
                    }
                }
            }
        }
    }
    games
}

#[cfg(not(windows))]
pub async fn import_ea(_sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    vec![]
}

// ── GOG Galaxy ────────────────────────────────────────────────────────

#[cfg(windows)]
pub async fn import_gog(sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    use winreg::{enums::*, RegKey};
    let mut games = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    for reg_path in &[
        "SOFTWARE\\WOW6432Node\\GOG.com\\Games",
        "SOFTWARE\\GOG.com\\Games",
    ] {
        if let Ok(gog_key) = hklm.open_subkey(reg_path) {
            for game_id in gog_key.enum_keys().flatten() {
                if let Ok(gk) = gog_key.open_subkey(&game_id) {
                    let game_name: Option<String> = gk
                        .get_value("GAMENAME")
                        .or_else(|_| gk.get_value("gameName"))
                        .ok();
                    let exe: Option<String> = gk
                        .get_value("EXE")
                        .or_else(|_| gk.get_value("exe"))
                        .or_else(|_| gk.get_value("exeFile"))
                        .ok();
                    let install_path: Option<String> = gk
                        .get_value("PATH")
                        .or_else(|_| gk.get_value("path"))
                        .ok();

                    if let (Some(title), Some(exe_path)) = (game_name, exe) {
                        let file_path = if Path::new(&exe_path).is_absolute() {
                            exe_path.clone()
                        } else if let Some(ref base) = install_path {
                            PathBuf::from(base)
                                .join(&exe_path)
                                .to_string_lossy()
                                .to_string()
                        } else {
                            exe_path.clone()
                        };

                        games.push(PcImportGame {
                            title,
                            file_path,
                            file_size: 0,
                            developer: None,
                            publisher: None,
                            source: "gog".to_string(),
                            source_id: game_id,
                            install_path,
                            box_art: None,
                        });
                    }
                }
            }
        }
    }
    games.sort_by(|a, b| a.title.cmp(&b.title));

    // Fetch SteamGridDB covers when API key is configured
    if let Some(key) = sgdb_key {
        let key_str = key.to_string();
        let futures: Vec<_> = games
            .iter()
            .map(|g| {
                let title = g.title.clone();
                let k = key_str.clone();
                async move { steamgriddb::fetch_grid_by_name(&title, &k).await }
            })
            .collect();
        let art_urls = futures::future::join_all(futures).await;
        for (game, url) in games.iter_mut().zip(art_urls) {
            if let Some(u) = url {
                game.box_art = Some(u);
            }
        }
    }

    games
}

#[cfg(not(windows))]
pub async fn import_gog(_sgdb_key: Option<&str>) -> Vec<PcImportGame> {
    vec![]
}

// ── Helpers ───────────────────────────────────────────────────────────

/// Find the main .exe in an install directory (ignores uninstallers/setup/etc.)
pub fn find_main_exe<P: AsRef<Path>>(dir: P) -> Option<String> {
    let dir = dir.as_ref();
    if !dir.exists() {
        return None;
    }
    let entries = std::fs::read_dir(dir).ok()?;
    let mut exes: Vec<PathBuf> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("exe"))
        .filter(|p| {
            let name = p
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_lowercase();
            !name.contains("unins")
                && !name.contains("setup")
                && !name.contains("redist")
                && !name.contains("install")
                && !name.contains("crash")
                && !name.contains("update")
        })
        .collect();

    // Pick largest (most likely the game binary)
    exes.sort_by_key(|p| std::fs::metadata(p).map(|m| m.len()).unwrap_or(0));
    exes.last().map(|p| p.to_string_lossy().to_string())
}

fn extract_xml_text(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{}", tag);
    let close = format!("</{}>", tag);
    let start = xml.find(&open)?;
    let gt = xml[start..].find('>')?;
    let content_start = start + gt + 1;
    let end = xml[content_start..].find(&close)?;
    let text = xml[content_start..content_start + end].trim();
    if text.is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

// ── Detection ─────────────────────────────────────────────────────────

pub fn detect_pc_libraries() -> PcLibraryStatus {
    let steam_path = find_steam_path();
    let steam_found = steam_path.is_some();
    let steam_path_str = steam_path.map(|p| p.to_string_lossy().to_string());

    let epic_found = PathBuf::from(
        r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests",
    )
    .exists();

    let ea_found = PathBuf::from(r"C:\ProgramData\EA Desktop").exists()
        || check_ea_registry();

    let gog_found = check_gog_registry();

    PcLibraryStatus {
        steam_found,
        steam_path: steam_path_str,
        epic_found,
        ea_found,
        gog_found,
    }
}

#[cfg(windows)]
fn check_ea_registry() -> bool {
    use winreg::{enums::*, RegKey};
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    hklm.open_subkey("SOFTWARE\\WOW6432Node\\Electronic Arts").is_ok()
        || hklm.open_subkey("SOFTWARE\\Electronic Arts").is_ok()
}

#[cfg(not(windows))]
fn check_ea_registry() -> bool {
    false
}

#[cfg(windows)]
fn check_gog_registry() -> bool {
    use winreg::{enums::*, RegKey};
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    hklm.open_subkey("SOFTWARE\\WOW6432Node\\GOG.com\\Games").is_ok()
        || hklm.open_subkey("SOFTWARE\\GOG.com\\Games").is_ok()
}

#[cfg(not(windows))]
fn check_gog_registry() -> bool {
    false
}
