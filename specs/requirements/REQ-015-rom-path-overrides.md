---
id: REQ-015
title: "Per-System ROM Path Overrides"
status: IMPLEMENTED
author: "copilot"
created: 2026-03-29
updated: 2026-03-29
priority: P1
tags: [scanner, backend, ui, settings]
---

# REQ-015: Per-System ROM Path Overrides

## Summary
Allow users to override the default ROM path for any individual system while keeping the standard EmulationStation convention (`{data_root}/roms/{system_folder}`) as the default. This enables users with ROMs on multiple drives, NAS mounts, or custom folder layouts to configure each system's path independently.

## User Stories
- **As a** power user, **I want** to override the ROM path for a specific system, **so that** I can have ROMs spread across multiple drives without moving them.
- **As a** NAS user, **I want** to point a system's ROMs to a network share, **so that** my games load from centralized storage.
- **As a** user, **I want** to reset an override back to the default path, **so that** I can undo manual changes easily.
- **As a** user, **I want** to see which systems use custom paths vs defaults, **so that** I can manage my library layout.

## Functional Requirements
1. **FR-1**: The system maintains a per-system ROM path override table in the SQLite database.
2. **FR-2**: CRUD operations are available to get, set, and delete ROM path overrides for any system.
3. **FR-3**: The scanner respects overrides — when a system has a custom path, it scans that path instead of `{data_root}/roms/{folder}`.
4. **FR-4**: Systems without overrides continue using the default EmulationStation convention.
5. **FR-5**: A dedicated "ROM Paths" UI page shows all registered systems with their current path (default or custom).
6. **FR-6**: Users can edit a path inline or browse for a folder using the native OS file dialog.
7. **FR-7**: Users can reset any override back to the default with a single click.
8. **FR-8**: Path validation ensures the custom path exists and is a directory before saving.
9. **FR-9**: The system registry (all known systems) is exposed to the frontend for display.

## Non-Functional Requirements
1. **NFR-1**: Performance — Loading the ROM paths page with all 21+ systems should complete in under 200ms.
2. **NFR-2**: Usability — Filterable system list for quick access to specific systems.
3. **NFR-3**: Reliability — Invalid paths are rejected with clear error messages.

## Acceptance Criteria
- [x] `system_rom_paths` SQLite table exists with `system_id PRIMARY KEY`, `custom_path`, `created_at`
- [x] Backend CRUD: `get_rom_path_overrides`, `set_rom_path_override`, `delete_rom_path_override`
- [x] Scanner Phase 1 scans override paths; Phase 2 scans default `roms/` skipping overridden systems
- [x] Frontend "ROM Paths" page shows all systems with DEFAULT/CUSTOM badges
- [x] Inline editing with folder browser dialog works
- [x] Reset to default removes the override from the database
- [x] Navigation from Settings page via "📁 ROM Paths" button

## Dependencies
- Depends on: REQ-002 (Configuration System), REQ-003 (ROM Scanner)
- Blocked by: none

## Out of Scope
- Auto-detecting ROMs in non-standard locations (future)
- Batch import of paths from another frontend's config
- Recursive system detection inside custom paths

## Open Questions
- None (all resolved during implementation)

## References
- EmulationStation-DE: Uses `es_systems.xml` with per-system `<path>` tag
- Pegasus: Uses `game_dirs.txt` for multiple ROM root directories
- LaunchBox: Fully custom per-platform ROM paths via settings GUI
