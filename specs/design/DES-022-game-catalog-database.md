---
id: DES-022
title: "Game Catalog Database"
status: DRAFT
req: REQ-022
author: "vjsr007"
created: 2026-04-01
updated: 2026-04-01
tags: [backend, ui, database, metadata]
---

# DES-022: Game Catalog Database

## Overview
A local SQLite catalog of all known games per system, sourced from No-Intro and Redump DAT files, with on-demand sync, ownership matching against the user's ROM library, and a dedicated browse screen with configurable download URLs. The design prioritizes offline-first operation, bulk import performance, and minimal impact on the existing codebase.

## Parent Requirement
- **REQ**: [REQ-022 — Game Catalog Database](../requirements/REQ-022-game-catalog-database.md)

## Architecture Decision

### Approach
Store catalog data in a new `catalog_games` table within the existing `cubi.db` SQLite database. A new Rust service (`catalog_service`) handles DAT file parsing (No-Intro XML via quick-xml, Redump via ClrMamePro text format), bulk import via transactions, and ownership matching. The frontend gets a new `/catalog` page with system-level browsing, filters, and search.

**Ownership matching strategy**: Since the existing `games` table does not store SHA-1/CRC32 hashes (only BLAKE3 of file paths for IDs), matching will use **filename stem normalization** as the primary strategy — strip region tags, revision numbers, and common suffixes, then compare. A secondary exact filename match provides high-confidence results. Future enhancement: optionally hash ROMs with SHA-1 during scan for exact DAT matching.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **A: Same SQLite DB, new table** | Simple, single DB file, existing patterns | Slightly larger DB | **Selected** |
| B: Separate catalog.db | Isolation, easy to delete/replace | Two DB connections, cross-DB queries impossible | Rejected |
| C: In-memory DAT parsing, no persistence | Zero storage, always fresh | Slow startup, requires DAT files on disk always | Rejected |
| **Matching: Filename-based** | Works now, no scanner changes needed | Less precise than hash matching | **Selected (phase 1)** |
| Matching: SHA-1 hash | Exact matching, industry standard | Requires scanner changes + re-scan of all ROMs | Deferred to phase 2 |

## Data Models

### Rust (src-tauri)

```rust
// src-tauri/src/models/catalog.rs

/// A game entry from a DAT file (No-Intro or Redump)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogGame {
    pub id: String,              // SHA-256 of (system_id + dat_name + sha1/filename)
    pub system_id: String,
    pub title: String,
    pub region: String,          // "(USA)", "(Europe)", "(Japan)", etc.
    pub sha1: Option<String>,
    pub md5: Option<String>,
    pub crc32: Option<String>,
    pub file_size: Option<u64>,
    pub file_name: String,       // Original ROM filename from DAT
    pub dat_name: String,        // Source DAT identifier (e.g., "No-Intro - SNES")
    pub owned: bool,             // Computed: does user have this ROM?
    pub owned_game_id: Option<String>, // Link to games.id if owned
}

/// Metadata about a synced DAT source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSync {
    pub system_id: String,
    pub dat_name: String,
    pub dat_version: String,
    pub entry_count: u32,
    pub last_synced: String,     // ISO 8601
    pub source_url: Option<String>,
}

/// Stats for a system's catalog
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogSystemStats {
    pub system_id: String,
    pub system_name: String,
    pub total: u32,
    pub owned: u32,
    pub missing: u32,
    pub last_synced: Option<String>,
}

/// Paginated query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogPage {
    pub games: Vec<CatalogGame>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
}

/// Filter parameters for catalog queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogFilter {
    pub system_id: String,
    pub status: Option<String>,      // "owned" | "missing" | null (all)
    pub region: Option<String>,      // Filter by region tag
    pub search: Option<String>,      // Title search
    pub page: u32,
    pub page_size: u32,
}

/// Config section for catalog feature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogConfig {
    pub dat_source_url: String,
    pub auto_sync: bool,
    pub download_urls: HashMap<String, String>, // system_id -> base URL
}
```

### TypeScript (src)

