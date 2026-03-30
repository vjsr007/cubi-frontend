# DES-017 — Emulator General Settings

## Status: APPROVED
## Implements: REQ-017
## Pattern: Strategy (EmulatorConfigWriter) + Factory + SQLite CRUD

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ EmulatorSettingsPage (React)                     │
│  ├── Emulator tabs (RetroArch, Dolphin, ...)    │
│  ├── Setting controls (select, toggle, slider)  │
│  └── Preview/Export modal                        │
├─────────────────────────────────────────────────┤
│ Tauri Commands (IPC)                             │
│  get_setting_definitions, get_emulator_settings  │
│  set_emulator_setting, reset_emulator_settings   │
│  preview_emulator_config, get_config_writers_info│
├─────────────────────────────────────────────────┤
│ EmulatorSettingsService (Factory + Orchestrator) │
│  ├── seed_default_settings()                     │
│  ├── get_writer(emulator_name) → Box<dyn Writer> │
│  └── DefaultSettings::for_emulator()             │
├─────────────────────────────────────────────────┤
│ EmulatorConfigWriter (Strategy Trait)             │
│  ├── RetroArchConfigWriter                       │
│  ├── DolphinConfigWriter                         │
│  ├── Pcsx2ConfigWriter                           │
│  ├── DuckStationConfigWriter                     │
│  ├── PpssppConfigWriter                          │
│  ├── Rpcs3ConfigWriter                           │
│  ├── XemuConfigWriter                            │
│  └── RyujinxConfigWriter                         │
├─────────────────────────────────────────────────┤
│ SQLite Database                                  │
│  ├── emulator_setting_defs (canonical settings)  │
│  └── emulator_settings (per-emulator values)     │
└─────────────────────────────────────────────────┘
```

## Data Model

### Canonical Setting Definitions (seeded at startup)

| Key | Type | Options | Default | Category |
|-----|------|---------|---------|----------|
| internal_resolution | select | native,2x,3x,4x,5x,6x,8x | native | video |
| fullscreen | bool | - | true | video |
| vsync | bool | - | false | video |
| aspect_ratio | select | auto,4:3,16:9,stretch | auto | video |
| show_fps | bool | - | false | video |
| system_language | select | English,Spanish,French,German,Italian,Japanese,Portuguese,Chinese,Korean | English | system |
| audio_volume | range | 0-100 | 100 | audio |
| frame_limit | select | auto,30,60,120,unlimited | auto | performance |
| fast_forward_speed | select | 2x,3x,4x,unlimited | 2x | performance |
| texture_filtering | select | nearest,linear | linear | video |

### Rust Models

```rust
pub struct SettingDefinition {
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub setting_type: SettingType,     // Bool, Select, Range
    pub options: Option<Vec<String>>,  // for Select type
    pub range_min: Option<i32>,        // for Range type
    pub range_max: Option<i32>,        // for Range type
    pub default_value: String,
    pub category: SettingCategory,     // Video, Audio, System, Performance
    pub sort_order: i32,
    pub locked: bool,                  // true for vsync
}

pub struct EmulatorSettingValue {
    pub emulator_name: String,
    pub setting_key: String,
    pub value: String,
}

