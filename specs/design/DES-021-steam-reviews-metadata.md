# DES-021: Steam Reviews & Enhanced Metadata Integration

**Requirement:** REQ-021  
**Status:** Design

## Architecture Overview

```
┌──────────────┐      ┌───────────────────┐      ┌──────────────┐
│  Frontend    │─────▶│  Tauri Commands   │─────▶│  Steam API   │
│  Components  │      │  (steam_reviews)  │      │  (public)    │
└──────────────┘      └───────────────────┘      └──────────────┘
       │                       │
       ▼                       ▼
┌──────────────┐      ┌───────────────────┐
│  React Query │      │  SQLite DB        │
│  Cache       │      │  (game_steam_data)│
└──────────────┘      └───────────────────┘
```

## Backend Design

### Database Changes

**New column on `games` table:**
```sql
ALTER TABLE games ADD COLUMN steam_app_id INTEGER;
```

**New table `game_steam_data`:**
```sql
CREATE TABLE IF NOT EXISTS game_steam_data (
    game_id TEXT PRIMARY KEY,
    steam_app_id INTEGER NOT NULL,
    review_score_desc TEXT,          -- "Overwhelmingly Positive", etc.
    review_positive INTEGER DEFAULT 0,
    review_negative INTEGER DEFAULT 0,
    short_description TEXT,
    categories TEXT,                  -- JSON array: ["Single-player", "Steam Cloud"]
    release_date TEXT,
    languages TEXT,                   -- JSON array
    requirements_min TEXT,
    requirements_rec TEXT,
    dlc_count INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    reviews_json TEXT,               -- JSON array of top review snippets
    fetched_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

### Rust Modules

**`src-tauri/src/commands/steam_integration.rs`** (new)
- `search_steam_games(query: String) -> Vec<SteamSearchResult>`
- `link_steam_game(game_id: String, steam_app_id: u32) -> GameInfo`
- `fetch_steam_reviews(game_id: String) -> SteamGameData`
- `refresh_steam_data(game_id: String) -> SteamGameData`

**`src-tauri/src/models/steam.rs`** (new)
- `SteamSearchResult { app_id, name, icon_url }`
- `SteamGameData { review_score_desc, review_positive, review_negative, short_description, categories, release_date, languages, requirements_min, requirements_rec, dlc_count, achievements_count, reviews: Vec<SteamReview> }`
- `SteamReview { author_name, hours_played, voted_up, review_text, timestamp }`

**Extend `src-tauri/src/services/steam_store_service.rs`:**
- `fetch_reviews(app_id: u32) -> SteamReviewSummary`
- `search_store(query: &str) -> Vec<SteamSearchResult>`
- `fetch_app_details_full(app_id: u32) -> SteamFullDetails`

**Extend `src-tauri/src/db/mod.rs`:**
- `save_steam_data(game_id, data)`
- `get_steam_data(game_id) -> Option<SteamGameData>`
- `set_steam_app_id(game_id, app_id)`

### API Details

**Reviews API:** `GET https://store.steampowered.com/appreviews/{appid}?json=1&language=all&num_per_page=10&filter=recent&purchase_type=all`

Response shape:
```json
{
  "query_summary": {
    "review_score_desc": "Overwhelmingly Positive",
    "total_positive": 12345,
    "total_negative": 678
  },
  "reviews": [{
    "author": { "steamid": "...", "num_games_owned": 100, "playtime_forever": 3600 },
    "voted_up": true,
    "review": "Great game...",
    "timestamp_created": 1700000000
  }]
}
```

**Store Search:** `GET https://store.steampowered.com/api/storesearch/?term={name}&l=english&cc=US`

**App Details:** `GET https://store.steampowered.com/api/appdetails?appids={id}&l=english`

## Frontend Design

### New Components

**`src/components/steam/SteamReviews.tsx`**
- Review score bar (green/red ratio)
- Score description text ("Overwhelmingly Positive")
- Total review count
- List of top review snippets (expandable)

**`src/components/steam/SteamSearchModal.tsx`**
- Search input
- Results list with app icons
- Confirm button to link a game

**`src/components/steam/SteamInfo.tsx`**
- Categories as chips
- Languages list
- System requirements (collapsible)
- Achievements count
- Link to Steam store page

### GameDetailPage Integration
- New "Steam" section below description
- Shows SteamReviews + SteamInfo when steam data is available
- "Find on Steam" button when no steam_app_id linked
- "Refresh" button to re-fetch data

### API Layer (`src/lib/invoke.ts`)
- `searchSteamGames(query: string)`
- `linkSteamGame(gameId: string, steamAppId: number)`
- `fetchSteamReviews(gameId: string)`
- `refreshSteamData(gameId: string)`

### Types (`src/types/steam.ts`)
- `SteamSearchResult`
- `SteamGameData`
- `SteamReview`

## Task Breakdown

| Task | Description |
|------|-------------|
| TASK-021-01 | DB migration + models + steam_app_id field |
| TASK-021-02 | Steam API service extensions (reviews, search, full details) |
| TASK-021-03 | Tauri commands for steam integration |
| TASK-021-04 | Frontend: SteamReviews, SteamSearchModal, SteamInfo components |
| TASK-021-05 | GameDetailPage integration + i18n |

## Rate Limits
- Steam Store API: ~200 requests per 5 minutes (no auth)
- Cache fetched data in DB, refresh manually or every 24h
