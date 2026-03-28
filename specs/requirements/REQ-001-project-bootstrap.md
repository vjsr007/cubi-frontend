---
id: REQ-001
title: "Project Bootstrap & Infrastructure"
status: IMPLEMENTED
author: architect
created: 2026-03-28
updated: 2026-03-28
priority: P0
tags: [backend, frontend, infrastructure]
---

# REQ-001: Project Bootstrap & Infrastructure

## Summary
Initialize the Tauri 2 + React 19 + TypeScript project with all dependencies, build tooling, SQLite database initialization, and basic application shell with routing.

## User Stories
- **As a developer**, I want a working Tauri 2 project scaffold so that I can build features on top of it
- **As a user**, I want a native desktop window that opens with a dark-themed UI so that the app feels native

## Functional Requirements
1. **FR-1**: Tauri 2 application initializes with a 1280×720 native desktop window
2. **FR-2**: React 19 frontend loads inside the WebView with Tailwind CSS 4 dark theme
3. **FR-3**: Zustand stores configured for config, library, and UI state
4. **FR-4**: Page-based navigation (Library, Settings, GameDetail) via uiStore
5. **FR-5**: SQLite database initializes with schema on first launch in app data dir
6. **FR-6**: App config directory created via `directories` crate on first run

## Non-Functional Requirements
1. **NFR-1**: Cold start under 3 seconds on modern hardware
2. **NFR-2**: TypeScript strict mode enabled
3. **NFR-3**: No runtime panics from missing resources

## Acceptance Criteria
- [x] `cargo tauri dev` starts without errors
- [x] React app renders in the window with dark theme
- [x] Database file created in OS app data directory
- [x] All pages render without errors

## Dependencies
- Depends on: None

## Out of Scope
- Authentication, multiplayer, cloud sync

## References
- Tauri 2 documentation: https://v2.tauri.app
