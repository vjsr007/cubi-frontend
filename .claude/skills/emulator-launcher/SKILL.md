````skill
---
name: emulator-launcher
description: Skill for launching emulator processes with correct arguments, managing emulator configurations, auto-detecting emulator installations, and handling special launch cases. Based on REAL EmuDeck launcher scripts from a production setup with 21+ emulators.
version: "1.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: rust
  data-source: "E:\\Emulation\\tools\\launchers (23 real PowerShell launcher scripts)"
---

# Emulator Launcher Skill

## Purpose
Guide the implementation of emulator process launching: resolving emulator paths, building command-line arguments, spawning processes, and handling special cases per emulator. Based on real EmuDeck launcher patterns.

## Architecture Overview

### Key Principle: Emulators Are External
Emulators are NOT in the data folder. They are installed separately:
- **EmuDeck (Windows)**: `%APPDATA%/emudeck/Emulators/{name}/{exe}`
- **Custom paths**: User-configured per emulator
- **System PATH**: Some may be in system PATH
- **Portable**: User could have emulators on a USB drive

### Launcher Configuration Database
```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmulatorConfig {
    pub id: String,                    // "retroarch", "duckstation", "dolphin"
    pub display_name: String,          // "RetroArch", "DuckStation"
    pub exe_path: PathBuf,             // Resolved absolute path
    pub exe_relative: String,          // "RetroArch/retroarch.exe"
    pub systems: Vec<String>,          // ["nes", "snes", "gb", "gbc", ...]
    pub launch_pattern: LaunchPattern,
    pub fullscreen_arg: Option<String>,
    pub special_handling: Option<SpecialHandling>,
    pub is_retroarch: bool,
    pub detected: bool,                // Auto-detected vs manual
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LaunchPattern {
    /// Standard: exe "rom_path"
    Standard,
    /// RetroArch: retroarch -L "core_path" "rom_path"
    RetroArchCore { core_name: String },
    /// Directory: exe "directory_path" (PS3, ScummVM)
    Directory,
    /// No arguments: exe (for frontends like ES-DE)
    NoArgs,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SpecialHandling {
    /// Xenia: add --fullscreen=true
    XeniaFullscreen,
    /// ShadPS4: cd to emulator dir first, resolve .lnk shortcuts
    ShadPs4CdFirst,
    /// RPCS3: --no-gui flag
    Rpcs3NoGui,
}
```

---

## Emulator Registry (Real Data from EmuDeck)

