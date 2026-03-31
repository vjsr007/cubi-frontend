use std::collections::HashMap;
use std::path::PathBuf;
use std::io::Write;
use serde::{Deserialize, Serialize};
use crate::models::{GameInfo, config::EmulatorOverride};

/// Serialisable info returned to the frontend for the emulator config page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEmulatorInfo {
    pub system_id: String,
    pub system_name: String,
    pub emulator_name: String,
    /// Auto-detected executable path (may be None if not installed).
    pub detected_path: Option<String>,
    pub is_retroarch: bool,
    /// Default RetroArch core name for this system (RA systems only).
    pub default_core: Option<String>,
    // ── user overrides (mirrored from config) ────────────────────────
    pub exe_path: Option<String>,
    pub extra_args: Option<String>,
    pub core: Option<String>,
}

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

pub fn get_emulator_registry() -> Vec<EmulatorDef> {
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
                "nes", "snes", "n64", "gb", "gbc", "gba", "nds", "3ds",
                "genesis", "mastersystem", "gamegear", "saturn", "dreamcast",
                "arcade", "fbneo", "neogeo", "cps1", "cps2", "cps3",
                "amiga", "atari2600", "atari5200", "atari7800", "atarist", "atarilynx",
                "pcengine", "ngpc", "colecovision", "msx", "c64", "wswan",
            ],
            name: "RetroArch",
            emudeck_paths: &["RetroArch/retroarch.exe", "RetroArch-Win64/retroarch.exe"],
            exe_name: "retroarch",
            launch_template: LaunchTemplate::RetroArch,
        },
    ]
}

fn system_display_name(id: &str) -> String {
    let s: &str = match id {
        "nes"          => "NES",
        "snes"         => "Super Nintendo",
        "n64"          => "Nintendo 64",
        "gb"           => "Game Boy",
        "gbc"          => "Game Boy Color",
        "gba"          => "Game Boy Advance",
        "nds"          => "Nintendo DS",
        "gamecube"     => "GameCube",
        "wii"          => "Wii",
        "switch"       => "Nintendo Switch",
        "ps1"          => "PlayStation",
        "ps2"          => "PlayStation 2",
        "ps3"          => "PlayStation 3",
        "psp"          => "PSP",
        "xbox"         => "Xbox",
        "genesis"      => "Sega Genesis",
        "mastersystem" => "Sega Master System",
        "saturn"       => "Sega Saturn",
        "dreamcast"    => "Sega Dreamcast",
        "arcade"       => "Arcade (MAME)",
        "fbneo"        => "FinalBurn Neo",
        "neogeo"       => "Neo Geo",
        "cps1"         => "CPS-1",
        "cps2"         => "CPS-2",
        "cps3"         => "CPS-3",
        "amiga"        => "Amiga",
        "atari2600"    => "Atari 2600",
        "atari5200"    => "Atari 5200",
        "atari7800"    => "Atari 7800",
        "atarist"      => "Atari ST",
        "atarilynx"    => "Atari Lynx",
        "pcengine"     => "PC Engine / TurboGrafx-16",
        "gamegear"     => "Game Gear",
        "ngpc"         => "Neo Geo Pocket Color",
        "colecovision" => "ColecoVision",
        "msx"          => "MSX",
        "c64"          => "Commodore 64",
        "wswan"        => "WonderSwan Color",
        "3ds"          => "Nintendo 3DS",
        "wiiu"         => "Wii U",
        other          => other,
    };
    s.to_string()
}