pub struct ConfigWriterInfo {
    pub emulator_name: String,
    pub config_format: String,       // "cfg", "ini", "yml", "json", "toml"
    pub supported_settings: Vec<String>,
    pub default_config_path: Option<String>,
}
```

### DB Schema (2 new tables)

```sql
CREATE TABLE IF NOT EXISTS emulator_setting_defs (
    key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    setting_type TEXT NOT NULL,
    options_json TEXT,
    range_min INTEGER,
    range_max INTEGER,
    default_value TEXT NOT NULL,
    category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    locked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS emulator_settings (
    emulator_name TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (emulator_name, setting_key)
);
```

## Strategy Pattern: EmulatorConfigWriter

```rust
pub trait EmulatorConfigWriter: Send + Sync {
    fn emulator_name(&self) -> &str;
    fn config_format(&self) -> &str;
    fn supported_settings(&self) -> Vec<&str>;
    fn default_config_path(&self) -> Option<String>;
    fn preview_config(&self, settings: &HashMap<String, String>) -> String;
}
```

Each implementation maps canonical keys → emulator-native keys + formats.

## Emulator-Specific Mappings

### RetroArch (.cfg)
```
internal_resolution → video_scale = "2" (1-8)
fullscreen → video_fullscreen = "true"/"false"
vsync → video_vsync = "false"
aspect_ratio → aspect_ratio_index = "22" (22=auto,21=4:3,20=16:9,23=stretch)
show_fps → fps_show = "true"/"false"
system_language → user_language = "0" (0=EN,2=ES,4=FR,5=DE,6=IT,7=JA,16=PT,3=ZH,10=KO)
audio_volume → audio_volume = "0.0" (dB: 0=max, mapped from 0-100)
frame_limit → fastforward_ratio = "0.0" (0=auto)
texture_filtering → video_smooth = "true"/"false"
```

### Dolphin (.ini)
```
internal_resolution → [Settings] InternalResolution = 1-8
fullscreen → [Display] Fullscreen = True/False
vsync → [Hardware] VSync = False
aspect_ratio → [Settings] AspectRatio = 0(auto)/1(16:9)/2(4:3)/3(stretch)
show_fps → [Settings] ShowFPS = True/False
system_language → [Core] SelectedLanguage = 0(JA)/1(EN)/2(DE)/3(FR)/4(ES)/5(IT)/6(NL)/8(KO)/9(ZH)
```

### PCSX2 (.ini)
```
internal_resolution → EmuCore/GS.upscale_multiplier = 1-8
fullscreen → UI.StartFullscreen = true/false
vsync → EmuCore/GS.VsyncEnable = 0
aspect_ratio → EmuCore/GS.AspectRatio = Auto:0/4:3:1/16:9:2/Stretch:3
show_fps → EmuCore/GS.OsdShowFPS = true/false
system_language → EmuCore.LanguageId = 0(JA)/1(EN)/2(FR)/3(ES)/4(DE)/5(IT)/6(PT)
audio_volume → SPU2/Mixing.FinalVolume = 100
```

### DuckStation (.ini)
```
internal_resolution → [GPU] ResolutionScale = 1-16
fullscreen → [Main] StartFullscreen = true/false
vsync → [Display] VSync = false
aspect_ratio → [Display] AspectRatio = Auto/4:3/16:9/Stretch
show_fps → [Display] ShowFPS = true/false
system_language → [Console] Region = 0(NTSC-J)/1(NTSC-U)/2(PAL)
audio_volume → [Audio] OutputVolume = 100
```

### PPSSPP (.ini)
```
internal_resolution → [Graphics] InternalResolution = 1-10
fullscreen → [Graphics] FullScreen = True/False
vsync → [Graphics] VSync = False
system_language → [SystemParam] PSPSystemLanguage = 1(EN)/3(FR)/4(ES)/5(DE)/6(IT)/0(JA)/8(PT)/11(ZH)/9(KO)
texture_filtering → [Graphics] TextureFiltering = 1(auto)/2(nearest)/3(linear)
show_fps → [Graphics] ShowFPSCounter = 1-3
```

### RPCS3 (.yml)
```
internal_resolution → Video: Resolution: 1280x720 / 1920x1080 / 3840x2160
fullscreen → Miscellaneous: Start games in fullscreen mode: true/false
vsync → Video: VSync: false
frame_limit → Video: Frame limit: Auto/Off/30/50/60
```

### xemu (.toml)
```
internal_resolution → [display] render_scale = 1-4
fullscreen → [display] fullscreen = false/true
vsync → [display] vsync = false
```

### Ryujinx (.json)
```
internal_resolution → "res_scale": 1-4
fullscreen → "start_fullscreen": false
vsync → "enable_vsync": false
system_language → "system_language": "AmericanEnglish"/"Spanish"/"French"/etc.
audio_volume → "audio_volume": 1.0 (0.0-1.0)
```

## Task Breakdown
- TASK-017-01: Models + DB schema + seeding
- TASK-017-02: ConfigWriter trait + 8 implementations
- TASK-017-03: Service + Tauri commands + registration
- TASK-017-04: Frontend types + invoke + EmulatorSettingsPage