### Complete Emulator Table
```rust
/// Build the default emulator registry from EmuDeck conventions
fn default_emulator_registry() -> Vec<EmulatorConfig> {
    vec![
        // === RetroArch (handles most cartridge systems) ===
        EmulatorConfig {
            id: "retroarch".into(),
            display_name: "RetroArch".into(),
            exe_relative: "RetroArch/retroarch.exe".into(),
            systems: vec![
                "atari2600", "atari5200", "atari7800",
                "nes", "fds", "snes", "satellaview",
                "gb", "gbc", "megadrive", "mastersystem",
                "gamegear", "sg1000", "pcengine",
                "n64", "neogeo", "ngpc", "wswan", "wswanc",
                "colecovision", "intellivision",
                "mame", "fbneo", "gw",
            ].into_iter().map(String::from).collect(),
            launch_pattern: LaunchPattern::RetroArchCore {
                core_name: "".into(), // Set per system
            },
            fullscreen_arg: Some("--fullscreen".into()),
            special_handling: None,
            is_retroarch: true,
            ..Default::default()
        },
        
        // === Standalone Emulators ===
        EmulatorConfig {
            id: "duckstation".into(),
            display_name: "DuckStation".into(),
            exe_relative: "duckstation/duckstation-qt-x64-ReleaseLTCG.exe".into(),
            systems: vec!["psx".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "dolphin".into(),
            display_name: "Dolphin".into(),
            exe_relative: "Dolphin-x64/Dolphin.exe".into(),
            systems: vec!["gc".into(), "wii".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-b".into()), // batch mode (no UI)
            ..Default::default()
        },
        EmulatorConfig {
            id: "pcsx2".into(),
            display_name: "PCSX2".into(),
            exe_relative: "PCSX2-Qt/pcsx2-qtx64.exe".into(),
            systems: vec!["ps2".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "ppsspp".into(),
            display_name: "PPSSPP".into(),
            exe_relative: "PPSSPP/PPSSPPWindows64.exe".into(),
            systems: vec!["psp".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("--fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "melonds".into(),
            display_name: "melonDS".into(),
            exe_relative: "melonDS/melonDS.exe".into(),
            systems: vec!["nds".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("--fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "mgba".into(),
            display_name: "mGBA".into(),
            exe_relative: "mGBA/mGBA.exe".into(),
            systems: vec!["gba".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-f".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "ryujinx".into(),
            display_name: "Ryujinx".into(),
            exe_relative: "Ryujinx/ryujinx.exe".into(),
            systems: vec!["switch".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("--fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "rpcs3".into(),
            display_name: "RPCS3".into(),
            exe_relative: "rpcs3/rpcs3.exe".into(),
            systems: vec!["ps3".into()],
            launch_pattern: LaunchPattern::Directory,
            fullscreen_arg: None,
            special_handling: Some(SpecialHandling::Rpcs3NoGui),
            ..Default::default()
        },
        EmulatorConfig {
            id: "xemu".into(),
            display_name: "xemu".into(),
            exe_relative: "xemu/xemu.exe".into(),
            systems: vec!["xbox".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-full-screen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "xenia".into(),
            display_name: "Xenia Canary".into(),
            exe_relative: "xenia/xenia_canary.exe".into(),
            systems: vec!["xbox360".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: None,
            special_handling: Some(SpecialHandling::XeniaFullscreen),
            ..Default::default()
        },
        EmulatorConfig {
            id: "flycast".into(),
            display_name: "Flycast".into(),
            exe_relative: "flycast/flycast.exe".into(),
            systems: vec!["dreamcast".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("--fullscreen".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "scummvm".into(),
            display_name: "ScummVM".into(),
            exe_relative: "scummvm/scummvm.exe".into(),
            systems: vec!["scummvm".into()],
            launch_pattern: LaunchPattern::Directory,
            fullscreen_arg: Some("-f".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "vita3k".into(),
            display_name: "Vita3K".into(),
            exe_relative: "Vita3K/Vita3K.exe".into(),
            systems: vec!["psvita".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
        EmulatorConfig {
            id: "cemu".into(),
            display_name: "Cemu".into(),
            exe_relative: "Cemu/Cemu.exe".into(),
            systems: vec!["wiiu".into()],
            launch_pattern: LaunchPattern::Standard,
            fullscreen_arg: Some("-f".into()),
            ..Default::default()
        },
        EmulatorConfig {
            id: "lime3ds".into(),
            display_name: "Lime3DS".into(),
            exe_relative: "lime3ds/lime3ds.exe".into(),
            systems: vec!["3ds".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
        EmulatorConfig {
            id: "azahar".into(),
            display_name: "Azahar".into(),
            exe_relative: "azahar/azahar.exe".into(),
            systems: vec!["3ds".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
        EmulatorConfig {
            id: "shadps4".into(),
            display_name: "ShadPS4".into(),
            exe_relative: "shadps4-qt/shadps4.exe".into(),
            systems: vec!["ps4".into()],
            launch_pattern: LaunchPattern::Standard,
            special_handling: Some(SpecialHandling::ShadPs4CdFirst),
            ..Default::default()
        },
        EmulatorConfig {
            id: "bigpemu".into(),
            display_name: "BigPEmu".into(),
            exe_relative: "bigpemu/BigPEmu.exe".into(),
            systems: vec!["atarijaguar".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
        EmulatorConfig {
            id: "model2".into(),
            display_name: "Model 2 Emulator".into(),
            exe_relative: "Model2/emulator.exe".into(),
            systems: vec!["model2".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
        EmulatorConfig {
            id: "supermodel".into(),
            display_name: "Supermodel".into(),
            exe_relative: "supermodel/Supermodel.exe".into(),
            systems: vec!["supermodel".into()],
            launch_pattern: LaunchPattern::Standard,
            ..Default::default()
        },
    ]
}
```

