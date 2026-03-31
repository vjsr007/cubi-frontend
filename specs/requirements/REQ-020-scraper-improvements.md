---
id: REQ-020
title: "Scraper Improvements — ES-DE Parity"
status: APPROVED
author: "vjsr007"
created: 2026-03-30
updated: 2026-03-30
priority: P1
tags: [metadata, scraper, ui]
---

# REQ-020: Scraper Improvements — EmulationStation-DE Parity

## Summary
Improve the scraper system to match EmulationStation-DE's robustness and UX: automatic fallback chain (try scrapers in priority order), real-time thumbnail preview of the game being scraped, per-game status indicators (success/skip/error), retry logic with backoff for rate-limited APIs, and an "Auto" scraper mode that chains all enabled scrapers.

## User Stories
- **As a** user, **I want** the scraper to automatically try the next source if one fails, **so that** I get maximum coverage without manual intervention.
- **As a** user, **I want** to see a thumbnail of the game currently being scraped, **so that** I can monitor progress visually.
- **As a** user, **I want** to see which games succeeded, failed, or were skipped in a scrollable log, **so that** I can identify issues.
- **As a** user, **I want** the scraper to retry on rate limits, **so that** large libraries scrape reliably.

## Functional Requirements
1. **FR-1**: Auto fallback chain — When a scraper fails for a game, try the next enabled scraper by priority order.
2. **FR-2**: Auto scraper mode — Add an "Auto (all sources)" option that chains all enabled scrapers.
3. **FR-3**: Enhanced progress events — Include `box_art_path` in progress events for real-time thumbnail preview.
4. **FR-4**: Per-game status log — Scrollable list showing each game's scrape result (icon + title + status).
5. **FR-5**: Rate limit retry — On HTTP 429 or ScreenScraper quota errors, wait and retry up to 3 times with exponential backoff.
6. **FR-6**: Scrape speed indicator — Show games/minute rate in progress bar.

## Acceptance Criteria
- [ ] "Auto" mode scrapes using all enabled scrapers, falling back on failure.
- [ ] Progress panel shows thumbnail of current game being scraped.
- [ ] Per-game log shows success/skip/error with game title.
- [ ] Rate-limited requests retry automatically with backoff.
- [ ] All new strings localized in 6 languages.

## Dependencies
- Depends on: REQ-012 (Scraper System)
