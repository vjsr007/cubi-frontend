---
id: DES-005
title: "Game Launch System Design"
status: IMPLEMENTED
req: REQ-005
author: architect
created: 2026-03-28
updated: 2026-03-28
tags: [backend, launcher]
---

# DES-005: Game Launch System Design

## Overview
`services/launcher_service.rs` contains `EmulatorDef` registry and `find_emulator()` which checks EmuDeck paths then PATH. `commands/launcher.rs` exposes `launch_game` which resolves the game, finds the emulator, spawns the process, and updates play stats.

## Emulator Registry
```rust
struct EmulatorDef {
    system_ids: &'static [&'static str],
    emudeck_paths: &'static [&'static str],  // relative to emudeck_path
    exe_name: &'static str,                  // for `which` fallback
    launch_template: LaunchTemplate,
}
enum LaunchTemplate {
    Simple,                       // exe "rom"
    Custom(&'static str),         // exe {args_with_rom_placeholder}
    RetroArchCore(&'static str),  // retroarch -L {core} "rom"
}
```

## System → Emulator Mapping
| Systems | Emulator | EmuDeck Path |
|---------|----------|--------------|
| gamecube, wii | Dolphin | `Dolphin-x64/Dolphin.exe` |
| ps2 | PCSX2 | `PCSX2/pcsx2-qt.exe` |
| psp | PPSSPP | `PPSSPP/PPSSPPWindows64.exe` |
| ps1 | DuckStation | `duckstation/duckstation-qt-x64-ReleaseLTCG.exe` |
| ps3 | RPCS3 | `rpcs3/rpcs3.exe` |
| switch | Ryujinx | `Ryujinx/Ryujinx.exe` |
| xbox | xemu | `xemu/xemu.exe` |
| nes/snes/n64/gba/nds/genesis/etc | RetroArch | `RetroArch/retroarch.exe` |

## RetroArch Cores (per system_id)
nes→fceumm, snes→snes9x, n64→mupen64plus_next, gb/gbc→gambatte, gba→mgba, nds→melonds, genesis→genesis_plus_gx, arcade→mame

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-005-01 | EmulatorDef registry + find_emulator | S | TASK-001-01 |
| TASK-005-02 | launch_game command + play stat update | S | TASK-005-01 |
| TASK-005-03 | Launch button in GameCard + GameDetail + error toast | S | TASK-005-02 |