### RetroArch Core Mapping
```rust
/// Map system ID to RetroArch core DLL name
fn system_to_retroarch_core(system_id: &str) -> Option<&str> {
    match system_id {
        "atari2600" => Some("stella_libretro"),
        "atari5200" => Some("a5200_libretro"),
        "atari7800" => Some("prosystem_libretro"),
        "nes" | "fds" => Some("mesen_libretro"),
        "snes" | "satellaview" => Some("snes9x_libretro"),
        "gb" | "gbc" => Some("gambatte_libretro"),
        "megadrive" | "mastersystem" | "gamegear" | "sg1000" => Some("genesis_plus_gx_libretro"),
        "n64" => Some("mupen64plus_next_libretro"),
        "pcengine" => Some("mednafen_pce_libretro"),
        "neogeo" | "fbneo" => Some("fbneo_libretro"),
        "mame" => Some("mame_libretro"),
        "wswan" | "wswanc" => Some("mednafen_wswan_libretro"),
        "ngpc" => Some("mednafen_ngp_libretro"),
        "colecovision" => Some("bluemsx_libretro"),
        "intellivision" => Some("freeintv_libretro"),
        "gw" => Some("gw_libretro"),
        _ => None,
    }
}
```

---

## Emulator Auto-Detection

```rust
use std::path::Path;

/// Auto-detect emulator installations
pub fn detect_emulators() -> Vec<DetectedEmulator> {
    let mut detected = Vec::new();
    
    // Strategy 1: EmuDeck standard path
    let emudeck_base = dirs::config_dir()
        .map(|d| d.join("emudeck/Emulators"));
    
    if let Some(base) = &emudeck_base {
        if base.is_dir() {
            for config in default_emulator_registry() {
                let full_path = base.join(&config.exe_relative);
                if full_path.exists() {
                    detected.push(DetectedEmulator {
                        config: EmulatorConfig {
                            exe_path: full_path,
                            detected: true,
                            ..config
                        },
                        source: DetectionSource::EmuDeck,
                    });
                }
            }
        }
    }
    
    // Strategy 2: Common installation paths
    let common_paths = [
        dirs::home_dir().map(|d| d.join("Emulators")),
        Some(PathBuf::from("C:\\Emulators")),
        Some(PathBuf::from("D:\\Emulators")),
    ];
    
    for base in common_paths.into_iter().flatten() {
        if base.is_dir() {
            for config in default_emulator_registry() {
                let full_path = base.join(&config.exe_relative);
                if full_path.exists() && !detected.iter().any(|d| d.config.id == config.id) {
                    detected.push(DetectedEmulator {
                        config: EmulatorConfig {
                            exe_path: full_path,
                            detected: true,
                            ..config
                        },
                        source: DetectionSource::CommonPath,
                    });
                }
            }
        }
    }
    
    // Strategy 3: System PATH
    for config in default_emulator_registry() {
        let exe_name = Path::new(&config.exe_relative)
            .file_name()
            .unwrap()
            .to_string_lossy();
        if which::which(&*exe_name).is_ok() 
            && !detected.iter().any(|d| d.config.id == config.id) 
        {
            detected.push(DetectedEmulator {
                config: EmulatorConfig {
                    exe_path: which::which(&*exe_name).unwrap(),
                    detected: true,
                    ..config
                },
                source: DetectionSource::SystemPath,
            });
        }
    }
    
    detected
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedEmulator {
    pub config: EmulatorConfig,
    pub source: DetectionSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DetectionSource {
    EmuDeck,
    CommonPath,
    SystemPath,
    UserConfigured,
}
```

---

## Process Launching

