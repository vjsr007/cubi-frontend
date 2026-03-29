# REQ-012 — Scraper System

## Summary
Add a configurable scraping system that fetches metadata and media for games, with a CRUD scraper list and per-system/per-game job execution.

## Requirements

### R1 — Scraper CRUD
- Scraper list stored in SQLite (persistent, survives app restart)
- Each scraper has: name, URL, API key / username / password, enabled flag, priority, supported media types
- Pre-seeded defaults: ScreenScraper, TheGamesDB, Libretro Thumbnails, IGDB, MobyGames, ArcadeDB
- User can add custom scrapers, edit any field, delete, enable/disable, reorder by priority
- Credentials masked (password field) in UI

### R2 — Scrape Job
- Scope: all systems, one system, or selected games
- Filter options: All, Images only, Videos only, Metadata only, Missing media only
- Overwrite toggle: skip games that already have media vs. overwrite
- Real-time progress: events pushed per game (title, status, current/total, errors)
- Cancel job at any time

### R3 — Scraper Implementations
- **ScreenScraper** — full: metadata + all media types; requires username/password
- **TheGamesDB** — metadata + box art; optional API key
- **Libretro Thumbnails** — box art + screenshots; no auth; reuses existing downloader
- **IGDB, MobyGames, ArcadeDB** — configuration stored; execution stubbed for future

### R4 — Navigation
- Accessible from Settings page (button) and from system context (per-system button)
- Scraper page is a separate full page (new 'scraper' Page type)
