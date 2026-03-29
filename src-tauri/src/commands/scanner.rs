use tauri::{AppHandle, Emitter, State};
use walkdir::WalkDir;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo, ScanProgress, ScanResult};
use crate::models::system::get_system_registry;
use crate::services::gamelist_service;

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

    // Load per-system ROM path overrides from the database
    let rom_overrides = db
        .get_rom_path_overrides()
        .unwrap_or_default();

    // Track which systems have already been scanned (via override)
    let mut scanned_system_ids = std::collections::HashSet::new();

    // ── Phase 1: Scan systems with custom ROM path overrides ──────────
    for system_def in &registry {
        if let Some(custom_path) = rom_overrides.get(system_def.id) {
            let path = std::path::PathBuf::from(custom_path);
            if !path.exists() || !path.is_dir() {
                errors.push(format!(
                    "Custom ROM path for {} does not exist: {}",
                    system_def.name, custom_path
                ));
                continue;
            }

            let result = scan_system_folder(
                &app, &db, system_def, &path, &mut errors,
            );
            if let Some((sys_count, game_count)) = result {
                systems_found += sys_count;
                games_found += game_count;
            }
            scanned_system_ids.insert(system_def.id);
        }
    }

    // ── Phase 2: Scan default roms/ directory for remaining systems ───
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

        // Skip if already scanned via custom override
        if scanned_system_ids.contains(system_def.id) {
            log::info!(
                "Skipping default folder for {} — using custom ROM path override",
                system_def.name
            );
            continue;
        }

        let result = scan_system_folder(
            &app, &db, system_def, &path, &mut errors,
        );
        if let Some((sys_count, game_count)) = result {
            systems_found += sys_count;
            games_found += game_count;
        }
    }

    let result = ScanResult {
        systems_found,
        games_found,
        errors: errors.clone(),
    };
    let _ = app.emit("scan-complete", &result);

    Ok(result)
}

/// Scan a single system folder and upsert system + games into the database.
/// Returns Some((1, game_count)) on success, None if no games found.
fn scan_system_folder(
    app: &AppHandle,
    db: &Database,
    system_def: &crate::models::system::SystemDef,
    path: &std::path::Path,
    errors: &mut Vec<String>,
) -> Option<(u32, u32)> {
    let _ = app.emit(
        "scan-progress",
        ScanProgress {
            total: 0,
            current: 0,
            current_system: system_def.full_name.to_string(),
            status: format!("Scanning {}...", system_def.full_name),
        },
    );

    let extensions: Vec<String> = system_def
        .extensions
        .iter()
        .map(|e| e.to_lowercase())
        .collect();

    // Parse gamelist.xml if it exists
    let gamelist_path = path.join("gamelist.xml");
    let gamelist = if gamelist_path.exists() {
        log::info!("Parsing gamelist.xml for {}", system_def.name);
        gamelist_service::parse_gamelist(&gamelist_path)
    } else {
        std::collections::HashMap::new()
    };

    let mut games: Vec<GameInfo> = Vec::new();

    for file_entry in WalkDir::new(path)
        .max_depth(2)
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

        let box_art = find_box_art(path, &file_name);

        // Try to enrich from gamelist.xml metadata
        let meta = gamelist.get(&file_name);

        let title = meta
            .and_then(|m| m.name.clone())
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
        });
    }

    if games.is_empty() {
        return None;
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
        return None;
    }
    for game in &games {
        if let Err(e) = db.upsert_game(game) {
            errors.push(format!("DB error for game '{}': {}", game.title, e));
        }
    }

    Some((1, game_count))
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
