---
id: REQ-002
title: "Configuration System"
status: IMPLEMENTED
author: architect
created: 2026-03-28
updated: 2026-03-28
priority: P0
tags: [backend, config]
---

# REQ-002: Configuration System

## Summary
TOML-based persistent configuration allowing users to set their emulation data root path and EmuDeck emulator path. Auto-detects EmuDeck installation on Windows/Linux.

## User Stories
- **As a user**, I want to set my data root folder (e.g., E:\Emulation) so that the app finds my ROMs
- **As a user with EmuDeck**, I want the app to auto-detect my emulator path so I don't configure it manually

## Functional Requirements
1. **FR-1**: Config stored as TOML at `{config_dir}/cubi-frontend/config.toml`
2. **FR-2**: `get_config` Tauri command returns current `AppConfig`
3. **FR-3**: `set_config` Tauri command persists changes to disk
4. **FR-4**: `detect_emudeck` searches `%APPDATA%/emudeck/Emulators` and common alt paths
5. **FR-5**: Config structure: `general` (theme, language), `paths` (data_root, emudeck_path), `scanner` (auto_scan, hash_roms)
6. **FR-6**: First-run: Settings page shown automatically when `data_root` is empty

## Acceptance Criteria
- [x] Config file created at correct OS path on first run
- [x] Settings page reads and writes config values
- [x] EmuDeck auto-detection finds `%APPDATA%/emudeck/Emulators` on Windows
- [x] Missing `data_root` triggers redirect to Settings page

## Dependencies
- Depends on: REQ-001
