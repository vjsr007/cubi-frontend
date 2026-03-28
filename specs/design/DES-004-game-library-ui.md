---
id: DES-004
title: "Game Library UI Design"
status: IMPLEMENTED
req: REQ-004
author: architect
created: 2026-03-28
updated: 2026-03-28
tags: [frontend, ui, gamepad]
---

# DES-004: Game Library UI Design

## Overview
Two-panel layout: `SystemList` (192px sidebar) + `[FilterBar + GameGrid]`. Navigation state in `libraryStore`. Gamepad handled by `useGamepad` hook polling `navigator.getGamepads()`.

## UI Layout
```
┌────────────────────────────────────────────────┐
│ Sidebar (64px)  │ SystemList (192px) │ Content  │
│  [Logo]         │  [NES      12]     │ FilterBar│
│  [Library]      │  [SNES      8]     │ ┌──┬──┐ │
│  [Settings]     │  [PS2      45]     │ │🎮│🎮│ │
│                 │  [GBA      23]     │ │  │  │ │
│                 │                    │ └──┴──┘ │
└────────────────────────────────────────────────┘
```

## Component Tree
```
AppShell
├── Sidebar
└── LibraryPage
    ├── SystemList
    └── [FilterBar + GameGrid]
        └── GameCard (×N)
```

## Gamepad Navigation (useGamepad hook)
- Polls `navigator.getGamepads()` via `requestAnimationFrame`
- D-pad / Left stick → move focused game index
- A (btn 0) → launch game
- Y (btn 3) → toggle favorite
- X (btn 2) → open game detail
- Repeat rate: 150ms for directional buttons

## libraryStore Key State
```typescript
selectedSystemId, games[], focusedGameIndex,
searchQuery, sortField, sortOrder, showFavoritesOnly
getFilteredGames() // computed: filter + sort
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-004-01 | AppShell + Sidebar layout | S | TASK-001-02 |
| TASK-004-02 | SystemList component | S | TASK-003-05 |
| TASK-004-03 | GameGrid + GameCard with lazy box art | M | TASK-004-02 |
| TASK-004-04 | useGamepad hook + keyboard nav | M | TASK-004-03 |
| TASK-004-05 | FilterBar (search + sort + favorites) | S | TASK-004-03 |
