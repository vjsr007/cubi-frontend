---
id: REQ-019
title: "Drag & Drop ROM Import with Configuration Dialog"
status: APPROVED
author: user
created: 2026-03-30
priority: P1
tags: [frontend, ux, rom-management]
---

# REQ-019: Drag & Drop ROM Import with Configuration Dialog

## Summary
Enable users to drag and drop ROM files and executables onto the cubi-frontend window, triggering an interactive dialog that collects necessary metadata (ROM type, system, emulator, game name) before importing.

## User Stories
- **As a user**, I want to drag ROMs directly onto the app so that importing games is faster than manual folder navigation
- **As a user**, I want to be prompted for game details during import so that metadata is correct from the start
- **As a power user**, I want to import both native ROM files and Windows executables so that I can add standalone games

## Functional Requirements
1. **FR-1**: Window receives drop events for files and folders
2. **FR-2**: Dialog appears on drop with step-by-step form for file classification
3. **FR-3**: User selects ROM type: "Native ROM File" or "Windows Executable"
4. **FR-4**: If "Native ROM", user selects game system from dropdown (pre-filtered by extension)
5. **FR-5**: User selects emulator from available emulators for chosen system
6. **FR-6**: User enters/edits game name (defaults to ROM filename without extension)
7. **FR-7**: Dialog shows preview of target ROM file location
8. **FR-8**: On confirm, ROM is moved/copied to target folder and imported into database

## Non-Functional Requirements
1. **NFR-1**: Dialog is modal and gamepad-navigable
2. **NFR-2**: Form validates before allowing submit
3. **NFR-3**: Large file copying shows progress indicator
4. **NFR-4**: Drag & drop works for single files and multi-file selection

## Acceptance Criteria
- [ ] Drag file onto app window triggers import dialog
- [ ] System dropdown correctly filters by compatible ROM extensions
- [ ] Emulator dropdown shows only emulators compatible with selected system
- [ ] Game name defaults to filename, is editable
- [ ] ROM appears in library after successful import
- [ ] Database and filesystem are consistent after import

## UX Considerations
- Multi-step dialog (Rom Type → System → Emulator → Game Name)
- Cancel at any step without data loss
- Success confirmation with play button
