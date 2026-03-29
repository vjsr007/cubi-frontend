---
id: REQ-009
title: "System Logos"
status: APPROVED
author: "copilot"
created: 2026-03-28
updated: 2026-03-28
priority: P2
tags: [ui, theme, media]
---

# REQ-009: System Logos

## Summary
Replace plain text system names with high-quality SVG logos throughout the UI. Each emulator system (NES, SNES, PS2, etc.) should display its official-looking logo instead of text labels, providing a visually rich and recognizable experience similar to EmulationStation-DE, LaunchBox, and Pegasus frontends.

## User Stories
- **As a** user browsing my library, **I want** to see recognizable system logos in the sidebar, **so that** I can quickly identify each platform visually without reading text.
- **As a** user in the HyperSpin theme, **I want** the spinning wheel to show system logos instead of text ovals, **so that** the UI feels like an authentic arcade frontend.
- **As a** user viewing system details, **I want** the system logo displayed in the preview panel, **so that** the UI looks polished and professional.

## Functional Requirements
1. **FR-1**: Bundle SVG logos for all 20+ supported systems as static assets in `src/assets/system-logos/`.
2. **FR-2**: Create a reusable `SystemLogo` component that renders a system's SVG logo given a `systemId`, with text fallback when no logo exists.
3. **FR-3**: Default theme — Show system logos in `SystemList` sidebar alongside (or replacing) the text name.
4. **FR-4**: HyperSpin theme — Show system logos inside the `WheelCarousel` oval badges instead of text labels.
5. **FR-5**: HyperSpin theme — Show system logo in the `PreviewPanel` when in system-selection mode.
6. **FR-6**: SVG logos must render as white/light by default (using CSS `filter` or `currentColor`) to work on dark backgrounds.

## Non-Functional Requirements
1. **NFR-1**: Performance — SVGs are bundled at build time via Vite import; no runtime network requests.
2. **NFR-2**: Scalability — SVG format ensures logos look crisp at any resolution (1080p, 4K, etc.).
3. **NFR-3**: Licensing — All logos sourced from CC0 (public domain) repository; safe for redistribution.
4. **NFR-4**: Graceful fallback — If a logo is missing for a system, display the text name instead.

## Acceptance Criteria
- [ ] SVG logos exist in `src/assets/system-logos/` for all systems in the registry.
- [ ] `SystemLogo` component renders logo by `systemId` with text fallback.
- [ ] Default theme sidebar shows logos next to system names.
- [ ] HyperSpin wheel shows logos inside badges instead of text.
- [ ] HyperSpin preview panel shows system logo when viewing a system.
- [ ] All logos visible at different sizes without quality loss.
- [ ] Application builds without errors (`cargo tauri dev`).

## Source
- **Repository**: [Siddy212/canvas-es-de](https://github.com/Siddy212/canvas-es-de)
- **Directory**: `_inc/system-logo/`
- **License**: CC0 1.0 Universal (public domain)
- **Format**: SVG (vector, scalable)
