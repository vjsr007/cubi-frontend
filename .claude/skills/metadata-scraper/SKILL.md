````skill
---
name: metadata-scraper
description: Skill for importing existing game metadata from gamelist.xml, downloading new metadata from ScreenScraper/IGDB APIs, and managing the metadata lifecycle. Based on REAL gamelist.xml format from ES-DE and real media from a production 58K+ file collection.
version: "1.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: rust
  data-source: "E:\\Emulation (gamelist.xml from ES-DE, storage/downloaded_media/ with 58K+ files)"
---

# Metadata Scraper Skill

## Purpose
Guide the implementation of game metadata management: importing existing gamelist.xml data from ES-DE setups, scraping new metadata from online APIs (ScreenScraper, IGDB), downloading media assets, and maintaining a local metadata database.

## Architecture Overview

### Two-Phase Metadata Strategy
1. **Import Phase**: Parse existing gamelist.xml files (FAST — already scraped by ES-DE)
2. **Scrape Phase**: Fetch missing metadata from APIs (SLOW — rate-limited, network-bound)

**ALWAYS import first** — real collections have extensive gamelist.xml data already.

---

## Phase 1: Gamelist.xml Import

### Real gamelist.xml Format (ES-DE Standard)
```xml
<?xml version="1.0"?>
<gameList>
  <game>
    <path>./Game Name (Region).ext</path>
    <name>Display Name</name>
    <sortname>001 =- Sort Key</sortname>
    <desc>Full text description of the game...</desc>
    <rating>0.8</rating>
    <releasedate>19850913T000000</releasedate>
    <developer>Developer Studio</developer>
    <publisher>Publisher Name</publisher>
    <genre>Platform</genre>
    <genreid>1</genreid>
    <players>2</players>
    <image>./downloaded_images/Game Name (Region).png</image>
    <playcount>5</playcount>
    <lastplayed>20240315T143022</lastplayed>
    <md5>3025bdc30b5aec9fb40668787f67d24c</md5>
    <hash>14E56D88</hash>
  </game>
</gameList>
```

### Special Values Found in Real Data
```xml
<!-- Non-game entries (demos, BIOS, utilities) -->
<name>ZZZ(NOTGAME):##DEMOS##</name>
<sortname>047 =- ZZZ(NOTGAME):##DEMOS##</sortname>

<!-- Empty optional fields are present but empty -->
<genre></genre>
<players></players>
<lastplayed></lastplayed>
```

### Image Path Patterns
```xml
<!-- Pattern 1: Local downloaded_images (most common) -->
<image>./downloaded_images/Game Name (Region).png</image>

<!-- Pattern 2: Pegasus-style media directory -->
<image>media/images/subfolder/Game Name.png</image>

<!-- Pattern 3: No image (field empty or absent) -->
<image></image>
```

### Rust Parser
```rust
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameMetadata {
    pub rom_path: String,            // Relative: ./filename.ext
    pub name: String,
    pub sortname: Option<String>,
    pub description: Option<String>,
    pub rating: Option<f32>,         // 0.0 - 1.0
    pub release_date: Option<String>, // YYYYMMDDTHHMMSS
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub genre_id: Option<i32>,
    pub players: Option<String>,     // "1", "2", "1-4", etc.
    pub image_path: Option<String>,  // Relative to system dir
    pub play_count: i32,
    pub last_played: Option<String>, // YYYYMMDDTHHMMSS
    pub md5: Option<String>,
    pub crc32: Option<String>,       // From <hash> field
    pub source: MetadataSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MetadataSource {
    GamelistXml,           // Imported from existing gamelist.xml
    ScreenScraper,         // Scraped from ScreenScraper API
    Igdb,                  // Scraped from IGDB API
    TheGamesDb,            // Scraped from TheGamesDB
    Manual,                // User-entered
}

/// Import all metadata from a gamelist.xml file
pub fn import_gamelist(path: &Path) -> Result<Vec<GameMetadata>, ScrapeError> {
    let content = std::fs::read_to_string(path)?;
    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);
    
    let mut games = Vec::new();
    let mut in_game = false;
    let mut current_field = String::new();
    let mut builder = GameMetadataBuilder::default();
    
    loop {
        match reader.read_event()? {
            Event::Start(e) => match e.name().as_ref() {
                b"game" => {
                    in_game = true;
                    builder = GameMetadataBuilder::default();
                }
                other if in_game => {
                    current_field = String::from_utf8_lossy(other).to_string();
                }
                _ => {}
            },
            Event::Text(e) if in_game => {
                let text = e.unescape()?.trim().to_string();
                if !text.is_empty() {
                    builder.set_field(&current_field, &text);
                }
            },
            Event::End(e) if e.name().as_ref() == b"game" => {
                in_game = false;
                if let Some(meta) = builder.build() {
                    games.push(meta);
                }
            },
            Event::Eof => break,
            _ => {}
        }
    }
    
    Ok(games)
}
```

