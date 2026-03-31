# REQ-021: Steam Reviews & Enhanced Metadata Integration

## Summary
Integrate Steam Store API to fetch and display user reviews, ratings, and enriched metadata for games. Allow users to browse Steam community reviews directly within the game detail page without leaving the app.

## Motivation
Users want to see what the community thinks about a game before playing. Steam has the largest game review database. Currently we fetch basic metadata (description, developer, genre) from Steam but ignore reviews and detailed store data.

## Requirements

### R1: Steam AppID Resolution
- Store `steam_app_id` explicitly in the game database (currently inferred from file_path)
- For non-Steam (emulator) games, allow searching Steam by title to find matching appid
- Cache appid lookups to avoid repeated API calls

### R2: Steam Reviews Fetching
- Fetch review summary from Steam Store API (`appreviews/{appid}?json=1`)
- Retrieve: total positive, total negative, review score, review score description
- Fetch recent review snippets (top 5-10 most helpful reviews)
- Store review summary in DB, refresh on demand

### R3: Enhanced Steam Metadata
- Fetch additional fields not currently captured:
  - Short description
  - Categories (single-player, multiplayer, co-op, controller support, etc.)
  - Release date (precise, not just year)
  - Supported languages
  - System requirements (minimum/recommended)
  - DLC count
  - Achievements count
- Store in `game_extra` table or JSON column

### R4: Game Detail Page — Reviews Section
- Show Steam review summary: score (Overwhelmingly Positive, etc.), ratio bar
- Display top reviews with: author, hours played, recommendation, snippet
- Link to full Steam store page
- Show Metacritic score alongside Steam score

### R5: Game Detail Page — Enhanced Info
- Display categories/tags as chips
- Show system requirements in expandable section
- Display supported languages
- Show achievements count if available

### R6: Search & Match for Non-Steam Games
- When viewing a ROM/emulator game, allow "Find on Steam" button
- Search Steam Store API by game title
- Let user confirm the match
- Once matched, fetch all Steam data for that game

## Non-Requirements
- Steam login/authentication (we use public APIs only)
- Steam achievements tracking (would require Steamworks SDK)
- Steam friend list / social features
- Purchasing games through Steam

## API Endpoints Used
- `store.steampowered.com/api/appdetails?appids={id}` — Game details
- `store.steampowered.com/appreviews/{id}?json=1` — Reviews
- `store.steampowered.com/api/storesearch/?term={name}` — Search by name

## Dependencies
- Existing `steam_store_service.rs` (extend, don't rewrite)
- Existing `GameInfo` model (add `steam_app_id` field)
- Database migration for new columns/tables
