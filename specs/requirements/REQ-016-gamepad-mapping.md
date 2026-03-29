---
id: REQ-016
title: "Gamepad Button Mapping with Emulator Integration"
status: IN-PROGRESS
author: "copilot"
created: 2026-03-29
updated: 2026-03-29
priority: P1
tags: [gamepad, input, emulator, settings]
---

# REQ-016: Gamepad Button Mapping with Emulator Integration

## Summary
Allow users to create, edit, and manage custom gamepad button mappings (profiles) that map physical controller inputs (gamepad buttons, triggers, sticks) to logical actions. These mappings are dual-purpose: they control Cubi's own UI navigation **and** can be exported as emulator-specific configuration files so each emulator receives the correct input mapping when a game is launched.

## User Stories
- **As a** user with an Xbox controller, **I want** to customize which button confirms/cancels in the Cubi UI, **so that** the layout matches my preference.
- **As a** user with a DualSense, **I want** to create a profile that maps PS-style buttons, **so that** circle=back and cross=confirm (JP layout).
- **As a** user, **I want** per-system button mappings that auto-apply when launching a game, **so that** each emulator uses my preferred layout.
- **As a** user, **I want** default presets (Xbox, PlayStation, Nintendo), **so that** I don't have to configure everything from scratch.
- **As a** user, **I want** to visually remap buttons on a gamepad diagram, **so that** mapping is intuitive.
- **As a** user, **I want** Cubi to export my mappings to emulator config formats (RetroArch, Dolphin, PCSX2, etc.), **so that** I configure once, play everywhere.

## Functional Requirements
1. **FR-1**: Define a canonical set of logical actions (ui_confirm, ui_back, ui_menu, etc. for UI; and game_a, game_b, game_x, game_y, etc. for gameplay).
2. **FR-2**: Store mapping profiles in SQLite with a name, controller type, and per-action button bindings.
3. **FR-3**: Ship 3 built-in presets: Xbox Standard, PlayStation Standard, Nintendo Standard — these cannot be deleted but can be cloned.
4. **FR-4**: Users can create custom profiles by cloning a preset or from scratch.
5. **FR-5**: Users can assign a profile as the "active" profile for UI navigation.
6. **FR-6**: Users can assign a profile per system (e.g., "use PS layout for PS1/PS2/PS3").
7. **FR-7**: The system can export a profile to emulator-specific config formats:
   - RetroArch: `retroarch.cfg` button remap format
   - Dolphin: GCPadNew.ini / WiimoteNew.ini style
   - PCSX2: PAD.ini format
   - DuckStation: controller settings
   - Generic: JSON export for unsupported emulators
8. **FR-8**: Visual mapping UI with a gamepad SVG diagram showing current bindings.
9. **FR-9**: "Press a button" capture mode — user physically presses a controller button to assign it.
10. **FR-10**: Reset-to-default for any profile brings back the factory preset.

## Non-Functional Requirements
1. **NFR-1**: Loading profiles and mappings completes under 100ms.
2. **NFR-2**: Gamepad SVG diagram renders at 60fps without layout shifts.
3. **NFR-3**: Export to emulator configs is atomic — either fully succeeds or doesn't modify files.

## Acceptance Criteria
- [ ] `input_profiles` and `input_mappings` SQLite tables exist
- [ ] 3 built-in presets seeded on first run
- [ ] CRUD for profiles: list, get, create, update, delete
- [ ] CRUD for mappings: get bindings for profile, set binding, reset to default
- [ ] Per-system profile assignment stored in DB
- [ ] Active UI profile stored in config
- [ ] Export generates valid config for RetroArch, Dolphin, PCSX2, DuckStation
- [ ] Visual mapping page with gamepad diagram
- [ ] "Press a button" capture mode works with real gamepad
- [ ] Navigation from Settings page

## Dependencies
- Depends on: REQ-001 (Project Bootstrap), REQ-005 (Game Launcher), useGamepad hook
- Blocked by: none

## Out of Scope
- Keyboard/mouse mapping (future REQ)
- Per-game mapping profiles (too granular for v1)
- Analog sensitivity curves (emulator-specific concern)
- Writing config files directly into emulator installation dirs (we export, user applies)

## Open Questions
- None

## References
- RetroArch input mapping: `input_player1_*` keys in retroarch.cfg
- Dolphin: GCPadNew.ini `[GCPad1]` section with `Buttons/A`, `Buttons/B`, etc.
- Steam Input: Excellent UX for controller remapping
- AntiMicroX: Open-source gamepad-to-keyboard mapper
