use std::path::PathBuf;
use crate::models::GameInfo;

#[derive(Debug, Clone)]
pub struct EmulatorDef {
    pub system_ids: &'static [&'static str],
    pub name: &'static str,
    pub emudeck_paths: &'static [&'static str],
    pub exe_name: &'static str,
    pub launch_template: LaunchTemplate,
}

#[derive(Debug, Clone)]
pub enum LaunchTemplate {
    Simple,
    RetroArch,
    Custom(&'static str),
}

fn get_emulator_registry() -> Vec<EmulatorDef> {
    vec![
        EmulatorDef {
            system_ids: &["gamecube", "wii"],
            name: "Dolphin",
            emudeck_paths: &["Dolphin-x64/Dolphin.exe", "Dolphin/Dolphin.exe"],
            exe_name: "Dolphin",
            launch_template: LaunchTemplate::Custom("--batch --exec=\"{rom}\""),
        },
        EmulatorDef {
            system_ids: &["ps2"],
            name: "PCSX2",
            emudeck_paths: &["PCSX2/pcsx2-qt.exe", "PCSX2-Qt/pcsx2-qt.exe"],
            exe_name: "pcsx2-qt",
            launch_template: LaunchTemplate::Simple,
        },
        EmulatorDef {
            system_ids: &["psp"],
            name: "PPSSPP",
            emudeck_paths: &["PPSSPP/PPSSPPWindows64.exe", "PPSSPP/PPSSPP.exe"],
            exe_name: "PPSSPPWindows64",
            launch_template: LaunchTemplate::Simple,
        },
        EmulatorDef {
            system_ids: &["ps1"],
            name: "DuckStation",
            emudeck_paths: &[
                "duckstation/duckstation-qt-x64-ReleaseLTCG.exe",
                "duckstation/duckstation-qt.exe",
            ],
            exe_name: "duckstation-qt",
            launch_template: LaunchTemplate::Simple,
        },
        EmulatorDef {
            system_ids: &["ps3"],
            name: "RPCS3",
            emudeck_paths: &["rpcs3/rpcs3.exe"],
            exe_name: "rpcs3",
            launch_template: LaunchTemplate::Custom("--no-gui \"{rom}\""),
        },
        EmulatorDef {
            system_ids: &["xbox"],
            name: "xemu",
            emudeck_paths: &["xemu/xemu.exe"],
            exe_name: "xemu",
            launch_template: LaunchTemplate::Custom("-dvd_path \"{rom}\""),
        },
        EmulatorDef {
            system_ids: &["switch"],
            name: "Ryujinx",
            emudeck_paths: &["Ryujinx/Ryujinx.exe", "ryujinx/Ryujinx.exe"],
            exe_name: "Ryujinx",
            launch_template: LaunchTemplate::Simple,
        },
        EmulatorDef {
            system_ids: &[
                "nes", "snes", "n64", "gb", "gbc", "gba", "nds",
                "genesis", "mastersystem", "saturn", "dreamcast", "arcade",
            ],
            name: "RetroArch",
            emudeck_paths: &["RetroArch/retroarch.exe", "RetroArch-Win64/retroarch.exe"],
            exe_name: "retroarch",
            launch_template: LaunchTemplate::RetroArch,
        },
    ]
}

pub fn get_retroarch_core(system_id: &str) -> &'static str {
    match system_id {
        "nes" => "fceumm_libretro",
        "snes" => "snes9x_libretro",
        "n64" => "mupen64plus_next_libretro",
        "gb" | "gbc" => "gambatte_libretro",
        "gba" => "mgba_libretro",
        "nds" => "melonds_libretro",
        "genesis" | "megadrive" => "genesis_plus_gx_libretro",
        "mastersystem" => "genesis_plus_gx_libretro",
        "saturn" => "mednafen_saturn_libretro",
        "dreamcast" => "flycast_libretro",
        "arcade" => "mame_libretro",
        _ => "fceumm_libretro",
    }
}

pub fn find_emulator(system_id: &str, emudeck_path: &str) -> Option<(String, String)> {
    let registry = get_emulator_registry();
    for def in &registry {
        if !def.system_ids.contains(&system_id) {
            continue;
        }
        if !emudeck_path.is_empty() {
            for rel in def.emudeck_paths {
                let full = PathBuf::from(emudeck_path).join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
                if full.exists() {
                    return Some((full.to_string_lossy().to_string(), def.name.to_string()));
                }
            }
        }
        if let Ok(found) = which::which(def.exe_name) {
            return Some((found.to_string_lossy().to_string(), def.name.to_string()));
        }
    }
    None
}

pub async fn launch_game(game: &GameInfo, emudeck_path: &str) -> Result<(), String> {
    let registry = get_emulator_registry();
    let def = registry.iter().find(|d| d.system_ids.contains(&game.system_id.as_str()))
        .ok_or_else(|| format!("No emulator configured for system '{}'", game.system_id))?;

    let exe_path = if !emudeck_path.is_empty() {
        let found = def.emudeck_paths.iter().find_map(|rel| {
            let p = PathBuf::from(emudeck_path).join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
            if p.exists() { Some(p.to_string_lossy().to_string()) } else { None }
        });
        found.or_else(|| which::which(def.exe_name).ok().map(|p| p.to_string_lossy().to_string()))
    } else {
        which::which(def.exe_name).ok().map(|p| p.to_string_lossy().to_string())
    }
    .ok_or_else(|| format!(
        "{} not found. Please configure your emulator path in Settings.",
        def.name
    ))?;

    let rom = &game.file_path;
    let args: Vec<String> = match &def.launch_template {
        LaunchTemplate::Simple => vec![rom.clone()],
        LaunchTemplate::Custom(tmpl) => {
            shell_split(&tmpl.replace("{rom}", rom))
        }
        LaunchTemplate::RetroArch => {
            let core_name = get_retroarch_core(&game.system_id);
            let exe_dir = std::path::Path::new(&exe_path)
                .parent()
                .unwrap_or(std::path::Path::new(""));
            let core_path = exe_dir.join("cores").join(format!("{}.dll", core_name));
            vec![
                "-L".to_string(),
                core_path.to_string_lossy().to_string(),
                rom.clone(),
            ]
        }
    };

    log::info!("Launching: {} {:?}", exe_path, args);
    tokio::process::Command::new(&exe_path)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to launch {}: {}", def.name, e))?;

    Ok(())
}

fn shell_split(s: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut quote_char = '"';
    for ch in s.chars() {
        match ch {
            '"' | '\'' if !in_quotes => { in_quotes = true; quote_char = ch; }
            c if in_quotes && c == quote_char => { in_quotes = false; }
            ' ' if !in_quotes => {
                if !current.is_empty() { args.push(current.clone()); current.clear(); }
            }
            _ => current.push(ch),
        }
    }
    if !current.is_empty() { args.push(current); }
    args
}
