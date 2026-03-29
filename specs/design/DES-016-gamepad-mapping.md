---
id: DES-016
title: "Gamepad Button Mapping with Emulator Integration — Design"
status: IN-PROGRESS
req: REQ-016
author: "copilot"
created: 2026-03-29
updated: 2026-03-29
tags: [gamepad, input, emulator, design-patterns]
---

# DES-016: Gamepad Button Mapping with Emulator Integration — Design

## Overview
A mapping system that bridges physical controller buttons to Cubi UI actions **and** emulator-specific game inputs. Uses the **Strategy pattern** for emulator config export and the **Repository pattern** for profile persistence.

## Architecture

### Design Patterns Used
1. **Strategy Pattern** — `EmulatorExporter` trait with per-emulator implementations (RetroArch, Dolphin, PCSX2, DuckStation, Generic JSON). New emulators → new strategy, zero changes to existing code.
2. **Repository Pattern** — `InputProfileRepository` (DB CRUD) cleanly separates persistence from business logic.
3. **Factory Pattern** — `DefaultPresets::create()` builds the 3 built-in profiles with correct bindings.
4. **Observer Pattern (frontend)** — Zustand `inputMappingStore` propagates profile changes to both the mapping UI and the `useGamepad` hook.

### Module Layout
```
src-tauri/src/
├── models/
│   └── input_mapping.rs      # Data structures (InputProfile, ButtonBinding, etc.)
├── services/
│   └── input_mapping_service.rs  # Presets, validation, export orchestration
│   └── exporters/
│       ├── mod.rs             # EmulatorExporter trait
│       ├── retroarch.rs       # RetroArch exporter strategy
│       ├── dolphin.rs         # Dolphin exporter strategy
│       ├── pcsx2.rs           # PCSX2 exporter strategy
│       ├── duckstation.rs     # DuckStation exporter strategy
│       └── generic_json.rs    # Generic JSON fallback
├── commands/
│   └── input_mapping.rs       # Tauri IPC commands
└── db/
    └── (mod.rs additions)     # Input profile DB methods

src/
├── pages/
│   └── InputMappingPage.tsx   # Main mapping UI
├── stores/
│   └── inputMappingStore.ts   # Zustand store for active profile
├── components/
│   └── input/
│       ├── GamepadDiagram.tsx  # SVG gamepad visual
│       ├── ButtonCaptureModal.tsx # "Press a button" overlay
│       └── ProfileSelector.tsx # Dropdown for profile selection
└── types/
    └── (index.ts additions)
```

## Data Models

### Canonical Actions
```
UI Actions:       ui_confirm, ui_back, ui_menu, ui_tab_left, ui_tab_right,
                  ui_up, ui_down, ui_left, ui_right, ui_page_up, ui_page_down

Game Actions:     game_a, game_b, game_x, game_y,
                  game_l1, game_r1, game_l2, game_r2, game_l3, game_r3,
                  game_start, game_select,
                  game_dpad_up, game_dpad_down, game_dpad_left, game_dpad_right,
                  game_lstick_up, game_lstick_down, game_lstick_left, game_lstick_right,
                  game_rstick_up, game_rstick_down, game_rstick_left, game_rstick_right

Special:          hotkey_menu, hotkey_save_state, hotkey_load_state,
                  hotkey_fast_forward, hotkey_screenshot
```

### Physical Buttons (Standard Gamepad API indices)
```
0: South (A/Cross)      1: East (B/Circle)      2: West (X/Square)      3: North (Y/Triangle)
4: L1/LB               5: R1/RB                6: L2/LT                7: R2/RT
8: Select/Back          9: Start/Menu           10: L3 (stick click)    11: R3 (stick click)
12: D-Up               13: D-Down              14: D-Left              15: D-Right
16: Home/Guide
```

### Rust Structs

```rust
// src-tauri/src/models/input_mapping.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputProfile {
    pub id: String,
    pub name: String,
    pub controller_type: ControllerType, // Xbox, PlayStation, Nintendo, Custom
    pub is_builtin: bool,               // true for factory presets
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ControllerType {
    Xbox,
    PlayStation,
    Nintendo,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonBinding {
    pub profile_id: String,
    pub action: String,         // e.g., "game_a", "ui_confirm"
    pub button_index: i32,      // Standard Gamepad API button index (0-16)
    pub axis_index: Option<i32>,// For analog/axis bindings
    pub axis_direction: Option<String>, // "positive" | "negative"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemProfileAssignment {
    pub system_id: String,
    pub profile_id: String,
}
```

### TypeScript Interfaces

```typescript
export interface InputProfile {
  id: string;
  name: string;
  controller_type: 'Xbox' | 'PlayStation' | 'Nintendo' | 'Custom';
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ButtonBinding {
  profile_id: string;
  action: string;
  button_index: number;
  axis_index?: number;
  axis_direction?: 'positive' | 'negative';
}

export interface SystemProfileAssignment {
  system_id: string;
  profile_id: string;
}

export type InputAction =
  // UI
  | 'ui_confirm' | 'ui_back' | 'ui_menu' | 'ui_tab_left' | 'ui_tab_right'
  | 'ui_up' | 'ui_down' | 'ui_left' | 'ui_right' | 'ui_page_up' | 'ui_page_down'
  // Game
  | 'game_a' | 'game_b' | 'game_x' | 'game_y'
  | 'game_l1' | 'game_r1' | 'game_l2' | 'game_r2' | 'game_l3' | 'game_r3'
  | 'game_start' | 'game_select'
  | 'game_dpad_up' | 'game_dpad_down' | 'game_dpad_left' | 'game_dpad_right'
  // Hotkeys
  | 'hotkey_menu' | 'hotkey_save_state' | 'hotkey_load_state'
  | 'hotkey_fast_forward' | 'hotkey_screenshot';
```