---

## Phase 2: Online Scraping

### ScreenScraper.fr API (Primary — matches ES-DE)

#### Authentication
```rust
pub struct ScreenScraperConfig {
    pub dev_id: String,          // Developer ID
    pub dev_password: String,    // Developer password
    pub software_name: String,   // "cubi-frontend"
    pub username: Option<String>, // User account (higher rate limits)
    pub password: Option<String>,
}
```

#### System ID Mapping (folder_id → ScreenScraper systemeid)
```rust
fn system_to_screenscraper_id(system_id: &str) -> Option<u32> {
    match system_id {
        "atari2600" => Some(26),
        "atari5200" => Some(40),
        "atari7800" => Some(41),
        "nes" => Some(3),
        "fds" => Some(106),
        "snes" => Some(4),
        "gb" => Some(9),
        "gbc" => Some(10),
        "gba" => Some(12),
        "n64" => Some(14),
        "nds" => Some(15),
        "3ds" => Some(17),
        "switch" => Some(225),
        "gc" => Some(13),
        "wii" => Some(16),
        "wiiu" => Some(18),
        "megadrive" | "genesis" => Some(1),
        "mastersystem" => Some(2),
        "gamegear" => Some(21),
        "sg1000" => Some(109),
        "dreamcast" => Some(23),
        "psx" => Some(57),
        "ps2" => Some(58),
        "ps3" => Some(59),
        "psp" => Some(61),
        "psvita" => Some(62),
        "ps4" => Some(63),
        "xbox" => Some(32),
        "xbox360" => Some(33),
        "pcengine" => Some(31),
        "neogeo" => Some(142),
        "mame" => Some(75),
        "fbneo" => Some(75),
        "colecovision" => Some(48),
        "intellivision" => Some(115),
        "wswan" => Some(45),
        "wswanc" => Some(46),
        "ngpc" => Some(82),
        _ => None,
    }
}
```

#### API Endpoints
```rust
const BASE_URL: &str = "https://api.screenscraper.fr/api2/";

/// Search by ROM filename + hash
async fn scrape_game(
    client: &reqwest::Client,
    config: &ScreenScraperConfig,
    system_id: u32,
    rom_filename: &str,
    crc32: Option<&str>,
    md5: Option<&str>,
) -> Result<ScreenScraperGame, ScrapeError> {
    let mut url = format!(
        "{}jeuInfos.php?devid={}&devpassword={}&softname={}&output=json&systemeid={}&romnom={}",
        BASE_URL,
        config.dev_id,
        config.dev_password,
        config.software_name,
        system_id,
        urlencoding::encode(rom_filename),
    );
    
    if let Some(crc) = crc32 {
        url.push_str(&format!("&crc={}", crc));
    }
    if let Some(md5) = md5 {
        url.push_str(&format!("&md5={}", md5));
    }
    
    // Add user credentials for higher rate limits
    if let (Some(user), Some(pass)) = (&config.username, &config.password) {
        url.push_str(&format!("&ssid={}&sspassword={}", user, pass));
    }
    
    let response = client.get(&url).send().await?;
    // ... parse response
    todo!()
}
```

