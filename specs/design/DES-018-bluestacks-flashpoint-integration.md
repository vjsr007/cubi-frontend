---
id: DES-018
title: "BlueStacks and Ruffle Flash Integration Design"
status: APPROVED
req: REQ-018
author: architect
created: 2026-03-30
updated: 2026-03-31
tags: [backend, emulator-support, architecture]
---

# DES-018: BlueStacks and Ruffle Flash Integration Design

## Overview
Extend the system registry and emulator registry to support BlueStacks (Android apps) and local Adobe Flash games via Ruffle. Both are external tools that require auto-detection and custom launch behavior.

## Architecture Decision

### BlueStacks System
- **System ID**: `bluestacks_android`
- **Extensions**: `.apk`
- **ROM Path**: User-configurable (typically `{DATA_ROOT}/roms/bluestacks_android/`)
- **Emulator**: BlueStacks 5.x (Windows only)
- **Auto-Detection**: Check `%ProgramFiles%/BlueStacks/` and `%ProgramFiles(x86)%/BlueStacks/`
- **Launch Template**: `bluestacks.exe -action launchapp -appname "{app_name}"`

### Flash System
- **System ID**: `flashpoint`
- **Display Name**: `Flash`
- **Extensions**: `.swf`
- **ROM Path**: Local folder under `{DATA_ROOT}/roms/flash/` or a ROM path override
- **Emulator**: Ruffle desktop player
- **Auto-Detection**: Check common Windows install paths for `Ruffle.exe` / `ruffle.exe`
- **Launch Template**: runtime CLI built from emulator settings and the ROM path

## Data Model Changes

### system.rs - Flash system entry
```rust
SystemDef {
    id: "flashpoint",
    name: "Flash",
    full_name: "Adobe Flash (Ruffle)",
    extensions: &["swf"],
    folder_names: &["flash", "flashpoint"],
}
```

### launcher_service.rs - Ruffle emulator entry
```rust
EmulatorDef {
    system_ids: &["flashpoint"],
    name: "Ruffle",
    emudeck_paths: &[],
    exe_name: "ruffle",
    launch_template: LaunchTemplate::Simple,
}
```

### emulator_settings.rs - Ruffle-relevant canonical settings
```rust
renderer  -> select(vulkan, opengl, directx)
fullscreen -> bool
spoof_url -> text
```

Ruffle launch arguments are composed at runtime:
- `fullscreen = true` -> `--fullscreen`
- `renderer = vulkan|opengl|directx` -> `--graphics vulkan|gl|dx12`
- `spoof_url = https://...` -> `--spoof-url <url>`

## Implementation Phases

### Phase 1: System Registration
1. Keep the legacy `flashpoint` system id for compatibility
2. Rename the user-facing system to Flash
3. Restrict scanning to `.swf` files
4. Register Ruffle as the launch target for the Flash system

### Phase 2: Auto-Detection
1. Create `bluestacks_detector.rs` in `services/`
2. Create `ruffle_detector.rs` in `services/`
3. Integrate detection into `launcher_service.rs`
4. Preserve executable overrides through existing config structures

### Phase 3: Launch Configuration
1. Extend emulator general settings with `renderer` and `spoof_url`
2. Add a `RuffleConfigWriter` to the writer factory
3. Apply merged emulator settings during launch

## File Changes

| File | Change | Complexity |
|------|--------|-----------|
| `src-tauri/src/models/system.rs` | Replace Flashpoint display/system metadata with Flash + Ruffle semantics | Low |
| `src-tauri/src/services/launcher_service.rs` | Add Ruffle registry entry, auto-detection, and argument composition | Medium |
| `src-tauri/src/services/ruffle_detector.rs` | Create Ruffle detector module | Low |
| `src-tauri/src/models/emulator_settings.rs` | Add `renderer` and `spoof_url` canonical settings | Medium |
| `src-tauri/src/services/config_writers/ruffle.rs` | Add config preview strategy for Ruffle | Low |

## Task Breakdown
| Task ID | Title | Est. | Dependencies |
|---------|-------|-----|--------------|
| TASK-018-01 | Add system/emulator registry entries | XS | - |
| TASK-018-02 | Implement BlueStacks auto-detection | S | TASK-018-01 |
| TASK-018-03 | Implement Ruffle auto-detection | S | TASK-018-01 |
| TASK-018-04 | Test launcher with both systems | M | TASK-018-02, TASK-018-03 |
