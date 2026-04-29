---
id: DES-024
title: "Store Cloud Library Design"
status: DRAFT
req: REQ-024
author: "architect"
created: 2026-04-28
updated: 2026-04-28
tags: [backend, pc, steam, epic, gog, xbox, ui, api, database, cache]
---

# DES-024: Store Cloud Library Design

## Overview
This design extends the existing `pc_import_service` + `PcGamesPage` to fetch and display the **full owned library** from Steam, Epic, GOG, and Xbox — not just locally installed games. The key additions are:

1. **Per-store cloud fetchers** (Rust `async` functions using `reqwest`) that call each store's API.
2. **A 24-hour SQLite cache** for cloud game lists to avoid hammering APIs on every page load.
3. **Install-status enrichment** — each fetched game is flagged `installed: bool` by cross-referencing locally-detected games.
4. **Protocol URL launch** — uninstalled games open the store's own install dialog via `tauri-plugin-shell` `open()`.

## Parent Requirement
- **REQ**: [REQ-024 — Store Cloud Library](../requirements/REQ-024-store-cloud-library.md)

## Architecture Decision

### Approach
Extend the existing `pc_import_service.rs` with cloud-fetch variants alongside the current local-scan functions. Add a `cloud_cache` table to SQLite. The frontend `PcGamesPage` gets a new `installed` flag on `PcImportGame` and renders a badge accordingly.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Separate microservice / sidecar | Isolates API logic | Unnecessary complexity for desktop app | Rejected |
| SQLite cache only | No repeated API calls | Stale data; no refresh mechanism | Partial — use 24h TTL + manual refresh |
| Full in-app OAuth login UI per store | Best UX | Major scope; security complexity | Rejected — use locally-stored tokens |
| **reqwest + local token detection + SQLite cache** | Reuses existing patterns; minimal new surface | Token availability varies per user | **Selected** |

---

## Data Models

### Rust — extend `PcImportGame`
```rust
// src-tauri/src/services/pc_import_service.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PcImportGame {
    pub title: String,
    pub file_path: String,      // protocol URL if not installed, e.g. "steam://install/730"
    pub file_size: u64,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub source: String,          // "steam" | "epic" | "ea" | "gog" | "xbox" | "manual"
    pub source_id: String,
    pub install_path: Option<String>,
    pub box_art: Option<String>,
    pub installed: bool,         // NEW — false = owned but not installed
}
```

### Rust — Cloud cache table
```sql
CREATE TABLE IF NOT EXISTS pc_cloud_cache (
    store       TEXT NOT NULL,          -- "steam" | "epic" | "gog" | "xbox"
    game_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    box_art     TEXT,
    developer   TEXT,
    publisher   TEXT,
    protocol_url TEXT NOT NULL,
    fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (store, game_id)
);
```

### TypeScript — update type
```typescript
// src/types/index.ts
export interface PcImportGame {
  title: string;
  file_path: string;
  file_size: number;
  developer?: string;
  publisher?: string;
  source: PcGameSource;
  source_id: string;
  install_path?: string;
  box_art?: string;
  installed: boolean;   // NEW
}
```

---

## API Design (Tauri Commands)

### Extended command: `import_steam_games`
Now accepts optional `steam_id` parameter. If provided, calls Steam Web API; otherwise falls back to local-scan-only.
```rust
#[tauri::command]
pub async fn import_steam_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    steam_id: Option<String>,   // NEW — 64-bit SteamID or vanity URL
    force_refresh: Option<bool>,
) -> Result<Vec<PcImportGame>, String>
```

### Extended command: `import_epic_games`
Auto-detects Epic OAuth token from local filesystem.
```rust
#[tauri::command]
pub async fn import_epic_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,  // NEW
) -> Result<Vec<PcImportGame>, String>
```

### Extended command: `import_gog_games`
Auto-detects GOG Galaxy token from SQLite DB.
```rust
#[tauri::command]
pub async fn import_gog_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,  // NEW
) -> Result<Vec<PcImportGame>, String>
```

