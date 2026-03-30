# DES-015 — PC Game Enhanced Metadata & Web Scraper

## Status
`APPROVED`

## Linked Requirement
REQ-015 — PC Game Enhanced Metadata & Web Scraper

---

## Architecture Overview

```
PC Metadata Orchestrator
│
├── Tier 1 — Authoritative APIs (structured data)
│   ├── Steam Store API          (steam_store_service.rs)   — free, no auth
│   ├── IGDB / Twitch API        (igdb_service.rs)          — OAuth2 client credentials
│   ├── SteamGridDB Extended     (steamgriddb.rs extended)  — API key
│   └── MobyGames API            (mobygames_service.rs)     — API key, fallback
│
├── Tier 2 — Structured Web APIs (semi-structured)
│   ├── PCGamingWiki             (pcgamingwiki_service.rs)  — MediaWiki API, free
│   └── YouTube Data API v3      (youtube_service.rs)       — API key, trailer search
│
└── Tier 3 — Web Scraper Engine  (web_scraper/)
    ├── Search Service           (search_service.rs)        — DuckDuckGo, no auth
    ├── HTML Scraper             (html_scraper.rs)          — reqwest + scraper crate
    └── Headless Browser         (headless_scraper.rs)      — chromiumoxide (JS sites)
```

---

## 1. Database Schema Migration

### New columns on `games` table

```sql
ALTER TABLE games ADD COLUMN hero_art TEXT;
ALTER TABLE games ADD COLUMN logo TEXT;
ALTER TABLE games ADD COLUMN background_art TEXT;
ALTER TABLE games ADD COLUMN screenshots TEXT;        -- JSON array of paths
ALTER TABLE games ADD COLUMN trailer_url TEXT;
ALTER TABLE games ADD COLUMN trailer_local TEXT;
ALTER TABLE games ADD COLUMN metacritic_score INTEGER;
ALTER TABLE games ADD COLUMN tags TEXT;              -- JSON array of strings
ALTER TABLE games ADD COLUMN website TEXT;
ALTER TABLE games ADD COLUMN pcgamingwiki_url TEXT;
ALTER TABLE games ADD COLUMN igdb_id INTEGER;
```

`steam_appid` already exists as `source_id` for Steam games — reuse it.

### Migration strategy
- Run `ALTER TABLE IF NOT EXISTS` on app startup (db/migrations.rs)
- All new columns are nullable — existing rows unaffected
- Version the migration with a `schema_version` table

---

## 2. Rust Dependency Additions

```toml
# HTML parsing (CSS selectors, BeautifulSoup equivalent)
scraper = "0.20"

# Headless browser via Chrome DevTools Protocol
chromiumoxide = { version = "0.7", features = ["tokio-runtime"] }

# URL utilities
url = "2"
```

`reqwest`, `tokio`, `serde_json`, `log`, `which` already present.

---

## 3. Source Services

### 3.1 Steam Store API (`steam_store_service.rs`)

**Endpoint:** `https://store.steampowered.com/api/appdetails?appids={appid}&cc=us&l=en`

**Matching:** Uses `source_id` (Steam AppID) already stored in `games` table for Steam games.

**Fields extracted:**

| GameInfo field | Steam Store field |
|---|---|
| `description` | `detailed_description` (HTML stripped) |
| `developer` | `developers[0]` |
| `publisher` | `publishers[0]` |
| `year` | `release_date.date` (parsed) |
| `genre` | `genres[].description` joined |
| `rating` | `metacritic.score` / 100.0 |
| `metacritic_score` | `metacritic.score` |
| `tags` | `categories[].description` |
| `website` | `website` |
| `background_art` | `background_raw` (download) |
| `screenshots` | `screenshots[].path_full` (up to 5, download) |
| `trailer_url` | `movies[0].mp4.max` (Steam CDN MP4) |

**Rate limiting:** 1 request per 1.5s (Steam enforces ~200 req/5min)

