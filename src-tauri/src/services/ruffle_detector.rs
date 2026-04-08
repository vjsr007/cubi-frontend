use std::path::PathBuf;

/// Detect a local Ruffle desktop executable on Windows.
/// Checks common install locations for both stable/nightly naming variants.
pub fn detect_ruffle_executable() -> Option<PathBuf> {
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let program_files = std::env::var("ProgramFiles").unwrap_or_default();
    let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_default();

    let possible_paths = vec![
        PathBuf::from(format!(r"{}\Programs\Ruffle\Ruffle.exe", local_app_data)),
        PathBuf::from(format!(r"{}\Programs\Ruffle\ruffle.exe", local_app_data)),
        PathBuf::from(format!(r"{}\Ruffle\Ruffle.exe", program_files)),
        PathBuf::from(format!(r"{}\Ruffle\ruffle.exe", program_files)),
        PathBuf::from(format!(r"{}\Ruffle\Ruffle.exe", program_files_x86)),
        PathBuf::from(format!(r"{}\Ruffle\ruffle.exe", program_files_x86)),
        PathBuf::from(r"C:\Ruffle\Ruffle.exe"),
        PathBuf::from(r"C:\Ruffle\ruffle.exe"),
        PathBuf::from(r"D:\Ruffle\Ruffle.exe"),
        PathBuf::from(r"D:\Ruffle\ruffle.exe"),
    ];

    for path in possible_paths {
        if path.exists() {
            log::info!("Found Ruffle at: {}", path.display());
            return Some(path);
        }
    }

    log::debug!("Ruffle not found in standard paths");
    None
}