#### Rate Limiting
```rust
use tokio::time::{sleep, Duration};
use std::sync::atomic::{AtomicU64, Ordering};

pub struct RateLimiter {
    last_request: AtomicU64,  // Unix timestamp ms
    min_interval_ms: u64,     // 1000ms for free, 500ms for paid
}

impl RateLimiter {
    pub async fn wait(&self) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let last = self.last_request.load(Ordering::Relaxed);
        let elapsed = now.saturating_sub(last);
        
        if elapsed < self.min_interval_ms {
            sleep(Duration::from_millis(self.min_interval_ms - elapsed)).await;
        }
        
        self.last_request.store(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            Ordering::Relaxed,
        );
    }
}
```

#### Media Download from ScreenScraper
```rust
/// ScreenScraper returns media URLs for each type
/// Download and save to our standard media structure
async fn download_media(
    client: &reqwest::Client,
    media_url: &str,
    data_root: &Path,
    system_id: &str,
    media_type: &str,  // "box2dfront", "wheel", "videos", etc.
    rom_name: &str,     // Without extension
) -> Result<PathBuf, ScrapeError> {
    let ext = media_url.rsplit('.').next().unwrap_or("png");
    let save_path = data_root
        .join("storage/downloaded_media")
        .join(system_id)
        .join(media_type)
        .join(format!("{}.{}", rom_name, ext));
    
    // Create directories
    if let Some(parent) = save_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // Download
    let bytes = client.get(media_url).send().await?.bytes().await?;
    std::fs::write(&save_path, &bytes)?;
    
    Ok(save_path)
}

/// Media types to download (matching our real folder structure)
const MEDIA_TYPES: &[(&str, &str)] = &[
    ("box2dfront", "ss-box-2D"),      // ScreenScraper field → our folder
    ("wheel", "ss-wheel"),
    ("screenshots", "ss-screenshot"),
    ("titlescreens", "ss-title"),
    ("videos", "ss-video"),
    ("miximages", "ss-miximage"),
    ("3dboxes", "ss-box-3D"),
    ("backcovers", "ss-box-2D-back"),
    ("fanart", "ss-fanart"),
    ("manuals", "ss-manual"),
    ("physicalmedia", "ss-support"),
];
```

### IGDB API (Secondary — for modern games)

```rust
pub struct IgdbConfig {
    pub client_id: String,     // Twitch client ID
    pub client_secret: String, // Twitch client secret
    pub access_token: Option<String>,
}

/// Get OAuth token from Twitch
async fn authenticate_igdb(
    client: &reqwest::Client,
    config: &IgdbConfig,
) -> Result<String, ScrapeError> {
    let response = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&[
            ("client_id", &config.client_id),
            ("client_secret", &config.client_secret),
            ("grant_type", &"client_credentials".to_string()),
        ])
        .send()
        .await?;
    
    let json: serde_json::Value = response.json().await?;
    Ok(json["access_token"].as_str().unwrap().to_string())
}

/// Search for a game by name and platform
async fn search_igdb(
    client: &reqwest::Client,
    config: &IgdbConfig,
    game_name: &str,
    platform_id: u32,
) -> Result<Vec<IgdbGame>, ScrapeError> {
    let query = format!(
        r#"fields name,summary,rating,first_release_date,genres.name,
        involved_companies.company.name,involved_companies.developer,
        involved_companies.publisher,cover.url,screenshots.url,
        videos.video_id,artworks.url;
        search "{}";
        where platforms = ({});"#,
        game_name.replace('"', "\\\""),
        platform_id,
    );
    
    let response = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", &config.client_id)
        .header("Authorization", format!("Bearer {}", config.access_token.as_ref().unwrap()))
        .body(query)
        .send()
        .await?;
    
    Ok(response.json().await?)
}
```

---

## Scraping Workflow

### Smart Scraping Pipeline
```
1. IMPORT existing gamelist.xml (instant, local)
   └── Fill: name, description, rating, dates, genre, developer, publisher, hashes

2. MAP existing media files (fast, filesystem scan)
   ├── Check storage/downloaded_media/{system}/{type}/
   └── Check roms/{system}/downloaded_images/

3. IDENTIFY gaps (which games lack metadata/media)
   ├── Missing: name (filename as fallback)
   ├── Missing: description
   ├── Missing: box art (critical for UI)
   ├── Missing: any specific media type user wants

4. SCRAPE missing data from APIs (slow, rate-limited)
   ├── ScreenScraper first (best for retro games, has all media types)
   ├── IGDB fallback (better for modern games)
   └── TheGamesDB fallback

5. DOWNLOAD missing media assets
   ├── Prioritize: box2dfront > wheel > screenshots > videos
   ├── Save to storage/downloaded_media/{system}/{type}/
   └── Respect rate limits (1 req/sec free)
```