## API Design (Tauri Commands)

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `get_input_profiles` | — | `Vec<InputProfile>` | List all profiles |
| `get_input_profile` | `profile_id` | `InputProfile` | Get single profile |
| `create_input_profile` | `name, controller_type, clone_from?` | `InputProfile` | Create new (optionally clone) |
| `update_input_profile` | `profile_id, name` | `()` | Rename profile |
| `delete_input_profile` | `profile_id` | `()` | Delete (error if builtin) |
| `get_profile_bindings` | `profile_id` | `Vec<ButtonBinding>` | Get all bindings for a profile |
| `set_binding` | `profile_id, action, button_index, axis?` | `()` | Set/update a single binding |
| `reset_profile_bindings` | `profile_id` | `()` | Reset to factory defaults |
| `get_system_profile_assignments` | — | `Vec<SystemProfileAssignment>` | Which profile per system |
| `set_system_profile_assignment` | `system_id, profile_id` | `()` | Assign profile to system |
| `delete_system_profile_assignment` | `system_id` | `()` | Remove per-system override |
| `export_profile_for_emulator` | `profile_id, emulator_name` | `String` | Export as emulator config text |

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS input_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    controller_type TEXT NOT NULL DEFAULT 'Xbox',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS input_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    action TEXT NOT NULL,
    button_index INTEGER NOT NULL DEFAULT -1,
    axis_index INTEGER,
    axis_direction TEXT,
    FOREIGN KEY (profile_id) REFERENCES input_profiles(id) ON DELETE CASCADE,
    UNIQUE(profile_id, action)
);

CREATE TABLE IF NOT EXISTS system_profile_assignments (
    system_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES input_profiles(id) ON DELETE CASCADE
);
```

## Emulator Export — Strategy Pattern

```rust
pub trait EmulatorExporter: Send + Sync {
    fn emulator_name(&self) -> &str;
    fn export(&self, bindings: &[ButtonBinding]) -> Result<String, String>;
    fn file_extension(&self) -> &str;
}
```

### Export Formats

**RetroArch** (`retroarch.cfg` fragment):
```ini
input_player1_a_btn = "1"
input_player1_b_btn = "0"
input_player1_x_btn = "3"
input_player1_y_btn = "2"
input_player1_l_btn = "4"
input_player1_r_btn = "5"
```

**Dolphin** (`GCPadNew.ini` fragment):
```ini
[GCPad1]
Buttons/A = `Button 0`
Buttons/B = `Button 1`
Buttons/X = `Button 2`
Buttons/Y = `Button 3`
```

**PCSX2** (input profile):
```ini
[Pad1]
Type = DualShock2
Cross = SDL-0/Button0
Circle = SDL-0/Button1
Square = SDL-0/Button2
Triangle = SDL-0/Button3
```

**DuckStation**:
```ini
[Controller1]
Type = DigitalController
ButtonCross = Keyboard/Return
ButtonCircle = Keyboard/Backspace
```

**Generic JSON** (fallback):
```json
{
  "profile": "Xbox Standard",
  "bindings": [
    { "action": "game_a", "button_index": 0 }
  ]
}
```

## UI Design

### InputMappingPage Layout
```
┌──────────────────────────────────────────────────────────┐
│ 🎮 Input Mapping                                [Back]   │
├──────────────────────────────────────────────────────────┤
│ Profile: [Xbox Standard ▼]  [+ New] [Clone] [Delete]    │
│ Controller: Xbox | PlayStation | Nintendo | Custom        │
├────────────────────────┬─────────────────────────────────┤
│                        │  UI Actions                     │
│   ┌──────────────┐     │  Confirm    [A]  [remap]        │
│   │  Gamepad SVG  │     │  Back       [B]  [remap]        │
│   │  Diagram      │     │  Menu       [≡]  [remap]        │
│   │  (highlights  │     │  Tab Left   [LB] [remap]        │
│   │   active btn) │     │  Tab Right  [RB] [remap]        │
│   └──────────────┘     │                                 │
│                        │  Game Actions                   │
│   [ Set as Active UI ] │  A (South)  [0]  [remap]        │
│                        │  B (East)   [1]  [remap]        │
│                        │  ...                            │
├────────────────────────┴─────────────────────────────────┤
│ Per-System Assignment                                    │
│ ─────────────────────────────────────────────────────── │
│ PlayStation  → [PS Standard ▼]   [Reset]                 │
│ SNES         → [Nintendo Std ▼]  [Reset]                 │
│ N64          → [Xbox Standard ▼] [Reset]                 │
├──────────────────────────────────────────────────────────┤
│ Export: [RetroArch] [Dolphin] [PCSX2] [DuckStation] [JSON]│
└──────────────────────────────────────────────────────────┘
```

### Button Capture Modal
```
┌─────────────────────────────┐
│ Mapping: "Confirm (A)"      │
│                              │
│ Press a button on your       │
│ controller...                │
│                              │
│ [Detected: Button 0 ✓]      │
│                              │
│ [Save]  [Cancel]             │
└─────────────────────────────┘
```

## Task Breakdown
- TASK-016-01: Data models + DB schema + seeding (Rust)
- TASK-016-02: DB CRUD methods for profiles, bindings, assignments
- TASK-016-03: Tauri commands for profile/binding CRUD
- TASK-016-04: Default preset factory (Xbox, PlayStation, Nintendo)
- TASK-016-05: Emulator exporter trait + RetroArch + Dolphin + PCSX2 + DuckStation + JSON strategies
- TASK-016-06: Frontend types, invoke wrappers, Zustand store
- TASK-016-07: InputMappingPage UI + GamepadDiagram + ButtonCaptureModal
- TASK-016-08: Navigation + theme integration + compile verification