### Extended command: `import_xbox_games`
Reads Game Pass catalog + local UWP packages.
```rust
#[tauri::command]
pub async fn import_xbox_games(
    db: State<'_, Database>,
    sgdb_key: Option<String>,
    force_refresh: Option<bool>,  // NEW
) -> Result<Vec<PcImportGame>, String>
```

### New command: `clear_pc_cloud_cache`
```rust
#[tauri::command]
pub fn clear_pc_cloud_cache(db: State<'_, Database>, store: Option<String>) -> Result<(), String>
// store = None → clears all; store = Some("steam") → clears just Steam
```

---

## Database Schema

```sql
-- Migration added to db/migrations or applied at startup in db.rs
CREATE TABLE IF NOT EXISTS pc_cloud_cache (
    store        TEXT NOT NULL,
    game_id      TEXT NOT NULL,
    title        TEXT NOT NULL,
    box_art      TEXT,
    developer    TEXT,
    publisher    TEXT,
    protocol_url TEXT NOT NULL,
    fetched_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (store, game_id)
);
```

Cache TTL: rows older than 24 hours are considered stale. On fetch, if the youngest entry for a store is < 24 h old and `force_refresh` is false, return cached rows only.

---

## Service Design

### `steam_cloud_service.rs` (new)
```
fn resolve_steam_id(vanity: &str, api_key: &str) -> async Result<String>
  → GET https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/

fn get_owned_games(steam_id: &str, api_key: &str) -> async Result<Vec<SteamOwnedGame>>
  → GET https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/

pub fn merge_with_installed(owned: Vec<SteamOwnedGame>, installed_appids: &HashSet<String>) -> Vec<PcImportGame>
  → sets installed = true for appids that have a local appmanifest_*.acf
```

### `epic_cloud_service.rs` (new)
```
fn read_epic_token() -> Option<EpicCredentials>
  → reads %LOCALAPPDATA%\EpicGamesLauncher\Saved\Config\Windows\GameUserSettings.ini
  → parses [RememberMe] / AccountId / RememberMeData

fn get_epic_entitlements(token: &EpicCredentials) -> async Result<Vec<EpicGame>>
  → GET https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/public/assets/...
  → with Authorization: Bearer <access_token>
```

### `gog_cloud_service.rs` (new)
```
fn read_gog_token() -> Option<String>
  → reads access_token from GOG Galaxy SQLite DB:
    %LOCALAPPDATA%\GOG.com\Galaxy\storage\galaxy-2.0.db
    SELECT token FROM Authentication WHERE ...

fn get_gog_library(token: &str) -> async Result<Vec<GogGame>>
  → GET https://embed.gog.com/user/data/games (returns product IDs)
  → resolve titles: GET https://api.gog.com/products?ids=...&expand=downloads
```

### `xbox_cloud_service.rs` (new)
```
fn get_gamepass_catalog() -> async Result<Vec<XboxGame>>
  → GET https://catalog.gamepass.com/sigls/v2?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-US&market=US
  → (public endpoint, no auth required for catalog listing)

fn detect_installed_xbox_games() -> Vec<String>
  → Get-AppxPackage equivalent via winreg / filesystem scan of C:\XboxGames\
```

---

## UI Design

### `PcGamesPage` changes

#### Game row / card — `installed` badge
```
┌──────────────────────────────────────────────────────┐
│ [thumbnail] Game Title                    [INSTALLED] │  ← green badge
│ [thumbnail] Game Title 2              [NOT INSTALLED] │  ← grey badge + "↗ Install" link
│ [thumbnail] Game Title 3              [NOT INSTALLED] │
└──────────────────────────────────────────────────────┘
```

#### Badge styles
- **Installed**: `background: rgba(16,124,16,0.2)` + `color: #4ece4e` — `INSTALLED`
- **Not installed**: `background: rgba(255,255,255,0.07)` + `color: rgba(255,255,255,0.4)` — `NOT INSTALLED`

