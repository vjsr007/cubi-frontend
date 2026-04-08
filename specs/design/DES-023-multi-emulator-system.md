---
id: DES-023
title: "Multi-Emulator Per-System Support Design"
status: DRAFT
req: REQ-023
author: "architect"
created: 2026-04-02
updated: 2026-04-02
tags: [backend, launcher, ui, settings, configuration, database]
---

# DES-023: Multi-Emulator Per-System Support Design

## Overview
This design extends cubi-frontend to support multiple emulator choices per system. The architecture involves three phases: (1) database/config expansion to store per-system emulator preferences, (2) backend CRUD commands to manage preferences and query available emulators, and (3) frontend UI enhancements to the Settings page for emulator selection.

The approach leverages the existing `EmulatorDef` registry in `launcher_service.rs` to determine which emulators support each system, then adds a preference layer (SQLite table + config) to persist user choices.

## Parent Requirement
- **REQ**: [REQ-023 — Multi-Emulator Per-System Support](../requirements/REQ-023-multi-emulator-system.md)

## Architecture Decision

### Approach
1. **Database Layer**: Add `emulator_preferences` SQLite table to persist user choices per system.
2. **Config Layer**: Extend `AppConfig` with `emulator_preferences: HashMap<String, String>` (system_id → emulator_name).
3. **Launcher Layer**: Modify `launch_game()` to look up the selected emulator, validate it's installed, and fallback if needed.
4. **Frontend Layer**: Create `EmulatorSelector` component and integrate into `EmulatorSettingsPage.tsx`.
5. **IPC Layer**: Add Tauri commands to get/set preferences and query available emulators per system.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Store in JSON config file only (no DB) | Simpler, no DB migration | Version control conflicts, no structured queries | Rejected |
| Per-game emulator preferences | Maximum flexibility | Overcomplicated, storage overhead, UI clutter | Rejected — defer to REQ-024 |
| Hardcoded "best emulator" per system | No user choice needed | Opinionated, less flexible | Rejected |
| **Use existing EmulatorDef registry + preference storage** | Reuses existing registry, minimal changes, persistent | Requires DB schema change | **Selected** |

## Data Models

### Rust (src-tauri)
```rust
// In src-tauri/src/models/config.rs
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub paths: PathsConfig,
    #[serde(default)]
    pub scanner: ScannerConfig,
    #[serde(default)]
    pub emulators: HashMap<String, EmulatorOverride>,
    /// Per-system emulator preference (system_id → emulator_name).
    #[serde(default)]
    pub emulator_preferences: HashMap<String, String>,  // NEW
    #[serde(default)]
    pub pc_metadata: PcMetadataConfig,
    #[serde(default)]
    pub catalog: CatalogConfig,
}

// In src-tauri/src/models/emulator.rs (new file)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmulatorChoice {
    pub emulator_name: String,
    pub detected_path: Option<String>,
    pub is_installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEmulatorChoice {
    pub system_id: String,
    pub system_name: String,
    pub available_emulators: Vec<EmulatorChoice>,
    pub selected_emulator: Option<String>,  // From preference or first available
}
```

### TypeScript (src)
```typescript
// src/types/emulator.ts (new file)
export interface EmulatorChoice {
  emulatorName: string;
  detectedPath: string | null;
  isInstalled: boolean;
}

export interface SystemEmulatorChoice {
  systemId: string;
  systemName: string;
  availableEmulators: EmulatorChoice[];
  selectedEmulator: string | null;
}

export interface EmulatorPreference {
  systemId: string;
  emulatorName: string;
}
```

## API Design (Tauri Commands)

### Command: `get_available_emulators_for_system`
```rust
#[tauri::command]
pub async fn get_available_emulators_for_system(
    system_id: String,
    app_config: tauri::State<'_, AppConfig>,
    emudeck_path: String,
) -> Result<SystemEmulatorChoice, String> {
    // Queries EmulatorDef registry, finds all emulators supporting system_id
    // Checks if each is installed, returns list with detected_path and is_installed
    // Looks up current preference from app_config
    // Returns SystemEmulatorChoice with selected_emulator set
}
```

**Frontend invocation:**
```typescript
const result = await invoke<SystemEmulatorChoice>(
  'get_available_emulators_for_system',
  { systemId: 'switch' }
);
```

### Command: `set_emulator_preference`
```rust
#[tauri::command]
pub async fn set_emulator_preference(
    system_id: String,
    emulator_name: String,
) -> Result<(), String> {
    // Validates emulator_name is in registry for system_id
    // Saves to database and reloads app_config
    // Returns error if emulator not supported for system
}
```

### Command: `get_emulator_preference`
```rust
#[tauri::command]
pub async fn get_emulator_preference(
    system_id: String,
    app_config: tauri::State<'_, AppConfig>,
) -> Result<String, String> {
    // Returns stored preference or "" if not set
    // Frontend can interpret "" as "use default"
}
```

