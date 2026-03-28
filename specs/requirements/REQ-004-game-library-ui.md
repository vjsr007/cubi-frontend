---
id: REQ-004
title: "Game Library UI"
status: IMPLEMENTED
author: architect
created: 2026-03-28
updated: 2026-03-28
priority: P1
tags: [frontend, ui, gamepad]
---

# REQ-004: Game Library UI

## Summary
Main application UI showing a system list sidebar and game grid with box art. Supports keyboard, mouse, and gamepad (Web Gamepad API) navigation with a 10-foot UI design.

## User Stories
- **As a user**, I want to see all game systems in a sidebar so I can browse by platform
- **As a user**, I want game box art in a grid so I can visually identify games
- **As a couch gamer**, I want full gamepad navigation so I never need a keyboard

## Functional Requirements
1. **FR-1**: Left sidebar lists all scanned systems with name and game count
2. **FR-2**: Selecting a system loads its games in a 6-column grid
3. **FR-3**: `GameCard` shows box art (lazy-loaded), title, play count badge, favorite star
4. **FR-4**: Keyboard navigation: arrow keys to move focus, Enter to launch
5. **FR-5**: Gamepad: D-pad/stick to navigate, A=launch, Y=favorite, X=detail view
6. **FR-6**: Search bar filters by title/genre/developer in real-time
7. **FR-7**: Sort options: title, last played, play count, rating, year
8. **FR-8**: Favorites filter toggle
9. **FR-9**: Empty state with CTA when no games scanned

## Non-Functional Requirements
1. **NFR-1**: Lazy image loading — box art loaded on demand
2. **NFR-2**: Smooth transitions with Framer Motion

## Acceptance Criteria
- [x] System list shows all scanned systems with game counts
- [x] Game grid renders with box art (or placeholder emoji)
- [x] Arrow keys and gamepad D-pad navigate the grid
- [x] Search filters games in real-time

## Dependencies
- Depends on: REQ-001, REQ-003
