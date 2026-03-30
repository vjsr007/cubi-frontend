# REQ-017 — Emulator General Settings

## Status: APPROVED
## Priority: HIGH
## Depends on: REQ-005 (Game Launcher), REQ-016 (Input Mapping)

---

## Problem Statement
Each emulator has its own configuration format and settings, but many core settings are conceptually shared across emulators: rendering resolution, fullscreen, V-Sync, console language, aspect ratio, etc. Users need a **centralized** way to manage these common settings per-emulator, with the ability to preview and export config snippets that can be applied to each emulator's native config files.

## User Stories

1. **As a user**, I want to set the internal rendering resolution for each emulator from a single page so I don't have to open each emulator individually.
2. **As a user**, I want V-Sync to always be OFF because I use an external frame limiter and V-Sync causes input lag.
3. **As a user**, I want to set the console system language (e.g., English, Spanish, Japanese) per emulator.
4. **As a user**, I want to preview what the emulator's config file will look like before applying.
5. **As a user**, I want to configure fullscreen, aspect ratio, FPS display, and audio volume per emulator.

## Functional Requirements

### FR-1: Canonical Setting Definitions
- 10 canonical settings shared across emulators: `internal_resolution`, `fullscreen`, `vsync`, `aspect_ratio`, `show_fps`, `system_language`, `audio_volume`, `frame_limit`, `fast_forward_speed`, `texture_filtering`
- Each setting has type (bool, select, range), options, default value, and category (Video, Audio, System, Performance)
- V-Sync default is ALWAYS `false` — enforced in backend

### FR-2: Per-Emulator Setting Storage
- Settings stored per emulator (RetroArch, Dolphin, PCSX2, DuckStation, PPSSPP, RPCS3, xemu, Ryujinx)
- Each emulator may not support all canonical settings — UI shows only supported ones
- Stored in SQLite database

### FR-3: Strategy Pattern for Config Writers
- `EmulatorConfigWriter` trait with per-emulator implementations
- Each writer knows its emulator's config format (cfg, ini, yaml, json, toml)
- Methods: `emulator_name()`, `supported_settings()`, `preview_config()`, `default_config_path()`

### FR-4: Config Preview/Export
- Generate human-readable config snippet for each emulator
- Same UX pattern as REQ-016 input mapping export preview

### FR-5: Emulator Settings UI
- New page accessible from Settings → "⚙️ Emulator General Settings"
- Tabbed by emulator, shows only settings that emulator supports
- Preview modal showing generated config
- V-Sync shown as locked/disabled toggle (always false)

## Non-Functional Requirements
- Performance: <100ms to load/save settings
- Extensibility: Adding a new emulator requires only one new ConfigWriter impl
- Same patterns as REQ-016 (Strategy, factory, DB CRUD)

## Supported Emulators & Config Formats
| Emulator    | Format | Key Settings |
|-------------|--------|--------------|
| RetroArch   | .cfg   | video_scale, video_fullscreen, video_vsync, user_language |
| Dolphin     | .ini   | InternalResolution, Fullscreen, VSync, SelectedLanguage |
| PCSX2       | .ini   | upscale_multiplier, StartFullscreen, VsyncEnable, LanguageId |
| DuckStation | .ini   | ResolutionScale, StartFullscreen, VSync, Language |
| PPSSPP      | .ini   | InternalResolution, FullScreen, VSync, PSPSystemLanguage |
| RPCS3       | .yml   | Resolution, Start fullscreen, VSync, Frame limit |
| xemu        | .toml  | render_scale, fullscreen, vsync |
| Ryujinx     | .json  | res_scale, start_fullscreen, enable_vsync, system_language |

## Acceptance Criteria
- [ ] 10 canonical settings defined with proper types and defaults
- [ ] 8 EmulatorConfigWriter implementations
- [ ] Settings persist in SQLite per emulator
- [ ] V-Sync is always false and locked in UI
- [ ] Preview modal shows formatted config snippet per emulator
- [ ] UI page with emulator tabs and per-setting controls
