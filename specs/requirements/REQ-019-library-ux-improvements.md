---
id: REQ-019
title: "Library UX Improvements: Grid Zoom, List View, Search"
status: APPROVED
author: "vjsr007"
created: 2026-03-30
updated: 2026-03-30
priority: P1
tags: [ui, library]
---

# REQ-019: Library UX Improvements — Grid Zoom, List View, Search

## Summary
Three UX improvements to the default theme library page: (1) adjustable grid zoom to control how many columns are displayed, (2) a working list view mode that shows games in a compact table/row format, and (3) an improved search bar with autocomplete suggestions and a clear button.

## User Stories
- **As a** user, **I want** to zoom in/out on the game grid, **so that** I can see more or fewer games at once depending on my screen size and preference.
- **As a** user, **I want** a working list view, **so that** I can browse my library in a compact table format with more metadata visible at a glance.
- **As a** user, **I want** search autocomplete suggestions, **so that** I can quickly find games without typing the full name.
- **As a** user, **I want** a clear button on the search bar, **so that** I can reset my search with one click.

## Functional Requirements
1. **FR-1**: Grid zoom — Add +/- buttons or a slider to adjust grid columns (3–10 range). Persist the column count in the library store.
2. **FR-2**: List view — Create a GameList component that renders games as rows with columns: box art thumbnail, title, system, year, genre, play count, last played, rating.
3. **FR-3**: List view sorting — Clicking column headers sorts by that field.
4. **FR-4**: Search autocomplete — Show a dropdown with top matching game titles as the user types (debounced, max 8 suggestions).
5. **FR-5**: Search clear — Show an × button when search has text, clicking it clears the search.
6. **FR-6**: LibraryPage conditional rendering — Render GameGrid or GameList based on the current viewMode.

## Acceptance Criteria
- [ ] Grid view has zoom controls that change column count between 3 and 10.
- [ ] List view displays games in rows with relevant metadata columns.
- [ ] Switching between grid and list view works correctly.
- [ ] Search shows autocomplete dropdown with matching game titles.
- [ ] Search has a visible clear (×) button when text is present.
- [ ] All new UI text is localized.

## Dependencies
- Depends on: REQ-004 (Game Library UI)

## Out of Scope
- Virtual scrolling / windowing (future optimization)
- Custom column configuration in list view
