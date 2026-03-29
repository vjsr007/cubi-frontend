---
id: REQ-010
title: "Game Box 3D Detail View"
status: APPROVED
author: "copilot"
created: 2026-03-28
updated: 2026-03-28
priority: P1
tags: [ui, theme, media]
---

# REQ-010: Game Box 3D Detail View

## Summary
Replace the flat game detail page in the default theme with a rich, interactive 3D video game box case visualization. When a user clicks a game, a detail view opens showing the game as a physical retail box with front cover, back cover, sides, metadata, video preview, and a launch button. Clicking the box flips it to reveal the back cover. The GameCard in the grid should show video on hover and use better image fallbacks.

## User Stories
- **As a** gamer, **I want** to see a realistic 3D box representation of my game, **so that** browsing feels immersive and physical like a real collection.
- **As a** gamer, **I want** to click the box to flip it, **so that** I can see the back cover art.
- **As a** gamer, **I want** to see a video preview in the detail view, **so that** I know what the gameplay looks like before launching.
- **As a** gamer, **I want** to launch the game from the detail view, **so that** I don't have to go back to the grid.
- **As a** gamer, **I want** hover video and better fallback images on cards, **so that** the library grid looks polished.

## Functional Requirements
1. **FR-1**: GameCard shows video on hover/focus with fallback chain: video → box_art → screenshot → mix_image → title_screen → placeholder.
2. **FR-2**: Clicking a game navigates to a full-screen detail view with a 3D CSS box case.
3. **FR-3**: The box displays front cover (box_art), back cover (back_cover), and colored spine sides.
4. **FR-4**: Clicking the box triggers a 3D Y-axis flip animation (front → back, back → front).
5. **FR-5**: If no back_cover is available, the back face shows metadata (description, developer, year, genre, players).
6. **FR-6**: A video preview section plays the game's video if available.
7. **FR-7**: A "Launch Game" button is prominently visible.
8. **FR-8**: Game metadata (year, genre, developer, publisher, players, rating, play count, last played, file info) is displayed alongside the box.
9. **FR-9**: Keyboard support: Escape/Backspace → go back, Enter → launch, Space → flip box.
10. **FR-10**: Fallback: if no box_art, show a styled placeholder with the game title.

## Non-Functional Requirements
1. **NFR-1**: 3D flip animation completes in ≤ 600ms, uses CSS transform (GPU-accelerated).
2. **NFR-2**: No layout shift during image/video loading (placeholder has fixed aspect ratio).
3. **NFR-3**: Video loads lazily — only starts when detail view is open.

## Acceptance Criteria
- [ ] GameCard shows video on hover/focus, with correct fallback chain
- [ ] Clicking a game card opens the 3D box detail view
- [ ] Box displays front cover; clicking flips to back cover with smooth 3D animation
- [ ] If no back_cover media, back face shows metadata instead
- [ ] Video preview plays in the detail view when video is available
- [ ] Launch button works and starts the emulator
- [ ] Keyboard shortcuts work (Escape, Enter, Space)
- [ ] Graceful fallback when no media is available at all

## Dependencies
- Depends on: REQ-007 (Media Manager — provides GameMedia with box_art, back_cover, video, etc.)
- Depends on: REQ-005 (Game Launcher — launchGame command)

## Out of Scope
- Gamepad navigation for flipping (can be added later)
- HyperSpin theme changes (already handled separately)
- Downloading missing media (handled by useGameMedia hook auto-download)

## Open Questions
- None — all resolved from user requirements.

## References
- Physical video game box case (similar to LaunchBox "Big Box" mode)
- CSS 3D transforms: `perspective`, `rotateY`, `backface-visibility`
