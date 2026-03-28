---
id: DES-003
title: "ROM Scanner Design"
status: IMPLEMENTED
req: REQ-003
author: architect
created: 2026-03-28
updated: 2026-03-28
tags: [backend, scanner]
---

# DES-003: ROM Scanner Design

## Overview
`commands/scanner.rs` contains `scan_library` which walks `{data_root}/roms/` using `walkdir`, matches each folder to a `SystemDef` from the registry, scans ROM files, parses `gamelist.xml` with `quick-xml`, and upserts everything into SQLite.

## System Registry (20+ systems)
Static `Vec<SystemDef>` with `folder_names`, `extensions`, and metadata per system:
- NES, SNES, N64, GB, GBC, GBA, NDS, GameCube, Wii, WiiU, Switch
- PS1, PS2, PS3, PSP
- Genesis, Master System, Saturn, Dreamcast
- Xbox, Arcade (MAME)

## Database Schema
```sql
CREATE TABLE systems (id, name, full_name, extensions JSON, game_count, rom_path);
CREATE TABLE games (id, system_id, title, file_path, file_name, file_size,
  box_art, description, developer, publisher, year, genre, players, rating,
  last_played, play_count, favorite, created_at);
```

## Game ID
`blake3::hash(file_path.as_bytes()).to_hex()[..16]` — stable, path-based, 16-char hex

## gamelist.xml Import
Parsed with `quick-xml` event-based reader. Maps `<path>` filename → `GamelistMeta` struct containing name, desc, developer, publisher, releasedate (→ year), genre, players, rating.

## Box Art Discovery
Checks `{system_folder}/downloaded_images/{file_stem}.{png,jpg,jpeg,webp}`

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-003-01 | SQLite schema (systems + games) | S | TASK-001-03 |
| TASK-003-02 | System registry (SystemDef + detect_system) | S | TASK-001-01 |
| TASK-003-03 | Scanner service (walkdir + file matching) | M | TASK-003-01,02 |
| TASK-003-04 | gamelist.xml quick-xml parser | M | TASK-003-03 |
| TASK-003-05 | scan_library Tauri command + progress events | S | TASK-003-04 |
