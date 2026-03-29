# REQ-007 — Media Manager

**Status:** APPROVED
**Created:** 2026-03-28

## Problem Statement
The app ignores the 58K+ scraped media files (images, videos, audio) already on disk. These assets are produced by ES-DE/ScreenScraper and live in two locations. The UI should use them to create a rich, immersive experience — showing box art, screenshots, video snaps, and playing audio.

## Goals
1. Resolve all available media for each game from dual locations:
   - `{DATA_ROOT}/storage/downloaded_media/{FullSystemName}/{type}/` (13 types)
   - `{DATA_ROOT}/roms/{system_id}/downloaded_images/` (box art fallback)
2. Display images: box art, screenshots, fan art, mix images, wheel/logo, title screens
3. Play video snaps (with audio) when a game is focused/selected
4. Display system-level fanart as background in HyperSpin theme
5. Audio: play video audio when viewing game; system theme audio if available
6. Lazy loading — do NOT load all 58K files at startup
7. Graceful fallback when media is missing

## Non-Goals
- Downloading/scraping new media (that's REQ-008)
- Thumbnail generation (post-MVP optimization)
- Manual/PDF viewer

## Acceptance Criteria
- [ ] `get_game_media(game_id)` Tauri command returns all available media paths
- [ ] `get_system_media(system_id)` returns system-level fanart + wheel
- [ ] PreviewPanel shows video snap if available (with audio), else best image
- [ ] HyperSpin PreviewPanel background uses system fanart
- [ ] GameCard shows box art from downloaded_media first, downloaded_images as fallback
- [ ] Video plays/pauses automatically when game is focused/unfocused
- [ ] Mute toggle for video/audio
- [ ] No media = graceful placeholder, no errors

## Reference
Media skill: `.claude/skills/media-manager/SKILL.md`
Emulator domain: `.claude/skills/emulator-domain/SKILL.md` (system name mapping)