```rust
use tokio::process::Command;
use std::process::Stdio;

/// Launch a game with the appropriate emulator
pub async fn launch_game(
    emulator: &EmulatorConfig,
    rom_path: &Path,
    fullscreen: bool,
) -> Result<LaunchResult, LaunchError> {
    let mut cmd = Command::new(&emulator.exe_path);
    
    // Handle special cases BEFORE building args
    match &emulator.special_handling {
        Some(SpecialHandling::ShadPs4CdFirst) => {
            // ShadPS4 needs to run from its own directory
            if let Some(parent) = emulator.exe_path.parent() {
                cmd.current_dir(parent);
            }
            
            // Resolve .lnk shortcuts
            let actual_path = if rom_path.extension().map(|e| e == "lnk").unwrap_or(false) {
                resolve_lnk(rom_path)?
            } else {
                rom_path.to_path_buf()
            };
            cmd.arg(&actual_path);
        }
        Some(SpecialHandling::XeniaFullscreen) => {
            cmd.arg(rom_path);
            if fullscreen {
                cmd.arg("--fullscreen=true");
            }
        }
        Some(SpecialHandling::Rpcs3NoGui) => {
            cmd.arg("--no-gui");
            cmd.arg(rom_path);
        }
        None => {
            // Standard launch pattern
            match &emulator.launch_pattern {
                LaunchPattern::Standard => {
                    if fullscreen {
                        if let Some(ref arg) = emulator.fullscreen_arg {
                            cmd.arg(arg);
                        }
                    }
                    cmd.arg(rom_path);
                }
                LaunchPattern::RetroArchCore { core_name } => {
                    // retroarch -L "cores/{core}_libretro.dll" "rom_path"
                    let core_path = emulator.exe_path.parent()
                        .unwrap()
                        .join("cores")
                        .join(format!("{}.dll", core_name));
                    cmd.arg("-L").arg(&core_path);
                    if fullscreen {
                        cmd.arg("--fullscreen");
                    }
                    cmd.arg(rom_path);
                }
                LaunchPattern::Directory => {
                    if fullscreen {
                        if let Some(ref arg) = emulator.fullscreen_arg {
                            cmd.arg(arg);
                        }
                    }
                    cmd.arg(rom_path); // Path to directory
                }
                LaunchPattern::NoArgs => {}
            }
        }
    }
    
    // Spawn process
    let child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| LaunchError::SpawnFailed(e.to_string()))?;
    
    let pid = child.id().unwrap_or(0);
    
    Ok(LaunchResult {
        pid,
        emulator_id: emulator.id.clone(),
        rom_path: rom_path.to_path_buf(),
        started_at: chrono::Utc::now(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchResult {
    pub pid: u32,
    pub emulator_id: String,
    pub rom_path: PathBuf,
    pub started_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum LaunchError {
    #[error("Emulator not found: {0}")]
    EmulatorNotFound(String),
    #[error("ROM not found: {0}")]
    RomNotFound(String),
    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),
    #[error("Failed to resolve shortcut: {0}")]
    ShortcutResolveFailed(String),
}
```

---

## Play Time Tracking

```rust
/// Track game sessions for play time statistics
pub struct PlaySession {
    pub game_id: i64,        // DB ID from game_metadata
    pub emulator_id: String,
    pub started_at: i64,     // Unix timestamp
    pub ended_at: Option<i64>,
    pub duration_secs: Option<i64>,
}

/// Monitor running emulator process
async fn track_play_session(
    pid: u32,
    game_id: i64,
    emulator_id: String,
    app: tauri::AppHandle,
) {
    let start = std::time::Instant::now();
    
    // Poll process existence
    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;
        
        if !is_process_running(pid) {
            let duration = start.elapsed().as_secs() as i64;
            
            // Update database
            // Emit "game-session-ended" event
            app.emit("game-session-ended", serde_json::json!({
                "game_id": game_id,
                "emulator_id": emulator_id,
                "duration_secs": duration,
            })).ok();
            
            break;
        }
    }
}
```

---

## Tauri IPC Commands

```rust
#[tauri::command]
async fn detect_emulators() -> Result<Vec<DetectedEmulator>, String> {
    Ok(crate::services::launcher::detect_emulators())
}

#[tauri::command]
async fn launch_game(
    emulator_id: String,
    rom_path: String,
    fullscreen: bool,
    app: tauri::AppHandle,
) -> Result<LaunchResult, String> {
    // Resolve emulator config
    // Launch process
    // Start play session tracking
    todo!()
}

#[tauri::command]
async fn get_running_games() -> Result<Vec<RunningGame>, String> {
    // Return list of currently running emulator processes
    todo!()
}

#[tauri::command]
async fn stop_game(pid: u32) -> Result<(), String> {
    // Kill emulator process
    todo!()
}

#[tauri::command]
async fn configure_emulator(
    emulator_id: String, 
    exe_path: String,
) -> Result<(), String> {
    // Save custom emulator path
    todo!()
}
```

---

## Key Design Rules

1. **Never hardcode emulator paths** — always resolve from config
2. **EmuDeck detection first** — most users will have EmuDeck
3. **Graceful degradation** — if emulator not found, show clear error
4. **Process isolation** — spawn emulators as child processes
5. **Play time tracking** — monitor PID to track session duration
6. **Fullscreen by default** — emulator frontend should launch games in fullscreen
7. **Handle .lnk files** — ShadPS4 uses Windows shortcuts
8. **RetroArch cores per system** — different core DLL for each system
9. **Working directory matters** — ShadPS4 needs cd to its own dir
10. **User override always wins** — custom paths override auto-detection
````
