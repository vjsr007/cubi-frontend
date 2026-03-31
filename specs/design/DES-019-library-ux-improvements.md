---
id: DES-019
title: "Library UX Improvements: Grid Zoom, List View, Search"
status: APPROVED
req: REQ-019
author: "vjsr007"
created: 2026-03-30
updated: 2026-03-30
tags: [ui, library]
---

# DES-019: Library UX Improvements

## Overview
Three improvements to LibraryPage: (1) add gridColumns state to store + zoom buttons in FilterBar, (2) create GameList component for list view and wire viewMode in LibraryPage, (3) enhance FilterBar search with autocomplete dropdown and clear button.

## Parent Requirement
- **REQ**: [REQ-019](../requirements/REQ-019-library-ux-improvements.md)

## Task Breakdown
| Task ID | Title | Estimate |
|---------|-------|----------|
| TASK-019-01 | Grid zoom + List view + Search improvements | L |

## File Structure
```
Modified files:
├── src/stores/libraryStore.ts           (ADD gridColumns state)
├── src/components/library/FilterBar.tsx  (ADD zoom buttons, clear button, autocomplete)
├── src/components/library/GameGrid.tsx   (USE gridColumns from store)
├── src/components/library/GameList.tsx   (NEW — list view component)
├── src/pages/LibraryPage.tsx             (CONDITIONAL grid/list rendering)
├── src/i18n/locales/*.ts                 (ADD new keys)
├── src/i18n/index.ts                     (ADD new keys to type)
```