/// Return info for every system (auto-detected paths + current config overrides).
pub fn get_all_emulator_info(
    emudeck_path: &str,
    overrides: &HashMap<String, EmulatorOverride>,
) -> Vec<SystemEmulatorInfo> {
    let registry = get_emulator_registry();
    let mut result = Vec::new();

    for def in &registry {
        for &sys_id in def.system_ids {
            let detected = if !emudeck_path.is_empty() {
                def.emudeck_paths.iter().find_map(|rel| {
                    let p = PathBuf::from(emudeck_path)
                        .join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
                    if p.exists() { Some(p.to_string_lossy().to_string()) } else { None }
                })
            } else {
                None
            }
            .or_else(|| which::which(def.exe_name).ok().map(|p| p.to_string_lossy().to_string()));

            let is_retroarch = matches!(def.launch_template, LaunchTemplate::RetroArch);
            let default_core = is_retroarch.then(|| get_retroarch_core(sys_id).to_string());

            let ov = overrides.get(sys_id);
            result.push(SystemEmulatorInfo {
                system_id:     sys_id.to_string(),
                system_name:   system_display_name(sys_id),
                emulator_name: def.name.to_string(),
                detected_path: detected,
                is_retroarch,
                default_core,
                exe_path:   ov.and_then(|o| o.exe_path.clone()),
                extra_args: ov.and_then(|o| o.extra_args.clone()),
                core:       ov.and_then(|o| o.core.clone()),
            });
        }
    }

    result.sort_by(|a, b| a.system_name.cmp(&b.system_name));
    result
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
        "arcade"       => "mame_libretro",
        "fbneo"        => "fbneo_libretro",
        "neogeo"       => "fbneo_libretro",
        "cps1"         => "fbneo_libretro",
        "cps2"         => "fbneo_libretro",
        "cps3"         => "fbneo_libretro",
        "amiga"        => "puae_libretro",
        "atari2600"    => "stella_libretro",
        "atari5200"    => "atari800_libretro",
        "atari7800"    => "prosystem_libretro",
        "atarist"      => "hatari_libretro",
        "atarilynx"    => "beetle_lynx_libretro",
        "pcengine"     => "beetle_pce_libretro",
        "gamegear"     => "genesis_plus_gx_libretro",
        "ngpc"         => "mednafen_ngp_libretro",
        "colecovision" => "gearcoleco_libretro",
        "msx"          => "fmsx_libretro",
        "c64"          => "vice_x64_libretro",
        "wswan"        => "mednafen_wswan_libretro",
        "3ds"          => "citra_libretro",
        "wiiu"         => "hiyacfw_libretro",
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

pub async fn launch_game(
    game: &GameInfo,
    emudeck_path: &str,
    overrides: &HashMap<String, EmulatorOverride>,
) -> Result<(), String> {
    // PC games: launch directly without emulator
    if game.system_id == "pc" {
        return launch_pc_game(&game.file_path).await;
    }

    let registry = get_emulator_registry();
    let def = registry.iter().find(|d| d.system_ids.contains(&game.system_id.as_str()))
        .ok_or_else(|| format!("No emulator configured for system '{}'", game.system_id))?;

    let ov = overrides.get(game.system_id.as_str());

    // Resolve exe: custom override → EmuDeck auto-detect → PATH search
    let exe_path = if let Some(custom) = ov.and_then(|o| o.exe_path.as_deref()).filter(|p| !p.is_empty()) {
        custom.to_string()
    } else if !emudeck_path.is_empty() {
        let found = def.emudeck_paths.iter().find_map(|rel| {
            let p = PathBuf::from(emudeck_path).join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
            if p.exists() { Some(p.to_string_lossy().to_string()) } else { None }
        });
        found
            .or_else(|| which::which(def.exe_name).ok().map(|p| p.to_string_lossy().to_string()))
            .ok_or_else(|| format!(
                "{} not found. Please configure the executable path in Emulator Settings.",
                def.name
            ))?
    } else {
        which::which(def.exe_name)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|_| format!(
                "{} not found. Please configure the executable path in Emulator Settings.",
                def.name
            ))?
    };

    let rom = &game.file_path;

    // Resolve args: custom override → default template
    let args: Vec<String> = if let Some(custom_args) = ov.and_then(|o| o.extra_args.as_deref()).filter(|a| !a.is_empty()) {
        shell_split(&custom_args.replace("{rom}", rom))
    } else {
        match &def.launch_template {
            LaunchTemplate::Simple => vec![rom.clone()],
            LaunchTemplate::Custom(tmpl) => shell_split(&tmpl.replace("{rom}", rom)),
            LaunchTemplate::RetroArch => {
                let core_name = ov.and_then(|o| o.core.as_deref()).filter(|c| !c.is_empty())
                    .unwrap_or_else(|| get_retroarch_core(&game.system_id));
                let exe_dir = std::path::Path::new(&exe_path)
                    .parent()
                    .unwrap_or(std::path::Path::new(""));
                let core_path = if core_name.contains(std::path::MAIN_SEPARATOR) || core_name.ends_with(".dll") {
                    PathBuf::from(core_name)
                } else {
                    exe_dir.join("cores").join(format!("{}.dll", core_name))
                };
                let mut launch_args = vec![
                    "-L".to_string(),
                    core_path.to_string_lossy().to_string(),
                    rom.clone(),
                ];
                // Create a temp override config to prevent pause when RA loses focus
                if let Ok(override_path) = write_retroarch_override_cfg(&game.system_id) {
                    launch_args.push("--appendconfig".to_string());
                    launch_args.push(override_path);
                }
                launch_args
            }
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

/// Write a RetroArch override config with global + per-system settings.
/// Returns the path to the generated file.
fn write_retroarch_override_cfg(system_id: &str) -> Result<String, String> {
    let dir = std::env::temp_dir().join("cubi-frontend");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create temp dir: {e}"))?;
    let cfg_path = dir.join("retroarch_override.cfg");
    let mut f = std::fs::File::create(&cfg_path)
        .map_err(|e| format!("Failed to create override cfg: {e}"))?;
    writeln!(f, "# Cubi Frontend — RetroArch launch overrides")
        .and_then(|_| writeln!(f, "pause_nonactive = \"false\""))
        .and_then(|_| writeln!(f, "video_vsync = \"false\""))
        .map_err(|e| format!("Failed to write override cfg: {e}"))?;

    // N64: mupen64plus_next GLideN64 plugin requires an OpenGL driver.
    // Force glcore so it doesn't blank-screen when RA defaults to vulkan/d3d.
    // Also force analog_dpad_mode=0 so the left stick sends true analog data
    // to the N64 control stick (mode ≠ 0 converts analog→dpad, breaking movement).
    if system_id == "n64" {
        writeln!(f, "video_driver = \"glcore\"")
            .and_then(|_| writeln!(f, "input_player1_analog_dpad_mode = \"0\""))
            .map_err(|e| format!("Failed to write N64 override: {e}"))?;
    }

    // NDS: melonDS core requires the OpenGL compatibility context (`gl`).
    // Using vulkan, d3d, or even glcore causes a frozen/black screen with audio.
    if system_id == "nds" {
        writeln!(f, "video_driver = \"gl\"")
            .map_err(|e| format!("Failed to write NDS override: {e}"))?;
    }

    Ok(cfg_path.to_string_lossy().to_string())
}

/// Launch a PC game: protocol URL (Steam/Epic) or direct exe.
pub async fn launch_pc_game(file_path: &str) -> Result<(), String> {
    let is_url = file_path.starts_with("steam://")
        || file_path.starts_with("com.epicgames.")
        || file_path.starts_with("origin2://")
        || file_path.starts_with("eadm://");

    if is_url {
        log::info!("Opening PC game URL: {}", file_path);
        tokio::process::Command::new("cmd")
            .args(["/C", "start", "", file_path])
            .spawn()
            .map_err(|e| format!("Failed to open URL '{}': {}", file_path, e))?;
    } else {
        log::info!("Launching PC game exe: {}", file_path);
        let path = std::path::Path::new(file_path);
        let cwd = path.parent().unwrap_or(std::path::Path::new("."));
        tokio::process::Command::new(file_path)
            .current_dir(cwd)
            .spawn()
            .map_err(|e| format!("Failed to launch '{}': {}", file_path, e))?;
    }
    Ok(())
}