### Tauri IPC Commands

```rust
#[tauri::command]
async fn import_all_gamelists(
    data_root: String,
    app: tauri::AppHandle,
) -> Result<ImportResult, String> {
    // Scan all system dirs for gamelist.xml
    // Parse and store in SQLite
    // Emit progress events
    todo!()
}

#[tauri::command]
async fn scrape_game(
    system_id: String,
    rom_filename: String,
    crc32: Option<String>,
    md5: Option<String>,
) -> Result<GameMetadata, String> {
    todo!()
}

#[tauri::command]
async fn scrape_system(
    system_id: String,
    data_root: String,
    download_media: bool,
    media_types: Vec<String>,
    app: tauri::AppHandle,
) -> Result<ScrapeResult, String> {
    // Scrape all games in a system that are missing metadata
    // Emit progress events
    todo!()
}

#[tauri::command]
async fn get_scrape_progress() -> Result<ScrapeProgress, String> {
    todo!()
}

#[tauri::command]
async fn cancel_scrape() -> Result<(), String> {
    todo!()
}
```

### Frontend Integration

```typescript
// src/hooks/useMetadataScraper.ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ScrapeProgress {
  total: number;
  scraped: number;
  downloaded: number;
  errors: number;
  currentGame: string;
  currentSystem: string;
  phase: 'import' | 'scrape' | 'download' | 'complete';
}

export function useMetadataScraper() {
  // Import existing gamelist.xml data
  // Identify games missing metadata
  // Scrape from APIs with progress
  // Download media assets
  // Support cancellation
}
```

---

## Database Schema for Metadata

```sql
CREATE TABLE game_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rom_path TEXT NOT NULL,            -- Relative path within system dir
    system_id TEXT NOT NULL,           -- "nes", "psx", etc.
    name TEXT NOT NULL,
    sortname TEXT,
    description TEXT,
    rating REAL,                       -- 0.0 - 1.0
    release_date TEXT,                 -- YYYYMMDDTHHMMSS
    developer TEXT,
    publisher TEXT,
    genre TEXT,
    genre_id INTEGER,
    players TEXT,
    play_count INTEGER DEFAULT 0,
    last_played TEXT,
    md5 TEXT,
    crc32 TEXT,
    source TEXT NOT NULL,              -- 'gamelist_xml', 'screenscraper', 'igdb', 'manual'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(rom_path, system_id)
);

CREATE TABLE game_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES game_metadata(id),
    media_type TEXT NOT NULL,          -- 'box2dfront', 'wheel', 'videos', etc.
    file_path TEXT NOT NULL,           -- Absolute or relative path
    file_size INTEGER,
    mime_type TEXT,                    -- 'image/png', 'video/mp4', etc.
    source TEXT NOT NULL,              -- 'local_import', 'screenscraper', 'igdb'
    UNIQUE(game_id, media_type)
);

CREATE INDEX idx_metadata_system ON game_metadata(system_id);
CREATE INDEX idx_metadata_name ON game_metadata(name);
CREATE INDEX idx_metadata_crc32 ON game_metadata(crc32);
CREATE INDEX idx_media_game ON game_media(game_id);
```

---

## Key Design Rules

1. **Import before scrape** — always check gamelist.xml first
2. **Respect rate limits** — ScreenScraper bans aggressive scrapers
3. **Cache everything** — store in SQLite, don't re-scrape
4. **Incremental scraping** — only scrape games missing metadata
5. **User cancellation** — scraping can take hours for large collections
6. **Offline support** — app must work fully with only imported data
7. **Media priority** — box2dfront and wheel are most important for UI
8. **Handle special entries** — ZZZ(NOTGAME) prefix means non-game (BIOS, demos)
9. **Preserve user data** — never overwrite manual edits with scraped data
10. **Export to gamelist.xml** — allow writing back for ES-DE compatibility
````