**Implementation pattern:**
```rust
pub struct SteamStoreData {
    pub description: Option<String>,
    pub developer: Option<String>,
    // ...
    pub screenshots: Vec<String>,   // remote URLs
    pub trailer_url: Option<String>,
}

pub async fn fetch_steam_store(appid: &str) -> Result<Option<SteamStoreData>, String>
pub async fn download_steam_media(data: &SteamStoreData, dest_dir: &Path, game_name: &str) -> Result<Vec<String>, String>
```

---

### 3.2 IGDB Service (`igdb_service.rs`)

**Auth:** OAuth2 Client Credentials flow → Twitch token endpoint
`POST https://id.twitch.tv/oauth2/token?client_id=X&client_secret=Y&grant_type=client_credentials`

Token cached in memory (expires ~60 days, refresh on 401).

**Endpoint:** `https://api.igdb.com/v4/games` (POST with APIcalypse query language)

**Query:**
```
fields name, summary, genres.name, first_release_date, involved_companies.company.name,
       involved_companies.developer, involved_companies.publisher,
       rating, aggregated_rating, screenshots.url, artworks.url, cover.url,
       websites.url, websites.category, videos.video_id;
where platforms = (6) & name ~ "{title}"*;
limit 1;
```
(Platform 6 = PC Windows)

**Matching:** Fuzzy title match — normalize both sides (lowercase, remove articles, punctuation), pick highest similarity score.

**Fields extracted:**

| GameInfo field | IGDB field |
|---|---|
| `description` | `summary` |
| `genre` | `genres[].name` joined |
| `year` | `first_release_date` (Unix timestamp → year) |
| `developer` | `involved_companies` where `developer=true` |
| `publisher` | `involved_companies` where `publisher=true` |
| `rating` | `rating` / 100.0 (community) |
| `igdb_id` | `id` |
| `screenshots` | `screenshots[].url` (replace `t_thumb` → `t_1080p`) |
| `trailer_url` | `videos[0].video_id` → `https://www.youtube.com/watch?v={id}` |
| `website` | `websites` where `category=1` (official) |

**Token storage:** `AppState` struct (in-memory, not persisted).

```rust
pub struct IgdbService {
    client_id: String,
    client_secret: String,
    token: Arc<Mutex<Option<IgdbToken>>>,
}

pub async fn search_game(&self, title: &str) -> Result<Option<IgdbGameData>, String>
pub async fn download_igdb_media(&self, data: &IgdbGameData, dest_dir: &Path, game_name: &str) -> Result<(), String>
```

---

### 3.3 SteamGridDB Extended (`steamgriddb.rs` — extend existing)

Add three new fetch functions:

```rust
/// Hero image: 1920×620 wide banner
pub async fn fetch_hero(api_key: &str, appid: Option<&str>, title: Option<&str>) -> Option<String>

/// Logo: transparent PNG with game wordmark
pub async fn fetch_logo(api_key: &str, appid: Option<&str>, title: Option<&str>) -> Option<String>

/// Background/wallpaper art
pub async fn fetch_background(api_key: &str, appid: Option<&str>, title: Option<&str>) -> Option<String>
```

Endpoints:
- `GET /heroes/steam/{appid}` or `GET /heroes/game/{sgdb_id}`
- `GET /logos/steam/{appid}` or `GET /logos/game/{sgdb_id}`
- `GET /grids/steam/{appid}?dimensions=1920x620` for hero fallback

All return remote URL → downloaded to `media/pc/{hero|logo|background}/{sanitized_name}.{ext}`.

---

### 3.4 MobyGames Service (`mobygames_service.rs`)

**Endpoint:** `https://api.mobygames.com/v1/games?title={title}&platform=3&api_key={key}`
(Platform 3 = Windows)

**Fields extracted:** description, developer, publisher, year, genre, screenshots

