---
id: DES-008
title: "Media Downloader (Internet Fallback)"
status: IMPLEMENTED
req: REQ-008
author: "vjsr007"
created: 2026-03-31
updated: 2026-03-31
tags: [media, backend, network]
---

# DES-008: Media Downloader (Internet Fallback)

## Overview
Retroactive design spec for the media downloader feature. When local media is not found, the system downloads game box art from Libretro Thumbnails as a fallback. Downloaded media is cached in the app data directory.

## Parent Requirement
- **REQ**: [REQ-008](../requirements/REQ-008-media-downloader.md)

## Architecture Decision

### Data Flow
```
get_game_media → check local paths → if missing → download_game_media
  → Libretro Thumbnails (Named_Boxarts/)
  → Save to {APP_DATA}/media_cache/{system_id}/
  → Update DB field (box_art)
  → Return cached path
```

### Key Decisions
- **Libretro Thumbnails** as primary source — freely available, covers most systems
- **Cache-first** — never re-download if cached file exists
- **Async download** — non-blocking, uses reqwest with streaming
- **Tauri asset protocol** enabled for local file serving in webview

## File Structure
```
Modified files:
├── src-tauri/src/services/downloader_service.rs   (CORE — download + cache logic)
├── src-tauri/src/services/media_service.rs         (fallback integration)
├── src-tauri/src/commands/media.rs                 (download_game_media command)
├── src-tauri/tauri.conf.json                       (asset protocol config)
```

## Task Breakdown
| Task ID | Title | Estimate | Status |
|---------|-------|----------|--------|
| TASK-008-01 | Tauri asset protocol + downloader service | M | COMPLETED |
| TASK-008-02 | Frontend auto-trigger + cache integration | S | COMPLETED |
