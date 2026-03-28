use tauri::{AppHandle, Emitter, State};
use walkdir::WalkDir;
use crate::db::Database;
use crate::models::{GameInfo, SystemInfo, ScanProgress, ScanResult};
use crate::models::system::get_system_registry;

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

        let mut games: Vec<GameInfo> = Vec::new();

        for file_entry in WalkDir::new(&path)
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

            let title = GameInfo::title_from_filename(&file_name);
            let box_art = find_box_art(&path, &file_name);

            games.push(GameInfo {
                id,
                system_id: system_def.id.to_string(),
                title,
                file_path: file_path_str,
                file_name,
                file_size,
                box_art,
                description: None,
                developer: None,
                publisher: None,
                year: None,
                genre: None,
                players: 1,
                rating: 0.0,
                last_played: None,
                play_count: 0,
                favorite: false,
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