**Rate limiting:** 1 req/s (free tier: 360 req/hour)

Used as fallback when IGDB returns no results.

```rust
pub async fn search_game(api_key: &str, title: &str) -> Result<Option<MobyGameData>, String>
```

---

### 3.5 PCGamingWiki Service (`pcgamingwiki_service.rs`)

**API:** MediaWiki API — free, no auth required.

**Search endpoint:**
`https://www.pcgamingwiki.com/w/api.php?action=opensearch&search={title}&limit=1&format=json`

Returns the wiki page title. Then construct the URL:
`https://www.pcgamingwiki.com/wiki/{PageTitle}`

**Infobox data** (optional, v2):
`https://www.pcgamingwiki.com/w/api.php?action=cargoquery&tables=Infobox_game&fields=Steam_AppID,GOGcom_ID,Metacritic,OpenCritic&where=_pageName="{title}"&format=json`

**What we store:**
- `pcgamingwiki_url` — direct link for user reference
- `metacritic_score` (if not from Steam) — via Cargo query

```rust
pub async fn find_page(title: &str) -> Result<Option<String>, String>  // returns URL
pub async fn fetch_infobox(page_title: &str) -> Result<Option<PcgwData>, String>
```

---

### 3.6 YouTube Service (`youtube_service.rs`)

**Search:** YouTube Data API v3
`GET https://www.googleapis.com/youtube/v3/search?q={title}+official+trailer+game&type=video&maxResults=3&key={api_key}`

Returns video IDs → store best match URL as `trailer_url`.

**Download:** Detect `yt-dlp` via `which::which("yt-dlp")`:
```rust
pub async fn download_trailer(url: &str, dest_path: &Path) -> Result<(), String> {
    // Calls: yt-dlp -f "bestvideo[ext=mp4]+bestaudio/best[ext=mp4]" -o {dest_path} {url}
    // via tokio::process::Command
}
```

If `yt-dlp` not found → store URL only, skip download.

**Quota:** YouTube API free tier = 10,000 units/day. Search costs 100 units. ~100 searches/day free.

**Alternative (no API key):** Use `invidious` public instances as fallback:
`https://vid.puffyan.us/api/v1/search?q={title}+trailer&type=video`

---

### 3.7 Web Scraper Engine (`web_scraper/`)

#### `html_scraper.rs` — Static HTML scraper

Uses `reqwest` + `scraper` crate (CSS selectors, like BeautifulSoup for Rust).

```rust
pub struct ScrapedPage {
    pub title: Option<String>,
    pub description: Option<String>,
    pub images: Vec<String>,        // absolute URLs
    pub og_image: Option<String>,   // Open Graph image (best quality)
    pub og_description: Option<String>,
}

pub async fn scrape_url(url: &str) -> Result<ScrapedPage, String>
```

**Extraction strategy (in order of reliability):**
1. `<meta property="og:title">` → title
2. `<meta property="og:description">` → description
3. `<meta property="og:image">` → primary image
4. `<meta name="description">` → description fallback
5. `<h1>` first occurrence → title fallback
6. `<img>` tags filtered by size hints / alt text

#### `headless_scraper.rs` — JS-rendered page scraper

Uses `chromiumoxide` to launch a headless Chrome instance.

```rust
pub async fn scrape_js_url(url: &str) -> Result<ScrapedPage, String>
```

**Process:**
1. Launch Chrome headless via `chromiumoxide::Browser::launch()`
2. Navigate to URL, wait for `networkidle0`
3. Extract `document.title`, meta tags, Open Graph data via CDP `Runtime.evaluate`
4. Take screenshot (optional) → save as thumbnail
5. Close tab

**Fallback chain:** Try `html_scraper` first (fast, no Chrome dependency). If content is empty or page uses JS rendering, retry with `headless_scraper`.

**Chrome detection:** Uses `which::which("google-chrome")` / `"chromium"` / `"chrome"`. If not found, skip headless and use HTML-only scraper.

