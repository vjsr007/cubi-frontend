# REQ-006 — Theme Engine

**Status:** APPROVED
**Created:** 2026-03-28
**Author:** cubi-frontend team

## Problem Statement
The current UI is fixed — a sidebar + grid layout. Users should be able to switch between completely different UI paradigms (themes) that change the entire look and navigation model of the frontend, not just colors.

## Goals
1. A pluggable theme engine where each theme replaces the entire system/game navigation UI
2. HyperSpin theme as the first custom theme (spinning wheel of systems, game preview)
3. Theme selection persisted in config (`general.theme`)
4. All themes share the same underlying data (Zustand stores, Tauri commands) — only the presentation layer changes
5. Default theme ("default") = current sidebar+grid layout, preserved and unchanged

## Non-Goals
- Per-game custom themes
- Downloading themes from the internet (post-MVP)
- Theme editor UI

## User Stories
- As a user I can go to Settings → Themes and pick a theme from a list
- As a user switching to HyperSpin theme I see a spinning wheel carousel of systems on the right, a game preview on the left, and a Player 1 / Player 2 bottom bar — just like the classic HyperSpin frontend
- As a user the theme I chose persists after restarting the app

## Acceptance Criteria
- [ ] `config.general.theme` drives which theme is rendered
- [ ] At least 2 themes: `default` and `hyperspin`
- [ ] HyperSpin theme: spinning oval wheel on the right, preview panel on the left, bottom bar with player tags
- [ ] HyperSpin theme is fully navigable via keyboard (arrow keys) and gamepad
- [ ] Theme can be changed from Settings without restart
- [ ] No regressions in default theme

## Reference
HyperSpin visual reference: spinning wheel of system oval badges (right), TV-framed game preview (left), metallic dark-red background, Player 1 / Select System / Player 2 bottom bar.
