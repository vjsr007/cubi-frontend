---
id: REQ-022
title: "Game Catalog Database"
status: DRAFT
author: "vjsr007"
created: 2026-04-01
updated: 2026-04-01
priority: P1
tags: [backend, ui, metadata, database]
---

# REQ-022: Game Catalog Database

## Summary
Maintain a local SQLite catalog of all known games per system, sourced from No-Intro (cartridge-based) and Redump (disc-based) DAT files. A new "Catalog" screen lets users browse the full library for any system, see which games they already own, and attach a configurable download URL per system so missing games show a direct download link. The catalog can be synced on demand to stay current with upstream DAT releases.

## User Stories
- **As a** collector, **I want** to see every known game for a system, **so that** I know what I'm missing from my collection.
- **As a** user, **I want** to configure a download URL per system, **so that** I can quickly access ROMs I don't have yet.
- **As a** user, **I want** to sync the catalog on demand, **so that** new DAT releases are reflected without reinstalling the app.
- **As a** user, **I want** to filter the catalog by owned/missing/region, **so that** I can focus on what matters.

## Functional Requirements

### Data Source & Sync
1. **FR-1**: Parse No-Intro DAT/XML files to populate `catalog_games` table. Supported fields: game title, region, SHA-1 hash, MD5 hash, CRC32, file size, serial number.
2. **FR-2**: Parse Redump DAT files for disc-based systems (PS1, PS2, GameCube, Saturn, Dreamcast, etc.).
3. **FR-3**: Provide a "Sync Catalog" action (per-system or all) that downloads the latest DAT files from a configurable source URL and re-imports them into SQLite.
4. **FR-4**: Ship a bundled seed of DAT files for the most popular systems so the catalog works offline on first launch (optional, size permitting).
5. **FR-5**: Track sync metadata: last sync date, DAT version/header, source URL per system.

### Ownership Matching
6. **FR-6**: Cross-reference `catalog_games` against the user's `games` table by SHA-1 hash (primary), then by fuzzy title match (fallback). Mark each catalog entry as owned/missing.
7. **FR-7**: Re-run ownership matching after every ROM scan completes (`REQ-003`).

### Download URLs
8. **FR-8**: Allow the user to configure a base download URL per system in Settings (e.g., `https://my-server.com/roms/snes/`).
9. **FR-9**: Construct per-game download links as `{base_url}/{filename}` where filename comes from the DAT entry.
10. **FR-10**: Clicking a download link opens it in the system default browser (Tauri shell open).

### Catalog Browse Screen
11. **FR-11**: New page `/catalog` accessible from the main navigation, listing all systems with catalog data and a count of owned/total.
12. **FR-12**: Selecting a system shows a searchable, filterable list of all known games with columns: Title, Region, Status (owned/missing), Size, Download link.
13. **FR-13**: Filter options: All / Owned / Missing, Region multi-select, search by title.
14. **FR-14**: Owned games link to the existing game detail page; missing games show the download link (if URL configured).
15. **FR-15**: Gamepad navigable — the catalog screen must work with spatial navigation (`REQ-006` theme engine patterns).

### Configuration
16. **FR-16**: New TOML config section `[catalog]` with:
    - `dat_source_url`: base URL to fetch DAT files (default: a well-known public DAT mirror or GitHub repo)
    - `systems.<system_id>.download_url`: per-system download URL (optional)
    - `auto_sync`: bool — sync on app startup (default: false)

## Non-Functional Requirements
1. **NFR-1**: Performance — Importing a DAT file with 30,000+ entries must complete in under 10 seconds.
2. **NFR-2**: Storage — Catalog DB for all 40+ systems should not exceed 50 MB.
3. **NFR-3**: Offline-first — The catalog browse screen must work fully offline after initial sync.
4. **NFR-4**: Usability — Navigable with gamepad only, following existing spatial nav patterns.
5. **NFR-5**: Incremental sync — Re-syncing a system should replace its entries efficiently (DELETE + bulk INSERT inside a transaction).

## Acceptance Criteria
- [ ] `catalog_games` table exists with fields: id, system_id, title, region, sha1, md5, crc32, file_size, dat_name, dat_version
- [ ] DAT parser handles No-Intro XML and Redump DAT formats
- [ ] "Sync Catalog" downloads and imports DAT files, updating sync metadata
- [ ] Ownership matching correctly identifies owned games by SHA-1 hash
- [ ] Catalog screen shows all games per system with owned/missing status
- [ ] Filter by owned/missing/region works correctly
- [ ] Search by title filters in real-time
- [ ] Download URL per system is configurable in Settings
- [ ] Missing games show clickable download link when URL is configured
- [ ] Gamepad navigation works on the catalog screen
- [ ] Importing a 30K-entry DAT completes in < 10 seconds

## Dependencies
- Depends on: REQ-003 (ROM Scanner — for ownership matching via hashes), REQ-002 (Configuration System — for TOML config)
- Blocked by: none

## Out of Scope
- Automatic ROM downloading (only link to external URL — user downloads manually)
- Hosting or distributing DAT files (user provides source URL or uses default mirror)
- ROM verification/audit against DAT hashes (covered by existing verification service)
- Scraping metadata (box art, description) for catalog entries — that's REQ-012/REQ-015

## Open Questions
- [ ] What is the best default DAT source? Options: (a) GitHub repo with curated DATs, (b) Libretro DAT repo, (c) user must provide their own
- [ ] Should we support TOSEC DATs in addition to No-Intro/Redump?
- [ ] Should catalog entries show box art thumbnails (would require cross-referencing with media manager)?

## References
- [No-Intro DAT-o-Matic](https://datomatic.no-intro.org/) — official No-Intro DAT distribution
- [Redump](http://redump.org/) — disc-based system DATs
- [Libretro DAT repo](https://github.com/libretro/libretro-database) — community-maintained DATs
- LaunchBox has a similar "missing games" feature via their Games Database
- EmulationStation-DE does not have this feature (differentiator for Cubi)