```typescript
// src/types/index.ts (additions)

export interface CatalogGame {
  id: string;
  system_id: string;
  title: string;
  region: string;
  sha1?: string;
  md5?: string;
  crc32?: string;
  file_size?: number;
  file_name: string;
  dat_name: string;
  owned: boolean;
  owned_game_id?: string;
}

export interface CatalogSync {
  system_id: string;
  dat_name: string;
  dat_version: string;
  entry_count: number;
  last_synced: string;
  source_url?: string;
}

export interface CatalogSystemStats {
  system_id: string;
  system_name: string;
  total: number;
  owned: number;
  missing: number;
  last_synced?: string;
}

export interface CatalogPage {
  games: CatalogGame[];
  total: number;
  page: number;
  page_size: number;
}

export interface CatalogFilter {
  system_id: string;
  status?: 'owned' | 'missing';
  region?: string;
  search?: string;
  page: number;
  page_size: number;
}

export interface CatalogConfig {
  dat_source_url: string;
  auto_sync: boolean;
  download_urls: Record<string, string>;
}
```

## API Design (Tauri Commands)

### Command: `get_catalog_stats`
Returns per-system catalog stats (total/owned/missing counts).
```rust
#[tauri::command]
fn get_catalog_stats(db: State<Database>) -> Result<Vec<CatalogSystemStats>, String>
```
```typescript
api.getCatalogStats() => Promise<CatalogSystemStats[]>
```

### Command: `get_catalog_games`
Paginated, filtered query of catalog entries for a system.
```rust
#[tauri::command]
fn get_catalog_games(db: State<Database>, filter: CatalogFilter) -> Result<CatalogPage, String>
```
```typescript
api.getCatalogGames(filter: CatalogFilter) => Promise<CatalogPage>
```

### Command: `sync_catalog`
Downloads and imports DAT file for a system (or all systems). Emits progress events.
```rust
#[tauri::command]
async fn sync_catalog(
    app: AppHandle,
    db: State<'_, Database>,
    system_id: Option<String>,  // None = sync all
) -> Result<Vec<CatalogSync>, String>
```
```typescript
api.syncCatalog(systemId?: string) => Promise<CatalogSync[]>
```

### Command: `import_dat_file`
Import a local DAT file the user provides manually.
```rust
#[tauri::command]
fn import_dat_file(db: State<Database>, system_id: String, file_path: String) -> Result<CatalogSync, String>
```
```typescript
api.importDatFile(systemId: string, filePath: string) => Promise<CatalogSync>
```

### Command: `refresh_catalog_ownership`
Re-runs ownership matching for all or one system (called after ROM scan).
```rust
#[tauri::command]
fn refresh_catalog_ownership(db: State<Database>, system_id: Option<String>) -> Result<u32, String>
```
```typescript
api.refreshCatalogOwnership(systemId?: string) => Promise<number>
```

### Command: `get_catalog_config` / `set_catalog_download_url`
```rust
#[tauri::command]
fn get_catalog_config() -> Result<CatalogConfig, String>

#[tauri::command]
fn set_catalog_download_url(system_id: String, url: String) -> Result<(), String>
```

## Database Schema

```sql
-- Schema migration v5
CREATE TABLE IF NOT EXISTS catalog_games (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    title TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT '',
    sha1 TEXT,
    md5 TEXT,
    crc32 TEXT,
    file_size INTEGER,
    file_name TEXT NOT NULL,
    dat_name TEXT NOT NULL,
    owned INTEGER NOT NULL DEFAULT 0,
    owned_game_id TEXT,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_system ON catalog_games(system_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sha1 ON catalog_games(sha1);
CREATE INDEX IF NOT EXISTS idx_catalog_title ON catalog_games(title);
CREATE INDEX IF NOT EXISTS idx_catalog_owned ON catalog_games(system_id, owned);
CREATE INDEX IF NOT EXISTS idx_catalog_region ON catalog_games(system_id, region);

CREATE TABLE IF NOT EXISTS catalog_sync (
    system_id TEXT NOT NULL,
    dat_name TEXT NOT NULL,
    dat_version TEXT NOT NULL DEFAULT '',
    entry_count INTEGER NOT NULL DEFAULT 0,
    last_synced TEXT DEFAULT (datetime('now')),
    source_url TEXT,
    PRIMARY KEY (system_id, dat_name)
);
```