#### `search_service.rs` — Search engine integration

**Primary:** DuckDuckGo Instant Answer API (free, no auth):
`GET https://api.duckduckgo.com/?q={title}+PC+game+official+site&format=json&no_html=1`

Returns `AbstractURL` (Wikipedia), `Results[0].FirstURL` (first result).

**Official site detection heuristics:**
- Prefer URLs matching `{normalized_title}.com` / `.gg` / `.io`
- Reject known aggregator domains: `gamespot.com`, `ign.com`, `metacritic.com`, `wikipedia.org`
- Accept store pages: `store.steampowered.com`, `gog.com`, `epicgames.com`

```rust
pub async fn find_official_site(title: &str) -> Result<Option<String>, String>
pub async fn search_for_page(query: &str) -> Result<Vec<SearchResult>, String>
```

---

### 3.8 PC Metadata Orchestrator (`pc_metadata_orchestrator.rs`)

Central coordinator — runs sources in priority order, fills only missing fields.

**Priority pipeline per game:**

```
1. Steam Store API        → if game.source == "steam" && steam_appid exists
   fills: description, developer, publisher, year, genre, metacritic_score,
          tags, website, background_art, screenshots (up to 5), trailer_url

2. IGDB                   → if igdb configured && (description missing OR overwrite)
   fills: description, genre, year, developer, publisher, rating,
          igdb_id, screenshots, trailer_url (YouTube ID)

3. SteamGridDB Extended   → if sgdb_api_key configured
   fills: hero_art, logo, background_art (if missing after step 1)

4. MobyGames              → if mobygames_api_key configured && description still missing
   fills: description, genre, year, developer, publisher

5. PCGamingWiki           → always attempted (free, no auth)
   fills: pcgamingwiki_url, metacritic_score (if missing)

6. YouTube                → if youtube_api_key configured || yt-dlp present
   fills: trailer_url, trailer_local

7. Web Scraper            → if website known (from step 1/2/5)
   fills: og_image → background_art (if still missing), description (last resort)
```

**Orchestrator signature:**
```rust
pub async fn enrich_pc_game(
    game: &GameInfo,
    config: &PcMetadataConfig,
    dest_dir: &Path,
    overwrite: bool,
    cancel: Arc<AtomicBool>,
    emit_progress: impl Fn(ScrapeProgress),
) -> Result<GameInfoPatch, String>
```

Returns a `GameInfoPatch` (only changed fields) to minimize DB writes.

---

### 3.9 New Tauri Commands

```rust
// src-tauri/src/commands/pc_scraper.rs

#[tauri::command]
pub async fn run_pc_metadata_job(job: PcScrapeJob, app: AppHandle) -> Result<ScrapeResult, String>

#[tauri::command]
pub async fn scrape_single_pc_game(game_id: String, config: PcMetadataConfig, app: AppHandle) -> Result<GameInfo, String>

#[tauri::command]
pub async fn check_pc_scraper_tools(app: AppHandle) -> Result<PcToolsStatus, String>
// Returns: { ytdlp_found: bool, ytdlp_path: Option<String>, chrome_found: bool }

#[tauri::command]
pub async fn get_pc_metadata_config(app: AppHandle) -> Result<PcMetadataConfig, String>

#[tauri::command]
pub async fn save_pc_metadata_config(config: PcMetadataConfig, app: AppHandle) -> Result<(), String>
```

