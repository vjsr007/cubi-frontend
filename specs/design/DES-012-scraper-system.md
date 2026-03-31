---
id: DES-012
title: "Scraper System"
status: IMPLEMENTED
req: REQ-012
author: "vjsr007"
created: 2026-03-31
updated: 2026-03-31
tags: [scraper, backend, frontend, api]
---

# DES-012: Scraper System

## Overview

The Scraper System enables users to fetch game metadata (title, description, developer, publisher, year, genre, players, rating) and media assets (box art, screenshots, fanart, title screens, wheels, marquees, videos) from multiple online scraper APIs. It supports three fully implemented backends -- ScreenScraper, TheGamesDB, and Libretro Thumbnails -- with three additional backends registered but not yet implemented (IGDB, MobyGames, ArcadeDB). Scraper configurations are persisted in SQLite with a seeded set of defaults on first run. Jobs run asynchronously with real-time progress events emitted to the frontend via Tauri events.

## Parent Requirement

**REQ-012** -- Scraper System (requirement spec not found in repository; this design was reverse-engineered from the implementation).

## Architecture Decision

### Multi-backend Strategy

Each scraper backend is a separate Rust module (`screenscraper.rs`, `thegamesdb.rs`, `libretro.rs`) that implements a common pattern: accept a game + config, return parsed metadata and/or media URLs. A central `scraper_service.rs` orchestrates job execution, dispatching to the correct backend based on `config.id`.

### Cancellation

A global `AtomicBool` cancel flag (stored in a `OnceLock<Arc<AtomicBool>>`) allows a single active scrape job to be cancelled from the frontend. The flag is checked between each game in the loop.

### Media Storage

Downloaded media is stored under the Tauri app data directory at `{app_data_dir}/media/{system_id}/{media_type}/{sanitized_rom_name}.{ext}`. Media type folder names are normalized across scrapers (e.g., `box2dfront`, `screenshots`, `fanart`, `titlescreens`, `wheel`, `marquees_bak`, `videos`).

### ES-DE Credential Import

A dedicated command (`import_esde_credentials`) reads `es_settings.xml` from known EmulationStation / ES-DE installation paths and extracts ScreenScraper username/password, allowing users to reuse existing credentials without re-entering them.

### Game Matching

- **ScreenScraper**: CRC32 hash of the ROM file + ROM filename + system ID for accurate matching.
- **TheGamesDB**: Title-based search filtered by platform ID, takes the first result.
- **Libretro**: Constructs deterministic URLs from the game title using Libretro's naming conventions.

## Data Models

### Rust (`src-tauri/src/models/scraper.rs`)

```rust
pub struct ScraperConfig {
    pub id: String,              // e.g., "screenscraper", "thegamesdb", "libretro"
    pub name: String,            // Display name
    pub url: String,             // Base API URL
    pub api_key: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub enabled: bool,
    pub priority: i32,           // Lower = higher priority, used for sort order
    pub supports: Vec<String>,   // e.g., ["box_art","screenshot","video","metadata"]
    pub requires_credentials: bool,
    pub credential_hint: Option<String>,
}

pub enum ScrapeFilter {
    All,           // Scrape everything
    ImagesOnly,    // Only download images
    VideosOnly,    // Only download videos
    MetadataOnly,  // Only update text metadata
    MissingOnly,   // Skip games that already have metadata + box art
}

pub struct ScrapeJob {
    pub scraper_id: String,
    pub system_id: Option<String>,     // None = all systems
    pub game_ids: Option<Vec<String>>, // None = all games in scope
    pub filter: ScrapeFilter,
    pub overwrite: bool,
}

pub struct ScrapeProgress {
    pub total: usize,
    pub current: usize,
    pub game_title: String,
    pub status: String,        // "scraping" or "done"
    pub errors: Vec<String>,
    pub done: bool,
}

pub struct ScrapeResult {
    pub scraped: usize,
    pub skipped: usize,
    pub errors: usize,
    pub messages: Vec<String>,
}
```

### TypeScript (`src/types/index.ts`)

Mirrors the Rust models exactly with TypeScript interfaces:
- `ScraperConfig` -- same fields, optional fields use `?`
- `ScrapeFilter` -- union type: `'all' | 'images_only' | 'videos_only' | 'metadata_only' | 'missing_only'`
- `ScrapeJob`, `ScrapeProgress`, `ScrapeResult` -- matching interfaces

### Backend-specific Data Structures (not exported via IPC)

- `SsGameData` + `SsMedia` (ScreenScraper) -- parsed metadata + media URL list with type/format info
- `TgdbGameData` (TheGamesDB) -- parsed metadata + separate URL fields for box art front/back, screenshots, fanart
- `LibretroThumbnails` -- box art, snap, and title screen URLs

## API Design (Tauri Commands)

| Command | Signature | Description |
|---------|-----------|-------------|
| `get_scrapers` | `() -> Vec<ScraperConfig>` | List all scraper configs from DB, ordered by priority |
| `add_scraper` | `(scraper: ScraperConfig) -> ()` | Insert or update a scraper config |
| `update_scraper` | `(scraper: ScraperConfig) -> ()` | Update a scraper config (same as add -- upsert) |
| `delete_scraper` | `(id: String) -> ()` | Remove a scraper config |
| `run_scrape_job` | `(job: ScrapeJob) -> ScrapeResult` | Execute a scrape job; emits `scrape-progress` events |
| `cancel_scrape_job` | `() -> ()` | Set the cancel flag for the active job |
| `import_esde_credentials` | `() -> EsDECredentials` | Read ES-DE settings and return extracted credentials |

