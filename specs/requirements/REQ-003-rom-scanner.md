---
id: REQ-003
title: "ROM Scanner & System Detection"
status: IMPLEMENTED
author: architect
created: 2026-03-28
updated: 2026-03-28
priority: P1
tags: [backend, scanner]
---

# REQ-003: ROM Scanner & System Detection

## Summary
Walks `{data_root}/roms/{system}/` directories, identifies game systems from folder names and file extensions, imports `gamelist.xml` metadata, detects box art, and indexes everything into SQLite.

## User Stories
- **As a user**, I want to scan my ROM folder so all my games appear in the library
- **As a user**, I want EmulationStation metadata imported so my games have titles and descriptions

## Functional Requirements
1. **FR-1**: `scan_library(data_root)` command walks `{data_root}/roms/` top-level dirs
2. **FR-2**: System detection via static registry mapping folder names → `SystemDef` (20+ systems)
3. **FR-3**: File extension filtering per system (e.g., `.nes` for NES, `.iso` for PS2)
4. **FR-4**: Each game gets a unique ID (BLAKE3 hash of file path, first 16 hex chars)
5. **FR-5**: Results stored in SQLite `systems` and `games` tables via upsert
6. **FR-6**: Scan progress emitted as Tauri `scan-progress` events to frontend
7. **FR-7**: `gamelist.xml` metadata parsed with `quick-xml` and applied to games
8. **FR-8**: Box art auto-detected from `{system_folder}/downloaded_images/{stem}.png`

## Non-Functional Requirements
1. **NFR-1**: Handle 1000+ ROMs without timeout
2. **NFR-2**: Incremental upsert — re-scan doesn't lose play history

## Acceptance Criteria
- [x] Scanning `E:\Emulation\roms\` detects systems correctly
- [x] Games appear in DB after scan with correct system_id
- [x] `gamelist.xml` metadata applied (title, description, year, genre)
- [x] Box art paths stored in `games.box_art` column

## Dependencies
- Depends on: REQ-001, REQ-002
