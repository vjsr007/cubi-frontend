---
id: DES-001
title: "Project Bootstrap Design"
status: IMPLEMENTED
req: REQ-001
author: architect
created: 2026-03-28
updated: 2026-03-28
tags: [backend, frontend, infrastructure]
---

# DES-001: Project Bootstrap Design

## Overview
Standard Tauri 2 project using Vite + React 19 + TypeScript. No react-router-dom — navigation managed by a Zustand `uiStore` with a `currentPage` enum. SQLite initialized in Tauri `setup()` hook.

## Architecture Decision

### Approach
Page-based navigation via Zustand instead of React Router to keep the bundle smaller and avoid URL-based navigation (which doesn't make sense for a desktop app).

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| React Router 7 | Familiar, history | URL-based, overkill for desktop | Rejected |
| Zustand uiStore | Simple, zero overhead | No browser history | **Selected** |

## Data Models

### TypeScript
```typescript
type Page = 'library' | 'settings' | 'game-detail';
interface UiState {
  currentPage: Page;
  selectedGameId: string | null;
}
```

## File Structure
```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── capabilities/default.json
└── src/
    ├── main.rs
    └── lib.rs
src/
├── main.tsx
├── App.tsx
├── index.css
└── stores/uiStore.ts
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-001-01 | Create Tauri + Vite project config files | M | — |
| TASK-001-02 | React app shell with AppShell + Sidebar + pages | M | TASK-001-01 |
| TASK-001-03 | SQLite DB initialization in Tauri setup | S | TASK-001-01 |
