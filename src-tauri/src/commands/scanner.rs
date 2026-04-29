use tauri::{AppHandle, Emitter, State};
use walkdir::WalkDir;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo, ScanProgress, ScanResult};
use crate::models::system::get_system_registry;
use crate::services::{gamelist_service, ps3_service};

#[tauri::command]
pub async fn scan_library(
    app: AppHandle,
    db: State<'_, Database>,
    data_root: String,
) -> Result<ScanResult, String> {
    let roms_path = std::path::PathBuf::from(&data_root).join("roms");
    if !roms_path.exists() {
        return Err(format!(
            "ROMs directory not found: {}. Make sure your data root contains a 'roms' subfolder.",
            roms_path.display()
        ));
    }

    let registry = get_system_registry();
    let mut systems_found = 0u32;
    let mut games_found = 0u32;
    let mut errors: Vec<String> = Vec::new();

    let entries: Vec<_> = std::fs::read_dir(&roms_path)
        .map_err(|e| format!("Cannot read roms directory: {}", e))?
        .flatten()
        .filter(|e| e.path().is_dir())
        .collect();

    for entry in entries {
        let path = entry.path();
        let folder_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        let system_def = match registry.iter().find(|def| {
            def.folder_names.iter().any(|n| *n == folder_name.as_str())
        }) {
            Some(d) => d,
            None => {
                log::debug!("Skipping unknown system folder: {}", folder_name);
                continue;
            }
        };

        let _ = app.emit(
            "scan-progress",
            ScanProgress {
                total: 0,
                current: systems_found,
                current_system: system_def.full_name.to_string(),
                status: format!("Scanning {}...", system_def.full_name),
            },
        );

        let extensions: Vec<String> = system_def
            .extensions
            .iter()
            .map(|e| e.to_lowercase())
            .collect();

        // Parse gamelist.xml if it exists (provides description, genre, etc.)
        let gamelist_path = path.join("gamelist.xml");
        let gamelist = if gamelist_path.exists() {
            log::info!("Parsing gamelist.xml for {}", system_def.name);
            gamelist_service::parse_gamelist(&gamelist_path)
        } else {
            std::collections::HashMap::new()
        };

        let mut games: Vec<GameInfo> = Vec::new();

        for file_entry in WalkDir::new(&path)
            .max_depth(4)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let fpath = file_entry.path();
            if !fpath.is_file() {
                continue;
            }
            let ext = fpath
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| e.to_lowercase())
                .unwrap_or_default();
            if !extensions.contains(&ext) {
                continue;
            }

            let file_name = fpath
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            let file_path_str = fpath.to_string_lossy().to_string();
            let file_size = fpath.metadata().map(|m| m.len()).unwrap_or(0);

            let mut hasher = blake3::Hasher::new();
            hasher.update(file_path_str.as_bytes());
            let id = hasher.finalize().to_hex()[..16].to_string();

            let box_art = find_box_art(&path, &file_name);

            // Try to enrich from gamelist.xml metadata
            let meta = gamelist.get(&file_name);

            // For PS3: derive title from PARAM.SFO or game directory name
            let ps3_title = if system_def.id == "ps3"
                && file_name.to_ascii_uppercase() == "EBOOT.BIN"
            {
                ps3_service::title_from_eboot(fpath)
                    .or_else(|| {
                        // Fall back to the direct game subdirectory name under the system path
                        ps3_game_dir(fpath, &path)
                            .map(|d| ps3_service::title_from_game_dir(d))
                    })
            } else {
                None
            };

            let title = meta
                .and_then(|m| m.name.clone())
                .or(ps3_title)
                .unwrap_or_else(|| GameInfo::title_from_filename(&file_name));

            let description = meta.and_then(|m| m.desc.clone());
            let developer = meta.and_then(|m| m.developer.clone());
            let publisher = meta.and_then(|m| m.publisher.clone());
            let genre = meta.and_then(|m| m.genre.clone());
            let year = meta
                .and_then(|m| m.releasedate.as_deref())
                .and_then(gamelist_service::extract_year);
            let players = meta
                .and_then(|m| m.players.as_deref())
                .map(gamelist_service::parse_players)
                .unwrap_or(1);
            let rating = meta
                .and_then(|m| m.rating.as_deref())
                .map(gamelist_service::parse_rating)
                .unwrap_or(0.0);
            let play_count = meta
                .and_then(|m| m.play_count.as_deref())
                .and_then(|s| s.parse::<u32>().ok())
                .unwrap_or(0);
            let last_played = meta.and_then(|m| m.last_played.clone());
            // Resolve <manual> path relative to the system ROM directory
            let manual = meta.and_then(|m| m.manual.as_deref()).map(|mp| {
                let p = std::path::Path::new(mp);
                if p.is_absolute() { mp.to_string() }
                else { path.join(mp.trim_start_matches("./")).to_string_lossy().to_string() }
            });

            games.push(GameInfo {
                id,
                system_id: system_def.id.to_string(),
                title,
                file_path: file_path_str,
                file_name,
                file_size,
                box_art,
                description,
                developer,
                publisher,
                year,
                genre,
                players,
                rating,
                last_played,
                play_count,
                favorite: false,
                manual,
                ..Default::default()
            });
        }

        if games.is_empty() {
            continue;
        }

        let game_count = games.len() as u32;
        let system = SystemInfo {
            id: system_def.id.to_string(),
            name: system_def.name.to_string(),
            full_name: system_def.full_name.to_string(),
            extensions: system_def.extensions.iter().map(|e| e.to_string()).collect(),
            game_count,
            rom_path: path.to_string_lossy().to_string(),
            icon: None,
        };

        if let Err(e) = db.upsert_system(&system) {
            errors.push(format!("DB error for {}: {}", system_def.name, e));
            continue;
        }
        for game in &games {
            if let Err(e) = db.upsert_game(game) {
                errors.push(format!("DB error for game '{}': {}", game.title, e));
            }
        }

        systems_found += 1;
        games_found += game_count;
    }

    let result = ScanResult {
        systems_found,
        games_found,
        errors: errors.clone(),
    };
    let _ = app.emit("scan-complete", &result);

    Ok(result)
}

