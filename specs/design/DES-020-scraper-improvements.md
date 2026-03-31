---
id: DES-020
title: "Scraper Improvements — ES-DE Parity"
status: APPROVED
req: REQ-020
author: "vjsr007"
created: 2026-03-31
updated: 2026-03-31
tags: [scraper, ux, backend]
---

# DES-020: Scraper Improvements — ES-DE Parity

## Overview
Improvements to bring the scraper system to feature parity with ES-DE. Includes auto fallback chains, rate limit retry with exponential backoff, enhanced progress events with thumbnail preview, per-game status log, and scrape speed indicator.

## Parent Requirement
- **REQ**: [REQ-020](../requirements/REQ-020-scraper-improvements.md)

## Architecture Decision

### Auto Fallback Chain
When a scraper fails for a game, automatically try the next enabled scraper by priority order. The chain stops on first success.

```
Scraper A (priority 1) → fail → Scraper B (priority 2) → fail → Scraper C (priority 3) → success
```

### Rate Limit Retry
- Detect HTTP 429 / rate limit responses
- Exponential backoff: 2s → 4s → 8s (max 3 retries)
- Per-scraper rate tracking

### Enhanced Progress Events
- `box_art_path` field in progress event for thumbnail preview during scrape
- Per-game status log (success/skip/error with reason)
- Games-per-minute speed indicator calculated from running average

### UI Enhancements
- Scrollable per-game log in ScrapeJobPanel
- Thumbnail preview column showing downloaded box art
- Speed indicator badge

## File Structure
```
Modified files:
├── src-tauri/src/services/scraper_service.rs       (fallback chain, retry, speed tracking)
├── src-tauri/src/commands/scraper.rs                (enhanced progress events)
├── src/components/scraper/ScrapeJobPanel.tsx         (per-game log, thumbnail, speed)
```

## Task Breakdown
| Task ID | Title | Estimate | Status |
|---------|-------|----------|--------|
| TASK-020-01 | Backend: auto fallback chain + rate limit retry | M | NOT_STARTED |
| TASK-020-02 | Backend: enhanced progress events (thumbnail, speed) | S | NOT_STARTED |
| TASK-020-03 | Frontend: per-game log, thumbnail preview, speed indicator | M | NOT_STARTED |