#### "Refresh library" button
Added next to the scan button in each tab header. Calls the command with `force_refresh: true`.

#### Steam settings section — new fields
Inside the existing Steam tab header card:
```
Steam ID  [____________________________]  (vanity URL or numeric 64-bit ID)
```
Shown only when `libraryStatus.steam_found === true`.

#### "Save to library" behavior
Only `installed: true` games are selectable for saving to the Cubi game library (can't launch an uninstalled game).
Uninstalled games show a subtle "click to install in Steam/Epic/GOG/Xbox" affordance instead.

---

## Implementation Plan

### TASK-024-01: SQLite cache schema + Rust DB helpers
Estimate: S
- Add `pc_cloud_cache` table migration in `db.rs`
- Add `upsert_cloud_cache(store, games)`, `read_cloud_cache(store, max_age_secs)`, `clear_cloud_cache(store)` helpers

### TASK-024-02: `steam_cloud_service.rs` — owned games via Steam Web API  
Estimate: M
- Resolve vanity URL → numeric SteamID
- `GetOwnedGames` API call
- Merge with installed ACF list → `PcImportGame { installed }`
- Cache write/read

### TASK-024-03: `epic_cloud_service.rs` — owned games via local OAuth token
Estimate: M
- Parse Epic credentials file
- Entitlements API call
- Merge with installed manifest list
- Cache write/read

### TASK-024-04: `gog_cloud_service.rs` — owned games via GOG Galaxy token
Estimate: M
- Read GOG Galaxy SQLite token
- `user/data/games` + `products` API calls
- Merge with installed path list
- Cache write/read

### TASK-024-05: `xbox_cloud_service.rs` — Game Pass catalog + installed detection
Estimate: L
- Game Pass catalog endpoint (public, no auth)
- UWP installed package detection (winreg + XboxGames directory)
- Merge + cache

### TASK-024-06: Update Tauri commands & `PcImportGame` model
Estimate: S
- Add `installed: bool` to `PcImportGame`
- Thread `db: State<Database>`, `steam_id`, `force_refresh` params through commands
- Register `clear_pc_cloud_cache` command in `lib.rs`

### TASK-024-07: Frontend — `PcGamesPage` badge + refresh UI
Estimate: M
- Add `installed` badge to game row
- Add `force_refresh` button per tab
- Steam ID input field in Steam tab header
- Disable "Save to library" checkbox for uninstalled games
- Clicking uninstalled game opens protocol URL via `open()` (tauri-plugin-shell)

### TASK-024-08: TypeScript types + `api.ts` invoke wrappers
Estimate: S
- Update `PcImportGame` interface with `installed`
- Add `clearPcCloudCache`, update `importSteamGames` / `importEpicGames` / `importGogGames` / `importXboxGames` signatures
- Update `AppConfig` + settings form with `steam_id` field

---

## Security Considerations
- Steam API key is already stored in `config.general.steamgriddb_api_key`. A separate `steam_api_key` field will be added to `GeneralConfig`.
- Epic/GOG tokens are read from local files (same user account security boundary) — not persisted by Cubi.
- All external HTTPS calls use TLS; no cert pinning required for game store APIs.
- Tokens are never logged.

## Test Plan
| Test | Type | Description |
|------|------|-------------|
| `test_steam_merge_installed` | Unit | Games with matching ACF are marked installed=true |
| `test_steam_merge_uninstalled` | Unit | Games without ACF are marked installed=false |
| `test_cloud_cache_ttl` | Unit | Cache returns data within 24h, refetches after expiry |
| `test_protocol_url_steam` | Unit | Uninstalled game file_path = "steam://install/<appid>" |
| `test_epic_token_missing` | Unit | Returns empty vec, no panic when token file absent |
| `test_gog_token_missing` | Unit | Returns empty vec gracefully |
| `test_clear_cache_single_store` | Unit | Clearing "steam" doesn't affect "gog" rows |