### Ownership Matching Algorithm

```
For each catalog_game in system:
  1. Exact filename match:
     SELECT id FROM games WHERE system_id = ? AND file_name = catalog.file_name
  2. Normalized stem match (fallback):
     - Strip region tags: "(USA)", "(Europe,Japan)", etc.
     - Strip revision: "(Rev 1)", "(v1.1)", etc.
     - Strip articles: "The ", "A "
     - Lowercase + trim
     - Compare normalized stems
  3. Future: SHA-1 hash match (when games table stores sha1)
```

## UI Design

### Catalog Page — System Overview

```
┌─────────────────────────────────────────────────┐
│  📚 Game Catalog                    [Sync All]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  SNES    │ │  NES     │ │  GBA     │        │
│  │  732/847 │ │  421/712 │ │  890/1538│        │
│  │  86%     │ │  59%     │ │  58%     │        │
│  │ ████░░░░ │ │ ████░░░░ │ │ ████░░░░ │        │
│  │ Synced:  │ │ Synced:  │ │ Synced:  │        │
│  │ Mar 2026 │ │ Mar 2026 │ │ Never    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  PS1     │ │  Genesis │ │  N64     │        │
│  │  ...     │ │  ...     │ │  ...     │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Catalog Page — System Detail (games list)

```
┌─────────────────────────────────────────────────┐
│  ← Back    SNES (732/847 owned)   [Sync] [⚙URL]│
├─────────────────────────────────────────────────┤
│  🔍 Search...     [All ▾] [Region ▾]           │
├─────────────────────────────────────────────────┤
│  Title                  │Region│Status│ Action  │
│─────────────────────────┼──────┼──────┼─────────│
│  Chrono Trigger         │ USA  │  ✅  │  View   │
│  EarthBound             │ USA  │  ❌  │  ⬇ DL   │
│  Final Fantasy VI       │ USA  │  ✅  │  View   │
│  Super Mario RPG        │ USA  │  ❌  │  ⬇ DL   │
│  Terranigma             │ EUR  │  ❌  │  ⬇ DL   │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  Page 1 of 17          [◄ Prev] [Next ►]       │
└─────────────────────────────────────────────────┘
```

### Component Tree

```
CatalogPage
├── CatalogHeader (title + "Sync All" button)
├── CatalogOverview (grid of system cards)
│   └── CatalogSystemCard (repeated, shows stats + progress bar)
└── CatalogSystemDetail (shown when system selected)
    ├── CatalogToolbar (back, sync, URL config, search, filters)
    ├── CatalogGameList (virtual-scrolled table)
    │   └── CatalogGameRow (title, region, status badge, action button)
    └── CatalogPagination (page controls)
```

### Gamepad Navigation Flow

1. System overview: D-pad moves between system cards (grid spatial nav)
2. A button selects system → opens detail view
3. B button returns to overview
4. Detail view: D-pad navigates rows, shoulder buttons change pages
5. A on owned game → navigate to game detail
6. A on missing game → open download URL in browser
7. Y button → toggle filter (All/Owned/Missing cycle)
8. Start button → trigger sync for current system

## DAT File Parsing

### No-Intro XML Format
```xml
<?xml version="1.0"?>
<datafile>
  <header>
    <name>Nintendo - Super Nintendo Entertainment System</name>
    <version>20260315-091234</version>
  </header>
  <game name="Chrono Trigger (USA)">
    <rom name="Chrono Trigger (USA).sfc" size="4194304"
         crc="2D5B6A24" md5="..." sha1="DA12F20..." />
  </game>
  <!-- ... thousands more -->
</datafile>
```

### Redump DAT (ClrMamePro Text Format)
```
clrmamepro (
	name "Sony - PlayStation"
	version "20260320"
)

