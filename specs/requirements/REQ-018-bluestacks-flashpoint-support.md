---
id: REQ-018
title: "BlueStacks and Ruffle Flash Emulator Support"
status: APPROVED
author: user
created: 2026-03-30
priority: P1
tags: [backend, emulator-support, new-systems]
---

# REQ-018: BlueStacks and Ruffle Flash Emulator Support

## Summary
Add native support for BlueStacks (Android emulator) and local Adobe Flash games launched through Ruffle within cubi-frontend.

## User Stories
- **As a retro gaming enthusiast**, I want to launch Android games through BlueStacks from cubi-frontend so that I have a unified interface for all my games
- **As a Flash game collector**, I want my local `.swf` library integrated into cubi-frontend so that Flash games appear alongside other ROMs

## Functional Requirements
1. **FR-1**: BlueStacks system added to system registry with support for `.apk` files
2. **FR-2**: Flash system added with support for local `.swf` files
3. **FR-3**: Launcher detects and auto-configures BlueStacks installation paths
4. **FR-4**: Launcher detects and auto-configures Ruffle installation paths
5. **FR-5**: Flash launch flow supports configurable fullscreen, spoof link, and renderer options
6. **FR-6**: Both systems support game metadata import from `gamelist.xml`
7. **FR-7**: Media (artwork, screenshots) can be downloaded for both systems

## Non-Functional Requirements
1. **NFR-1**: BlueStacks auto-detection works for standard installation paths
2. **NFR-2**: Ruffle auto-detection works for common Windows install paths
3. **NFR-3**: Flash games integrate seamlessly with the existing ROM scanner and launcher override model

## Acceptance Criteria
- [ ] BlueStacks appears in system list when installed
- [ ] Flash system appears with correct game count when configured
- [ ] Launching Android `.apk` files opens in BlueStacks
- [ ] Launching local `.swf` games opens in Ruffle
- [ ] Ruffle fullscreen, spoof link, and renderer options are configurable from Emulator General Settings
- [ ] Metadata scraping works for both systems

## Technical Notes
- BlueStacks: Windows executable management, `.apk` file detection
- Ruffle: Local `.swf` scanning, Windows executable detection, CLI launch arguments (`--fullscreen`, `--graphics`, `--spoof-url`)

## Out of Scope
- iOS/tvOS game emulation
- Embedded browser playback for Flash games
- HTML-based Flashpoint package support
