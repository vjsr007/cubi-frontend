---
id: REQ-005
title: "Game Launch System"
status: IMPLEMENTED
author: architect
created: 2026-03-28
updated: 2026-03-28
priority: P1
tags: [backend, launcher]
---

# REQ-005: Game Launch System

## Summary
Launches selected games using the appropriate emulator for the system. Auto-detects EmuDeck emulator installations. Updates play count and last-played timestamp after launch.

## User Stories
- **As a user**, I want to press Enter/A to launch a game so I can play immediately
- **As an EmuDeck user**, I want emulators detected automatically so I don't configure paths

## Functional Requirements
1. **FR-1**: `launch_game(game_id)` command resolves game → system → emulator → spawns process
2. **FR-2**: `EmulatorRegistry`: static mapping from `system_id` to `EmulatorDef` (exe paths, launch args)
3. **FR-3**: EmuDeck detection: checks `%APPDATA%/emudeck/Emulators/{name}/{exe}` on Windows
4. **FR-4**: RetroArch launch: `retroarch.exe -L {cores_dir}/{core}.dll "{rom}"`
5. **FR-5**: Standalone: Dolphin `--batch --exec=`, PCSX2 direct, PPSSPP direct, DuckStation direct
6. **FR-6**: `play_count` incremented and `last_played` set after successful launch
7. **FR-7**: Clear error message when emulator not found (guides user to Settings)
8. **FR-8**: `get_emulator_status(system_id)` returns detected emulator path

## Acceptance Criteria
- [x] Selecting a game and pressing Enter/A opens the emulator with the ROM
- [x] EmuDeck emulators auto-detected on Windows
- [x] Play count and last_played updated in SQLite after launch
- [x] Error toast shown when emulator not found

## Dependencies
- Depends on: REQ-001, REQ-002, REQ-003
