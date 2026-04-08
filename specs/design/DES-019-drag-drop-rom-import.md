---
id: DES-019
title: "Drag & Drop ROM Import Dialog Design"
status: APPROVED
req: REQ-019
author: designer
created: 2026-03-30
updated: 2026-03-30
tags: [frontend, ux, rom-management, ui-component]
---

# DES-019: Drag & Drop ROM Import Dialog Design

## Overview
Implement a drag-and-drop target zone for the app window with a multi-step import wizard dialog. Users drag files → dialog appears → 4-step form collects metadata → ROM is imported.

## UX Flow

```
User drags file(s) → Drop handler → Analyze file type
        ↓
    Dialog Opens
        ↓
Step 1: "What type of ROM?"
  - Native ROM File (extension-based)
  - Windows Executable (.exe/.bat)
        ↓
Step 2: "Which system?"
  - Dropdown (pre-filtered by previous selection)
  - Only shows systems compatible with extension
        ↓
Step 3: "Which emulator?"
  - Dropdown (filtered by selected system)
        ↓
Step 4: "Game name?"
  - Text input (defaults to filename without extension)
  - Preview of target path
        ↓
[Review] → [Cancel] [Import]
        ↓
    Copying/Moving File...
        ↓
    Success → Library Updated
```

## Component Architecture

### New Components

#### `DragDropZone.tsx` (Layout wrapper)
- Wraps entire `<App />` or `<LibraryPage />`
- Listens to `drag`, `dragover`, `drop` events
- Shows visual drop indicator (border highlight, semi-transparent overlay)
- On drop: extracts file paths, triggers import dialog

#### `ImportRomDialog.tsx` (Wizard container)
- Modal dialog with 4 steps
- Zustand store for form state
- Validates at each step
- Gamepad-navigable (arrow keys, enter, escape)

#### `ImportStep1SystemType.tsx` (Radio buttons)
```tsx
<RadioGroup label="ROM Type">
  <Radio value="native" label="Native ROM File (.nes, .iso, etc)" />
  <Radio value="executable" label="Windows Executable (.exe, .bat)" />
</RadioGroup>
```

#### `ImportStep2SelectSystem.tsx` (Filtered dropdown)
```tsx
<Select
  label="Game System"
  options={systemsFilteredByType}
  helpText="Only systems compatible with detected file type"
/>
```

#### `ImportStep3SelectEmulator.tsx` (Emulator dropdown)
```tsx
<Select
  label="Emulator"
  options={emulatorsForSystem}
  helpText="Primary emulator will be default, hold Shift for alternatives"
/>
```

#### `ImportStep4GameName.tsx` (Text input)
```tsx
<TextInput
  label="Game Name"
  defaultValue={filenameWithoutExtension}
  helpText="Target folder: {system_path}/{validated_name}/"
/>
```

### Zustand Store (`stores/importStore.ts`)
```typescript
interface ImportState {
  step: 1 | 2 | 3 | 4;
  droppedFiles: File[];
  
  // Step 1
  romType: 'native' | 'executable';
  
  // Step 2
  selectedSystemId: string;
  
  // Step 3
  selectedEmulatorId: string;
  
  // Step 4
  gameName: string;
  
  // Actions
  goToStep: (step: number) => void;
  setRomType: (type) => void;
  setSystemId: (id) => void;
  setEmulatorId: (id) => void;
  setGameName: (name) => void;
  reset: () => void;
}
```

## Rust Backend Changes

### New Tauri Commands

#### `import_rom` Command
```rust
#[tauri::command]
pub async fn import_rom(
    app: AppHandle,
    rom_path: String,           // Source file path
    system_id: String,          // Destination system
    emulator_id: String,        // Chosen emulator
    game_name: String,          // User-provided name
    rom_type: String,           // "native" or "executable"
) -> Result<GameInfo, String> {
    // 1. Validate inputs
    // 2. Get target folder path (data_root/systems/{system_id}/)
    // 3. Copy/move file to target folder
    // 4. Generate hash for database
    // 5. Create GameInfo entry
    // 6. Insert into database
    // 7. Return GameInfo
}
```

#### `analyze_dropped_files` Command (optional, for preview)
```rust
#[tauri::command]
pub async fn analyze_dropped_files(
    file_paths: Vec<String>
) -> Result<Vec<FileAnalysis>, String> {
    // For each file, detect:
    // - Is it .exe? .zip? .7z?
    // - If ROM, which system detection could apply?
    // - Is it a valid ROM?
}
```

## Implementation Details

### Step Validation Rules

| Step | Validation | Error Message |
|------|-----------|---------------|
| 1 | At least one file selected | "No files selected" |
| 2 | System selected | "Please select a system" |
| 3 | Emulator selected | "Please select an emulator" |
| 4 | Game name not empty | "Game name required" |

### File Handling
- **Copy vs Move**: Copy by default (safer), add option for move
- **Existing file**: Warn if file already exists, allow rename (add _2, _3, etc.)
- **Large files**: Show progress bar for files > 100MB
- **Folder drops**: If user drops folder, scan for ROMs and offer multi-import (future)

## Design Decisions

| Decision | Rationale | Alternative |
|----------|-----------|------------|
| Modal dialog | Focused UX, prevents accidental actions | Non-modal side panel |
| 4 steps separate | Clear progression, validation at each step | Single form with all fields |
| Auto-filter systems | Reduces user error, faster workflow | Manual selection |
| Gamepad support | Consistent with app design | Keyboard/mouse only |

## Task Breakdown
| Task ID | Title | Est. |
|---------|-------|-----|
| TASK-019-01 | Create DragDropZone component + drop handler | M |
| TASK-019-02 | Create ImportRomDialog + Zustand store | M |
| TASK-019-03 | Create all 4 step components | M |
| TASK-019-04 | Implement Tauri import_rom command | M |
| TASK-019-05 | Add gamepad navigation to dialog | S |
| TASK-019-06 | Add file copy/move logic, progress UI | M |
| TASK-019-07 | Integration test + edge cases | M |