/// Scan (or re-scan) a single system by its ID.
/// Resolves the ROM folder from: custom path override → default {data_root}/roms/{folder}.
#[tauri::command]
pub async fn scan_system(
    app: AppHandle,
    db: State<'_, Database>,
    data_root: String,
    system_id: String,
) -> Result<ScanResult, String> {
    let registry = get_system_registry();
    let system_def = registry
        .iter()
        .find(|d| d.id == system_id)
        .ok_or_else(|| format!("Unknown system: {}", system_id))?;

    // Resolve path: check for a per-system custom path override first
    let overrides = db.get_rom_path_overrides().map_err(|e| e.to_string())?;
    let path = if let Some(custom) = overrides.get(system_def.id).filter(|p| !p.is_empty()) {
        std::path::PathBuf::from(custom)
    } else {
        // Try each known folder name under {data_root}/roms/
        let roms_root = std::path::PathBuf::from(&data_root).join("roms");
        system_def
            .folder_names
            .iter()
            .map(|f| roms_root.join(f))
            .find(|p| p.is_dir())
            .ok_or_else(|| {
                format!(
                    "ROM folder not found for {}. Looked in: {}",
                    system_def.full_name,
                    system_def
                        .folder_names
                        .iter()
                        .map(|f| roms_root.join(f).to_string_lossy().to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })?
    };

    if !path.is_dir() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            total: 0,
            current: 0,
            current_system: system_def.full_name.to_string(),
            status: format!("Scanning {}...", system_def.full_name),
        },
    );

    let extensions: Vec<String> = system_def.extensions.iter().map(|e| e.to_lowercase()).collect();

    let gamelist_path = path.join("gamelist.xml");
    let gamelist = if gamelist_path.exists() {
        log::info!("Parsing gamelist.xml for {}", system_def.name);
        gamelist_service::parse_gamelist(&gamelist_path)
    } else {
        std::collections::HashMap::new()
    };

    let mut games: Vec<GameInfo> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    for file_entry in WalkDir::new(&path).max_depth(4).into_iter().filter_map(|e| e.ok()) {
        let fpath = file_entry.path();
        if !fpath.is_file() {
            continue;
        }
        let ext = fpath.extension().and_then(|e| e.to_str()).map(|e| e.to_lowercase()).unwrap_or_default();
        if !extensions.contains(&ext) {
            continue;
        }

        let file_name = fpath.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let file_path_str = fpath.to_string_lossy().to_string();
        let file_size = fpath.metadata().map(|m| m.len()).unwrap_or(0);

        let mut hasher = blake3::Hasher::new();
        hasher.update(file_path_str.as_bytes());
        let id = hasher.finalize().to_hex()[..16].to_string();

        let box_art = find_box_art(&path, &file_name);
        let meta = gamelist.get(&file_name);

        // For PS3: derive title from PARAM.SFO or game directory name
        let ps3_title = if system_def.id == "ps3"
            && file_name.to_ascii_uppercase() == "EBOOT.BIN"
        {
            ps3_service::title_from_eboot(fpath)
                .or_else(|| {
                    ps3_game_dir(fpath, &path)
                        .map(|d| ps3_service::title_from_game_dir(d))
                })
        } else {
            None
        };

        let title = meta.and_then(|m| m.name.clone()).or(ps3_title).unwrap_or_else(|| GameInfo::title_from_filename(&file_name));
        let description = meta.and_then(|m| m.desc.clone());
        let developer = meta.and_then(|m| m.developer.clone());
        let publisher = meta.and_then(|m| m.publisher.clone());
        let genre = meta.and_then(|m| m.genre.clone());
        let year = meta.and_then(|m| m.releasedate.as_deref()).and_then(gamelist_service::extract_year);
        let players = meta.and_then(|m| m.players.as_deref()).map(gamelist_service::parse_players).unwrap_or(1);
        let rating = meta.and_then(|m| m.rating.as_deref()).map(gamelist_service::parse_rating).unwrap_or(0.0);
        let play_count = meta.and_then(|m| m.play_count.as_deref()).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
        let last_played = meta.and_then(|m| m.last_played.clone());
        let manual = meta.and_then(|m| m.manual.as_deref()).map(|mp| {
            let p = std::path::Path::new(mp);
            if p.is_absolute() { mp.to_string() }
            else { path.join(mp.trim_start_matches("./")).to_string_lossy().to_string() }
        });

        games.push(GameInfo {
            id,
            system_id: system_def.id.to_string(),
            title,
            file_path: file_path_str,
            file_name,
            file_size,
            box_art,
            description,
            developer,
            publisher,
            year,
            genre,
            players,
            rating,
            last_played,
            play_count,
            favorite: false,
            manual,
            ..Default::default()
        });
    }

    let game_count = games.len() as u32;

    if game_count > 0 {
        let system = SystemInfo {
            id: system_def.id.to_string(),
            name: system_def.name.to_string(),
            full_name: system_def.full_name.to_string(),
            extensions: system_def.extensions.iter().map(|e| e.to_string()).collect(),
            game_count,
            rom_path: path.to_string_lossy().to_string(),
            icon: None,
        };
        if let Err(e) = db.upsert_system(&system) {
            errors.push(format!("DB error for {}: {}", system_def.name, e));
        }
        for game in &games {
            if let Err(e) = db.upsert_game(game) {
                errors.push(format!("DB error for game '{}': {}", game.title, e));
            }
        }
    }

    let result = ScanResult {
        systems_found: if game_count > 0 { 1 } else { 0 },
        games_found: game_count,
        errors: errors.clone(),
    };
    let _ = app.emit("scan-complete", &result);

    Ok(result)
}

fn find_box_art(system_folder: &std::path::Path, file_name: &str) -> Option<String> {
    let stem = std::path::Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())?;
    let img_dir = system_folder.join("downloaded_images");
    for ext in ["png", "jpg", "jpeg", "webp"] {
        let p = img_dir.join(format!("{}.{}", stem, ext));
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

/// Walk up from `file_path` and return the first ancestor directory that is a
/// direct child of `system_path`. This is the "game root" for directory-based
/// systems like PS3 (e.g. `roms/ps3/GameTitle.ps3/` or `roms/ps3/BLUS30001/`).
fn ps3_game_dir<'a>(file_path: &'a std::path::Path, system_path: &std::path::Path) -> Option<&'a std::path::Path> {
    let mut current = file_path.parent()?;
    loop {
        if let Some(parent) = current.parent() {
            if parent == system_path {
                return Some(current);
            }
            current = parent;
        } else {
            return None;
        }
    }
}