game (
	name "Final Fantasy VII (USA) (Disc 1)"
	rom ( name "Final Fantasy VII (USA) (Disc 1).bin" size 734003200 crc ABCD1234 md5 ... sha1 ... )
	rom ( name "Final Fantasy VII (USA) (Disc 1).cue" size 124 crc ... md5 ... sha1 ... )
)
```

### Parser Design
- **No-Intro**: Use existing `quick-xml` reader pattern from `gamelist_service.rs`
- **Redump**: Simple line-based text parser — read line by line, match patterns with string operations (no regex needed for the structured format)
- Both parsers return `Vec<CatalogGame>` for bulk insert

## File Structure

```
New/modified files:
├── src-tauri/src/
│   ├── models/catalog.rs           # NEW — CatalogGame, CatalogSync, CatalogFilter structs
│   ├── models/mod.rs               # MODIFY — add pub mod catalog
│   ├── services/catalog_service.rs # NEW — DAT parsing, ownership matching, sync logic
│   ├── services/mod.rs             # MODIFY — add pub mod catalog_service
│   ├── commands/catalog.rs         # NEW — Tauri IPC commands
│   ├── commands/mod.rs             # MODIFY — add pub mod catalog
│   ├── db/schema.rs                # MODIFY — add migration v5 (catalog tables)
│   ├── db/mod.rs                   # MODIFY — add catalog CRUD methods
│   ├── models/config.rs            # MODIFY — add CatalogConfig to AppConfig
│   └── lib.rs                      # MODIFY — register catalog commands
├── src/
│   ├── types/index.ts              # MODIFY — add Catalog types + 'catalog' to Page
│   ├── lib/invoke.ts               # MODIFY — add catalog API wrappers
│   ├── pages/CatalogPage.tsx       # NEW — main catalog page
│   ├── components/catalog/
│   │   ├── CatalogSystemCard.tsx   # NEW — system stats card
│   │   ├── CatalogGameList.tsx     # NEW — game list with filters
│   │   └── CatalogGameRow.tsx      # NEW — single game row
│   ├── components/layout/Sidebar.tsx       # MODIFY — add catalog nav item
│   ├── themes/default/index.tsx            # MODIFY — add CatalogPage render
│   ├── themes/aurora/index.tsx             # MODIFY — add CatalogPage render
│   └── themes/hyperspin/index.tsx          # MODIFY — add CatalogPage render
```

## Task Breakdown

| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-022-01 | Database schema & models | M | — |
| TASK-022-02 | DAT file parsers (No-Intro XML + Redump text) | L | TASK-022-01 |
| TASK-022-03 | Catalog service (sync, import, ownership matching) | L | TASK-022-01, TASK-022-02 |
| TASK-022-04 | Tauri commands + config integration | M | TASK-022-03 |
| TASK-022-05 | Frontend types, API wrappers, navigation | S | TASK-022-04 |
| TASK-022-06 | Catalog page — system overview UI | M | TASK-022-05 |
| TASK-022-07 | Catalog page — system detail with filters + pagination | L | TASK-022-06 |
| TASK-022-08 | Download URL configuration + browser open | S | TASK-022-07 |
| TASK-022-09 | Post-scan ownership refresh hook | S | TASK-022-04 |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DAT source URLs change or go offline | Medium | Allow user-configurable source URL; support local file import as fallback |
| Large DATs (30K+ entries) slow to import | Medium | Bulk INSERT in single transaction with prepared statements; target < 10s |
| Filename matching produces false positives | Low | Normalize carefully; show match confidence; prefer exact matches |
| Redump DAT format varies across versions | Low | Parser handles common variations; log and skip unparseable entries |
| Catalog DB grows large with all systems | Low | Indexes on system_id, title, sha1; pagination on frontend |

## Testing Strategy

- **Unit tests (Rust)**:
  - `test_parse_nointro_xml` — parse sample No-Intro DAT, verify entry count and fields
  - `test_parse_redump_dat` — parse sample Redump DAT, verify multi-ROM games
  - `test_ownership_exact_filename` — exact match by filename
  - `test_ownership_normalized` — match with region/revision stripping
  - `test_bulk_import_performance` — 30K entries in < 10s
  - `test_region_extraction` — parse region tags correctly
- **Integration tests**:
  - Import DAT → query catalog → verify stats
  - Import DAT → scan ROMs → verify ownership matching
- **Manual tests**:
  - Sync catalog for SNES → browse → filter owned/missing
  - Configure download URL → click download link → opens browser
  - Gamepad navigation through catalog overview and detail screens
