---
id: REQ-020
title: "Context Menu Override for Desktop App UX"
status: APPROVED
author: user
created: 2026-03-30
priority: P2
tags: [frontend, ux, input-handling]
---

# REQ-020: Context Menu Override for Desktop App UX

## Summary
Disable or replace the default HTML right-click context menu with a custom game-centric context menu to prevent the native browser context menu from appearing and breaking the desktop app UX.

## User Stories
- **As a user**, I should not see browser context menu options (inspect, reload, etc.) when right-clicking so that it feels like a native app
- **As a dev**, I want to prevent accidental browser inspection that could confuse users

## Functional Requirements
1. **FR-1**: Right-click on game cards opens custom context menu (or closes without menu)
2. **FR-2**: Standard browser context menu never appears
3. **FR-3**: Copy/Paste shortcuts (Ctrl+C/V) continue to work in text inputs
4. **FR-4**: Gamepad right-trigger behavior is not affected
5. **FR-5**: Optional: Game-specific actions available in custom context menu (Edit, Delete, Open Folder, etc.)

## Non-Functional Requirements
1. **NFR-1**: Context menu override applies globally to entire app
2. **NFR-2**: No performance impact from event listeners
3. **NFR-3**: Works with both mouse and gamepad contexts

## Acceptance Criteria
- [ ] Right-clicking anywhere in app does not show browser context menu
- [ ] Text selection and copy still work in input fields
- [ ] Custom context menu (if implemented) is gamepad-navigable

## Implementation Approach
**Option A** (No Custom Menu): Prevent default, show nothing
**Option B** (Custom Menu): Show game-relevant actions (Edit, Delete, Rescan, etc.)

**Recommendation**: Start with Option A, upgrade to Option B if needed.