### Tauri Events

| Event | Payload | Description |
|-------|---------|-------------|
| `scrape-progress` | `ScrapeProgress` | Emitted per-game during a scrape job; `done: true` signals completion |

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS scrapers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    api_key TEXT,
    username TEXT,
    password TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    supports TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
    requires_credentials INTEGER NOT NULL DEFAULT 0,
    credential_hint TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

Six default scrapers are seeded on first run via `default_scrapers()`: ScreenScraper (priority 1), TheGamesDB (priority 2), Libretro Thumbnails (priority 3), IGDB (priority 4, disabled), MobyGames (priority 5, disabled), ArcadeDB (priority 6, disabled).

Scraped metadata is written directly into the existing `games` table via `db.upsert_game()`, updating fields like `title`, `description`, `developer`, `publisher`, `year`, `genre`, `players`, `rating`, and `box_art`.

## UI Design

### Page: `ScraperPage` (`src/pages/ScraperPage.tsx`)

Two-tab layout:
- **Emuladores tab**: Master-detail split-pane for managing scraper configs and running jobs.
- **PC Games tab**: Delegates to `PcScraperSettings` component (separate feature).

Header includes a back button (navigates to settings), tab switcher, and an "Import from ES-DE" button that auto-imports ScreenScraper credentials.

### Components (`src/components/scraper/`)

| Component | Purpose |
|-----------|---------|
| `ScraperList` | Left sidebar listing all scrapers sorted by priority. Shows name, priority badge, support icons, and enable/edit/delete controls. |
| `ScraperForm` | Add/edit form for scraper config. Fields: name, ID (read-only on edit), URL, API key, priority, username, password (with show/hide toggle), supported media types (toggle chips), enabled/requires-credentials checkboxes. |
| `ScrapeJobPanel` | Right panel when a scraper is selected. Provides system selector dropdown, filter radio buttons (All/Images/Videos/Metadata/Missing), overwrite checkbox, run/cancel buttons, progress bar with current game name and count, and result summary with message log. |

### State Management: `scraperStore` (`src/stores/scraperStore.ts`)

Zustand store holding: `scrapers[]`, `loading`, `jobRunning`, `progress`, `lastResult`, `error`. Actions: `loadScrapers`, `addScraper`, `updateScraper`, `deleteScraper`, `setProgress`, `setJobRunning`, `setLastResult`, `setError`. The store calls backend commands via the `api` helper module.

### Real-time Progress

`ScrapeJobPanel` subscribes to Tauri's `scrape-progress` event via `@tauri-apps/api/event.listen()`. Progress is displayed as a bar with percentage, current/total count, and the current game title.

## System ID Mappings

All three implemented scrapers maintain their own system-ID-to-platform-ID mapping functions covering 30+ systems:

- `screenscraper::ss_system_id()` -- maps to ScreenScraper numeric system IDs
- `thegamesdb::tgdb_platform_id()` -- maps to TheGamesDB platform IDs
- `libretro::libretro_playlist_name()` -- maps to Libretro thumbnail playlist folder names

## File Structure

```
src-tauri/src/
  commands/scraper.rs          # Tauri IPC commands + ES-DE credential import
  services/scraper_service.rs  # Job orchestration, per-game dispatch, media download
  services/screenscraper.rs    # ScreenScraper API client (CRC32 matching, JSON parsing)
  services/thegamesdb.rs       # TheGamesDB API client (name search, image fetching)
  services/libretro.rs         # Libretro Thumbnails URL builder + downloader
  models/scraper.rs            # Data models + default scraper seed data
  db/schema.rs                 # scrapers table DDL
  db/mod.rs                    # CRUD operations (get/upsert/delete) + seed logic

src/
  pages/ScraperPage.tsx        # Scraper management page (two tabs)
  components/scraper/
    ScraperList.tsx             # Scraper list sidebar component
    ScraperForm.tsx             # Add/edit scraper form
    ScrapeJobPanel.tsx          # Job runner with progress + results
  stores/scraperStore.ts       # Zustand store for scraper state
  types/index.ts               # TypeScript type definitions
```

## Task Breakdown (Retroactive)

| Task | Description | Status |
|------|-------------|--------|
| TASK-012-01 | Define data models (`ScraperConfig`, `ScrapeJob`, `ScrapeFilter`, `ScrapeProgress`, `ScrapeResult`) | DONE |
| TASK-012-02 | Create `scrapers` SQLite table + CRUD operations + default seed data | DONE |
| TASK-012-03 | Implement Tauri commands (`get/add/update/delete_scraper`, `run/cancel_scrape_job`) | DONE |
| TASK-012-04 | Implement ScreenScraper backend (CRC32 matching, metadata parsing, media download) | DONE |
| TASK-012-05 | Implement TheGamesDB backend (name search, image fetching, metadata parsing) | DONE |
| TASK-012-06 | Implement Libretro Thumbnails backend (URL construction, image download) | DONE |
| TASK-012-07 | Implement scraper service orchestration (job loop, filter logic, cancel flag, progress events) | DONE |
| TASK-012-08 | Build frontend UI (ScraperPage, ScraperList, ScraperForm, ScrapeJobPanel) | DONE |
| TASK-012-09 | Build Zustand store + TypeScript types for scraper state | DONE |
| TASK-012-10 | Implement ES-DE credential import (parse `es_settings.xml`, apply to ScreenScraper config) | DONE |
| TASK-012-11 | Register IGDB, MobyGames, ArcadeDB as default scrapers (backends not yet implemented) | DONE |
