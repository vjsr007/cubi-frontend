---
id: REQ-023
title: "Multi-Emulator Per-System Support"
status: DRAFT
author: "architect"
created: 2026-04-02
updated: 2026-04-02
priority: P1
tags: [backend, launcher, ui, settings, configuration]
---

# REQ-023: Multi-Emulator Per-System Support

## Summary
Allow users to select and use alternative emulators for any system (e.g., 3DS with Citra or RetroArch, Nintendo Switch with Yuzu or Ryujinx) instead of being limited to a single primary emulator per system. Users should be able to save their emulator preferences per system and launch games with their chosen emulator in fullscreen mode.

## User Stories
- **As a** power user, **I want** to choose between multiple emulators for the same system, **so that** I can use the best-performing emulator for each game type.
- **As a** emulator enthusiast, **I want** to compare compatibility using different emulators, **so that** I can find the best version for specific games.
- **As a** user, **I want** my emulator choice to be remembered per system, **so that** I don't have to re-select it every time I launch a game.
- **As a** user, **I want** to see available emulators for each system in Settings, **so that** I can easily switch between them.
- **As a** casual player, **I want** to launch a game with one click using my preferred emulator, **so that** the experience is straightforward.

## Functional Requirements
1. **FR-1**: Extend the configuration system to store a per-system emulator preference (e.g., `emulator_preference: {system_id: "emulator_name"}`).
2. **FR-2**: The system maintains a registry of available emulators for each system (e.g., 3DS → [Citra, RetroArch], Switch → [Yuzu, Ryujinx]).
3. **FR-3**: Backend CRUD operations: `get_emulator_preference()`, `set_emulator_preference()`, `get_available_emulators_for_system()`.
4. **FR-4**: The launcher service respects the saved emulator preference and launches the selected emulator.
5. **FR-5**: If no preference is set, the launcher defaults to the first available emulator for that system.
6. **FR-6**: The Settings UI displays available emulators per system with a visual emulator selector.
7. **FR-7**: Users can change the emulator preference and the change takes immediate effect (no app restart needed).
8. **FR-8**: Each emulator choice shows: emulator name, detected/installed status, and installed path (if available).
9. **FR-9**: If a selected emulator is not installed, the launcher falls back to the next available emulator with a warning.

## Non-Functional Requirements
1. **NFR-1**: Performance — Loading emulator preferences and available emulators for all systems should complete in <100ms.
2. **NFR-2**: Usability — Emulator selector must be navigable with gamepad only (no mouse required).
3. **NFR-3**: Reliability — Graceful fallback if the selected emulator is not installed.
4. **NFR-4**: Consistency — Emulator preferences persist across app restarts and maintain state across the entire app lifecycle.

## Acceptance Criteria
- [ ] Database schema extended with `emulator_preferences` table (system_id, selected_emulator_name, created_at, updated_at)
- [ ] AppConfig model includes `emulator_preferences: HashMap<String, String>`
- [ ] Backend command `get_emulator_preference(system_id: String) -> Result<String, String>` returns the preferred emulator name
- [ ] Backend command `set_emulator_preference(system_id: String, emulator_name: String) -> Result<(), String>` persists preference
- [ ] Backend command `get_available_emulators_for_system(system_id: String) -> Result<Vec<SystemEmulatorInfo>, String>` returns all available emulators
- [ ] Launcher service `launch_game()` reads emulator preference and launches the selected emulator
- [ ] Launcher falls back to first available emulator if selected emulator is not installed
- [ ] EmulatorSettings component displays a radio-button or card-based emulator selector
- [ ] Emulator selection persists across app sessions
- [ ] No compiler warnings or lint errors
- [ ] All tests passing
- [ ] Committed with message: `feat(launcher): add multi-emulator selection per system [REQ-023]`

## Dependencies
- Depends on: REQ-002 (Configuration System), REQ-005 (Game Launcher)
- Blocked by: none

## Out of Scope
- Per-game emulator preferences (future: REQ-024)
- Emulator-specific game settings profiles
- Emulator auto-configuration or launch templates beyond current override system
- Web-based emulator registry discovery

## Open Questions
- [ ] Should emulator fallback log to a user-visible notification or just silently use the next available? → **Answer**: Silent fallback with optional warning in verbose logs
- [ ] Should "auto-select best emulator" be an option for users who want automatic behavior? → **Answer**: Out of scope, use default behavior for now

## References
- EmulationStation-DE: Per-system emulator selection via `<emulator>` tag in `es_systems.xml`
- Pegasus: Frontend selector UI for choosing emulator per system in GUI
- LaunchBox: Per-system emulator picker in Library → Library Options
- Citra: Native 3DS emulator, commonly paired with RetroArch
- Yuzu/Ryujinx: Switch emulators, users often compare performance
