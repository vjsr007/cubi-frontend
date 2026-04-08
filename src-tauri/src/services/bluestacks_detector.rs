use std::path::PathBuf;

/// Detect BlueStacks installation on Windows
/// Checks common installation paths
pub fn detect_bluestacks_executable() -> Option<PathBuf> {
    // Standard BlueStacks 5 paths on Windows
    let possible_paths = vec![
        r"C:\Program Files\BlueStacks\bluestacks.exe",
        r"C:\Program Files (x86)\BlueStacks\bluestacks.exe",
        r"C:\Program Files\BlueStacks 5\bluestacks.exe",
        r"C:\Program Files (x86)\BlueStacks 5\bluestacks.exe",
    ];

    for path_str in possible_paths {
        let path = PathBuf::from(path_str);
        if path.exists() {
            log::info!("Found BlueStacks at: {}", path.display());
            return Some(path);
        }
    }

    log::debug!("BlueStacks not found in standard paths");
    None
}

/// Get BlueStacks ROM/APK directory
pub fn get_bluestacks_game_dir() -> Option<PathBuf> {
    // BlueStacks typically stores app data in AppData
    // For now, return None - user will configure path manually
    None
}
