# REQ-015 — PC Game Enhanced Metadata & Web Scraper

## Status
`APPROVED`

## Summary
Provide complete, rich metadata for PC games (Steam, Epic, GOG, EA) by integrating multiple authoritative APIs and a custom web scraper engine. PC games currently receive only a box art cover and basic title/developer fields. This requirement brings them to parity with — and beyond — console game metadata by adding descriptions, genres, ratings, screenshots, hero art, logos, backgrounds, trailers, and gameplay videos sourced from Steam, IGDB, SteamGridDB, MobyGames, PCGamingWiki, YouTube, and arbitrary web pages.

## Motivation
PC games are first-class citizens in cubi-frontend but today they are data-poor:
- `description`, `genre`, `year`, `rating` are always null for Epic/GOG/EA games
- Steam games have a cover but no description or screenshots
- No hero art (wide banners), no logo (transparent PNG), no background art
- No trailer or gameplay video
- No Metacritic/OpenCritic scores
- No PCGamingWiki integration (compatibility, settings, patches)

Users with large PC libraries (Steam, GOG, Epic) see blank cards while their console library looks rich. This is a top friction point.

## Goals

1. **Steam Store API** — fetch full metadata + screenshots + trailer for every Steam game using the existing AppID (no auth required)
2. **IGDB** — complete the existing stub; fetch metadata + artwork + video URLs for all PC games including Epic, GOG, EA
3. **SteamGridDB Extended** — add hero (1920×620), logo (transparent PNG), and background art to the existing cover integration
4. **MobyGames** — implement the stub as a fallback for games not found by IGDB
5. **PCGamingWiki** — scrape the MediaWiki API for PC-specific info: compatibility notes, settings, fix recommendations
6. **YouTube** — search for official trailer + gameplay video; download via `yt-dlp` if available; otherwise store URL
7. **Web Scraper Engine** — headless browser (chromiumoxide) + HTML parser (scraper crate) to extract metadata from any URL: official game site, store pages, review sites
8. **Search Service** — use DuckDuckGo Instant Answer API to locate official game site and relevant pages automatically
9. **PC Metadata Orchestrator** — priority/fallback pipeline combining all sources; fill each field from the best available source

## Non-Goals
- Console game metadata (existing scrapers handle those)
- Automatic patch/fix application from PCGamingWiki
- Full YouTube video download without `yt-dlp` present on the system
- Browser extension or user-script injection

## New Metadata Fields

The following fields are added to `GameInfo` and the SQLite `games` table:

| Field | Type | Source |
|---|---|---|
| `hero_art` | `Option<String>` (local path) | SteamGridDB |
| `logo` | `Option<String>` (local path) | SteamGridDB |
| `background_art` | `Option<String>` (local path) | SteamGridDB / Steam Store |
| `screenshots` | `Vec<String>` (local paths) | Steam Store / IGDB |
| `trailer_url` | `Option<String>` | YouTube / Steam |
| `trailer_local` | `Option<String>` (local path) | yt-dlp download |
| `metacritic_score` | `Option<i32>` | Steam Store |
| `tags` | `Vec<String>` | Steam Store / IGDB |
| `website` | `Option<String>` | Steam Store / IGDB / web search |
| `pcgamingwiki_url` | `Option<String>` | PCGamingWiki API |
| `igdb_id` | `Option<i64>` | IGDB |
| `steam_appid` | `Option<String>` | pc_import (already exists as source_id) |

## Acceptance Criteria
- [ ] Steam games get description, genre, year, developer, publisher, rating, up to 5 screenshots, trailer URL, and background art from Steam Store API — zero config required
- [ ] IGDB integration fills description, genre, year, developer, publisher, and artwork for Epic/GOG/EA games with a Twitch Client ID + Secret
- [ ] SteamGridDB hero, logo, and background art downloaded for all PC games with API key
- [ ] MobyGames fills metadata for games not found in IGDB
- [ ] PCGamingWiki page URL stored for every matched PC game
- [ ] YouTube trailer URL found and stored; local download attempted via yt-dlp
- [ ] Web scraper can open any URL (headless Chrome or HTML parser) and extract title/description/images
- [ ] Search service finds official site given a game title
- [ ] PC Metadata Orchestrator runs sources in priority order and fills only missing fields (unless overwrite=true)
- [ ] New fields visible in game detail UI
- [ ] All new fields nullable — no game is broken if a source fails

## Linked Specs
- DES-015 — PC Game Enhanced Metadata Design
