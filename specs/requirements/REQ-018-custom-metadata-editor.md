---
id: REQ-018
title: "Custom Game Metadata Editor"
status: APPROVED
author: "vjsr007"
created: 2026-03-30
updated: 2026-03-30
priority: P1
tags: [metadata, ui, media, backend]
---

# REQ-018: Custom Game Metadata Editor

## Summary
Users need the ability to manually edit game metadata (title, description, developer, publisher, year, genre, players, rating, tags) and manage media assets (box art, screenshots, hero art, logos, backgrounds, videos) for any game in their library. This includes uploading local images, importing from URLs, and downloading/encoding videos from YouTube via yt-dlp. This feature fills the gap where scrapers miss or return incorrect data, giving users full control over their library's presentation.

## User Stories
- **As a** collector, **I want** to edit a game's title, description, and other text fields, **so that** I can correct or improve metadata that scrapers got wrong.
- **As a** user, **I want** to upload a custom box art image from my computer, **so that** games without scraped art still look good in my library.
- **As a** user, **I want** to paste an image URL and have it downloaded and assigned to a game, **so that** I don't need to save the file manually first.
- **As a** user, **I want** to download and encode a YouTube video as a game trailer, **so that** I have video previews even for games that scrapers didn't find trailers for.
- **As a** user, **I want** to replace or remove any media asset (images, videos), **so that** I have full control over what's displayed.
- **As a** user, **I want** my manual edits to be preserved when re-running scrapers, **so that** I don't lose customization work.

## Functional Requirements
1. **FR-1**: Text metadata editing — Edit title, description, developer, publisher, year, genre, players, rating, tags, and website for any game.
2. **FR-2**: Image management — Upload local images or import from URL for: box_art, hero_art, logo, background_art, screenshots, fan_art.
3. **FR-3**: Image validation — Validate uploaded/imported images (supported formats: JPG, PNG, WebP; max size: 20MB).
4. **FR-4**: Video management — Upload local video files or download from YouTube URL via yt-dlp.
5. **FR-5**: YouTube integration — Search YouTube for game trailers, preview results, and download selected video with encoding to MP4 (≤1080p).
6. **FR-6**: Media deletion — Remove any individual media asset from a game.
7. **FR-7**: Edit protection — Mark fields as "user-edited" so scrapers don't overwrite manual changes (optional lock per field).
8. **FR-8**: Live preview — Show updated metadata and media in real-time as edits are made.
9. **FR-9**: Undo/Cancel — Discard unsaved changes and revert to previous state.

## Non-Functional Requirements
1. **NFR-1**: Performance — Image imports from URL complete within 10 seconds for typical game art sizes.
2. **NFR-2**: Usability — All editing functions accessible via mouse; gamepad navigation for text fields uses virtual keyboard.
3. **NFR-3**: Storage — Uploaded/imported media stored in app data folder (`media/{system_id}/`) following existing conventions.
4. **NFR-4**: Reliability — Failed downloads (URL, YouTube) show clear error messages without corrupting existing data.

## Acceptance Criteria
- [ ] User can edit all text metadata fields and save changes to the database.
- [ ] User can upload a local image file and assign it to any media slot (box_art, hero_art, etc.).
- [ ] User can paste an image URL and the system downloads and assigns it.
- [ ] User can search YouTube, select a video, and download it as a game trailer.
- [ ] User can delete any individual media asset.
- [ ] Saved edits persist across app restarts.
- [ ] Re-running scrapers does not overwrite user-edited fields (when lock is enabled).
- [ ] All UI text is localized (6 languages: en, es, de, fr, ja, pt).

## Dependencies
- Depends on: REQ-007 (Media Manager), REQ-015 (PC Enhanced Metadata fields in DB)
- External: yt-dlp binary on PATH for YouTube downloads
- Blocked by: none

## Out of Scope
- Batch editing multiple games at once
- AI-powered metadata suggestion/correction
- Image cropping/resizing editor (images stored as-is)
- Custom emulator configuration per game (covered by REQ-017)

## Open Questions
- [x] Storage location for custom media → Use existing `media/{system_id}/` convention in app data

## References
- LaunchBox: Full metadata editor with image drag-and-drop
- EmulationStation-DE: gamelist.xml manual editing
- Pegasus: metadata.txt manual editing