**New types:**
```rust
pub struct PcScrapeJob {
    pub game_ids: Option<Vec<String>>,    // None = all PC games
    pub sources: Vec<PcMetadataSource>,   // which sources to use
    pub filter: ScrapeFilter,
    pub overwrite: bool,
}

pub enum PcMetadataSource {
    SteamStore, Igdb, SteamGridDb, MobyGames,
    PcGamingWiki, YouTube, WebScraper,
}

pub struct PcMetadataConfig {
    pub igdb_client_id: Option<String>,
    pub igdb_client_secret: Option<String>,
    pub steamgriddb_api_key: Option<String>,
    pub mobygames_api_key: Option<String>,
    pub youtube_api_key: Option<String>,
    pub max_screenshots: u32,             // default 5
    pub download_trailers: bool,          // requires yt-dlp
    pub use_headless_browser: bool,       // requires Chrome
    pub enabled_sources: Vec<PcMetadataSource>,
}

pub struct PcToolsStatus {
    pub ytdlp_found: bool,
    pub ytdlp_path: Option<String>,
    pub chrome_found: bool,
    pub chrome_path: Option<String>,
}
```

---

### 3.10 Frontend — PC Scraper Settings UI

**New page/panel:** `src/components/pc_scraper/PcScraperSettings.tsx`

Sections:
1. **API Keys** — IGDB Client ID/Secret, SteamGridDB (shared with existing), MobyGames, YouTube
2. **Source Priority** — drag to reorder enabled sources (or simple checkbox list)
3. **Media Options** — max screenshots slider, download trailers toggle, headless browser toggle
4. **Tools Status** — shows yt-dlp and Chrome detected paths (from `check_pc_scraper_tools`)
5. **Run Job** — "Enrich all PC games" button with filter dropdown + progress display

**Integrate into:** `ScraperPage.tsx` as a new "PC Games" tab alongside the existing scraper list.

### 3.11 Frontend — GameInfo type extension

```typescript
// src/types/index.ts additions
export interface GameInfo {
  // ... existing fields ...
  hero_art?: string;
  logo?: string;
  background_art?: string;
  screenshots?: string[];
  trailer_url?: string;
  trailer_local?: string;
  metacritic_score?: number;
  tags?: string[];
  website?: string;
  pcgamingwiki_url?: string;
  igdb_id?: number;
}
```

---

## Task Breakdown

| Task | Component | Description |
|---|---|---|
| TASK-015-01 | DB | Schema migration: add new columns to `games` table |
| TASK-015-02 | Rust | Steam Store API service |
| TASK-015-03 | Rust | IGDB / Twitch OAuth2 service |
| TASK-015-04 | Rust | SteamGridDB extended (hero, logo, background) |
| TASK-015-05 | Rust | MobyGames API service |
| TASK-015-06 | Rust | PCGamingWiki MediaWiki API service |
| TASK-015-07 | Rust | YouTube search + yt-dlp download service |
| TASK-015-08 | Rust | Web scraper engine (HTML + headless browser) |
| TASK-015-09 | Rust | DuckDuckGo search service + official site detection |
| TASK-015-10 | Rust | PC Metadata Orchestrator (priority pipeline) |
| TASK-015-11 | Rust | Tauri commands for PC scraper + register in lib.rs |
| TASK-015-12 | TS | TypeScript types + GameInfo extension |
| TASK-015-13 | React | PC Scraper Settings UI component |

---

## Security Considerations
- All external HTTP calls use `reqwest` with explicit timeouts (10s default, 30s for downloads)
- `chromiumoxide` Chrome instance is sandboxed — no local file access from the browser context
- `yt-dlp` called via `tokio::process::Command` with explicit args — no shell injection (args are not shell-interpolated)
- API keys stored in app config (TOML), never in SQLite
- Downloaded media validated: min 8 bytes, magic byte check (JPEG/PNG/MP4 headers)
- URLs for scraping validated against an allowlist of trusted domains (with override option)

## Testing Strategy
- Unit tests for each service with `mockito` or recorded HTTP fixtures
- Integration test: `test_steam_store_fetch` against a known free-to-play game (AppID 570 = Dota 2)
- Integration test: `test_pcgamingwiki_search` against a known title
- Integration test: `test_html_scraper` against a static fixture page
- UI test: PC Scraper Settings renders correctly with mock tool status
