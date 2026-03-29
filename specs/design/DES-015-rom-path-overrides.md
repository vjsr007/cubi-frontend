---
id: DES-015
title: "Per-System ROM Path Overrides — Design"
status: IMPLEMENTED
req: REQ-015
author: "copilot"
created: 2026-03-29
updated: 2026-03-29
tags: [scanner, database, tauri-commands, ui]
---

# DES-015: Per-System ROM Path Overrides — Design

## Overview
This design adds a per-system ROM path override mechanism. Users can redirect where the scanner looks for ROMs on a system-by-system basis. The default remains `{data_root}/roms/{system_folder}`, but any system can be pointed to an arbitrary directory.

## Architecture Decision

### Approach: Database-Persisted Overrides + Two-Phase Scanner
- Store overrides in a dedicated SQLite table (`system_rom_paths`)
- Refactor the scanner into two phases:
  - **Phase 1 (Override)**: Scan systems that have custom paths using those paths
  - **Phase 2 (Default)**: Walk the default `roms/` directory for systems not already scanned
- Expose override CRUD via Tauri commands
- Build a dedicated React page for managing paths

**Why this approach:**
- Database storage survives config reloads; no TOML pollution for per-system data
- Two-phase scanner cleanly separates custom vs default discovery
- System registry (21 known systems) is already in the scanner module

## Data Models

### Rust Structs

```rust
// src-tauri/src/commands/rom_paths.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemDefInfo {
    pub id: String,              // e.g., "psx"
    pub name: String,            // e.g., "PlayStation"
    pub folder: String,          // e.g., "psx"
    pub extensions: Vec<String>, // e.g., [".bin", ".cue", ".iso"]
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RomPathOverride {
    pub system_id: String,
    pub custom_path: String,
}
```

### TypeScript Interfaces

```typescript
// src/types/index.ts

export interface SystemDefInfo {
  id: string;
  name: string;
  folder: string;
  extensions: string[];
}

export interface RomPathOverride {
  system_id: string;
  custom_path: string;
}
```

## API Design (Tauri Commands)

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `get_system_registry_list` | — | `Vec<SystemDefInfo>` | Returns all 21 known systems from the registry |
| `get_rom_path_overrides` | — | `Vec<RomPathOverride>` | Returns all custom path overrides |
| `set_rom_path_override` | `system_id: String, custom_path: String` | `()` | Sets/updates a custom path (validates exists + is_dir) |
| `delete_rom_path_override` | `system_id: String` | `()` | Removes a custom path, reverting to default |

### Validation Rules
- `set_rom_path_override` checks `Path::new(&custom_path).exists()` and `.is_dir()`
- Returns descriptive error if path is invalid

## Database Schema

```sql
-- Added to src-tauri/src/db/schema.rs

CREATE TABLE IF NOT EXISTS system_rom_paths (
    system_id   TEXT PRIMARY KEY,
    custom_path TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### DB Methods (in `Database`)
- `get_rom_path_overrides() -> Result<HashMap<String, String>>` — SELECT all rows as map
- `set_rom_path_override(system_id, custom_path) -> Result<()>` — INSERT OR REPLACE
- `delete_rom_path_override(system_id) -> Result<()>` — DELETE by system_id

## Scanner Integration

### Before (single-phase)
```
walk {data_root}/roms/ → for each subdir, match system → scan ROMs
```

### After (two-phase)
```
Phase 1: Load overrides from DB
         For each override: scan_system_folder(custom_path, system_def)
         Track scanned system IDs in a Set

Phase 2: Walk {data_root}/roms/
         For each subdir: skip if system already scanned in Phase 1
         Otherwise: scan_system_folder(subdir_path, system_def)
```

### Extracted Helper
```rust
fn scan_system_folder(
    folder_path: &Path,
    system: &SystemDef,
    db: &Database,
    gamelist_data: &HashMap<String, GamelistEntry>,
) -> Vec<Game>
```

## UI Design

### RomPathsPage Layout
```
┌──────────────────────────────────────────┐
│ 📁 ROM Path Overrides                   │
│ [Back] [Search filter input]             │
├──────────────────────────────────────────┤
│ ℹ️ Info box explaining override behavior │
├──────────────────────────────────────────┤
│ System Name     Path              Action │
│ ─────────────── ───────────────── ────── │
│ 🟢 SNES         DEFAULT           [Edit] │
│ 🟡 PlayStation   D:\Games\PSX     [Reset]│
│ 🟢 N64          DEFAULT           [Edit] │
│ ...                                       │
└──────────────────────────────────────────┘
```

### States
- **DEFAULT**: Shows `{data_root}/roms/{folder}` as grey text with "Edit" button
- **CUSTOM**: Shows override path with green badge and "Reset" button
- **Editing**: Inline input field + "Browse" button (OS folder dialog) + "Save"/"Cancel"

### Navigation
- Settings page has a "📁 ROM Paths" button → navigates to `rom-paths` page
- Both Default and HyperSpin themes register the page

## Task Breakdown
- TASK-015-01: Database schema + CRUD methods
- TASK-015-02: Tauri commands for ROM path CRUD
- TASK-015-03: Scanner refactoring (two-phase approach)
- TASK-015-04: Frontend RomPathsPage UI + navigation integration