### Command: `get_all_systems_with_emulators`
```rust
#[tauri::command]
pub async fn get_all_systems_with_emulators(
    app_config: tauri::State<'_, AppConfig>,
) -> Result<Vec<SystemEmulatorChoice>, String> {
    // Returns all known systems with their available emulators and current preference
    // Used by settings page to show a full list
}
```

## Database Schema

```sql
-- Create table for emulator preferences
CREATE TABLE IF NOT EXISTS emulator_preferences (
    system_id TEXT PRIMARY KEY,
    selected_emulator TEXT NOT NULL,  -- Emulator name from registry
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Existing tables unchanged
-- emulator_registry: (already managed via Rust code)
-- game_data, system_rom_paths, etc.: unchanged
```

## UI Design

### EmulatorSettings Component Layout
```
┌─────────────────────────────────────────────────────────┐
│  EMULATOR SETTINGS                                      │
├─────────────────────────────────────────────────────────┤
│  Nintendo 3DS                                    ◀  ▶   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ○ RetroArch (installed) ~/emudeck/RetroArch/*    │  │
│  │ ● Citra (not installed) [auto-detected path]     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Nintendo Switch                                 ◀  ▶   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ○ Ryujinx (installed) ~/emudeck/Ryujinx/*        │  │
│  │ ● Yuzu (not installed)                           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [← Back]  [Apply]                                     │
└─────────────────────────────────────────────────────────┘
```

### Component Tree
```
EmulatorSettingsPage
├── SystemSelector (horizontal carousel or list)
│   └── SystemOption (radio-like card)
├── EmulatorSelector (shows available emulators for selected system)
│   ├── EmulatorRadioCard (repeating)
│   │   ├── EmulatorName
│   │   ├── InstalledBadge / NotInstalledBadge
│   │   └── DetectedPathLabel
└── ActionBar
    ├── BackButton
    └── ApplyButton
```

### Gamepad Navigation Flow
1. **L/R Bumpers** or **LFT/RGT**: Cycle through systems in the horizontal selector
2. **UP/DOWN**: Navigate between emulator radio cards for current system
3. **A/Select**: Toggle emulator selection
4. **B**: Go back
5. **START/Menu**: Save and apply

## File Structure

New/modified files:
```
src-tauri/
├── src/
│   ├── models/
│   │   ├── config.rs               # MODIFY: Add emulator_preferences field
│   │   ├── emulator.rs             # CREATE: EmulatorChoice, SystemEmulatorChoice
│   │   └── mod.rs                  # MODIFY: Export emulator module
│   ├── services/
│   │   ├── launcher_service.rs     # MODIFY: launch_game() uses preference
│   │   ├── preferences_service.rs  # CREATE: CRUD for emulator preferences
│   │   └── mod.rs                  # MODIFY: Export preferences_service
│   ├── commands/
│   │   ├── emulator_commands.rs    # CREATE: get/set preference, get available
│   │   └── mod.rs                  # MODIFY: Register emulator_commands
│   └── db/
│       └── mod.rs                  # MODIFY: DB init to create emulator_preferences table

src/
├── types/
│   └── emulator.ts                 # CREATE: EmulatorChoice, SystemEmulatorChoice
├── components/
│   └── settings/
│       ├── EmulatorSelector.tsx    # CREATE: Radio card selector
│       └── SystemCarousel.tsx      # CREATE or MODIFY: System carousel
├── pages/
│   └── EmulatorSettingsPage.tsx    # MODIFY: Add EmulatorSelector integration
├── hooks/
│   └── useEmulatorPreferences.ts   # CREATE: Custom hook for preference CRUD
└── lib/
    └── emulator.ts                 # CREATE: Helper functions for emulator logic
```

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-023-01 | Database schema + config model expansion | M | — |
| TASK-023-02 | Backend preferences service + commands | M | TASK-023-01 |
| TASK-023-03 | Launcher service integration | M | TASK-023-02 |
| TASK-023-04 | EmulatorSelector React component | M | — |
| TASK-023-05 | Settings page integration + navigation | M | TASK-023-02, TASK-023-04 |

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| User selects unavailable emulator | High | Launcher validates preference exists on launch; falls back to first available with warning |
| Database migration fails | High | Provide migration script in db module; test with existing databases |
| Multiple systems, many emulators → UI clutter | Medium | Use carousel/tabs to show one system at a time; searchable list as fallback |
| Emulator path changes after install | Low | Re-detect paths on app start; store relative paths where possible |
| Performance: loading all emulators for all systems | Medium | Cache query result in Zustand; invalidate on preference change only |

## Testing Strategy
- **Unit tests**: 
  - `preferences_service::set_preference()` with valid/invalid inputs
  - `preferences_service::get_preference()` with stored/default values
  - Emulator fallback logic when preferred emulator not installed
  
- **Integration tests**:
  - Database: create emulator_preferences table, insert/select/update operations
  - IPC: commands return correct SystemEmulatorChoice structures
  - Launcher: validate correct emulator path used during spawn
  
- **Manual tests**:
  - Select different emulator for each system, restart app, verify preference persisted
  - Uninstall an emulator and verify fallback behavior
  - Gamepad navigation through EmulatorSelector component
  - Launch game with each available emulator; verify correct one opens
