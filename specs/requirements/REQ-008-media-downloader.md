# REQ-008 — Media Downloader (Internet Fallback)

**Status:** APPROVED
**Created:** 2026-03-28

## Problem
1. Tauri 2 asset protocol not enabled → local files don't load via convertFileSrc()
2. When local scraped media doesn't exist, the UI shows blank placeholders

## Goals
1. Fix asset protocol so local media loads (tauri.conf.json + capabilities)
2. Auto-download game box art from Libretro thumbnails (no auth required)
3. Auto-download system logos from Libretro/public sources
4. Cache downloads in app data dir to avoid re-fetching

## Sources (no credentials required)
- Game box art: `https://thumbnails.libretro.com/{system}/Named_Boxarts/{title}.png`
- Game screenshots: `https://thumbnails.libretro.com/{system}/Named_Snaps/{title}.png`
- System logos: Use colored text-based placeholder (no public source needed)

## Acceptance Criteria
- [ ] Asset protocol enabled → local media loads
- [ ] `download_game_media(game_id)` downloads and caches box art
- [ ] Downloads cached in `{APP_DATA}/media_cache/{system_id}/`
- [ ] Frontend auto-triggers download when local media is empty
- [ ] Progress shown during batch downloads
