---
id: DES-002
title: "Configuration System Design"
status: IMPLEMENTED
req: REQ-002
author: architect
created: 2026-03-28
updated: 2026-03-28
tags: [backend, config]
---

# DES-002: Configuration System Design

## Overview
TOML config file managed by `services/config_service.rs`. Three Tauri commands expose it to the frontend. EmuDeck detection checks OS-specific paths.

## Data Models

### Rust
```rust
pub struct AppConfig {
    pub general: GeneralConfig,   // theme, language, version
    pub paths: PathsConfig,       // data_root, emudeck_path
    pub scanner: ScannerConfig,   // auto_scan, hash_roms
}
```

### TypeScript
```typescript
interface AppConfig {
  general: { version: string; theme: string; language: string };
  paths: { data_root: string; emudeck_path: string };
  scanner: { auto_scan: boolean; hash_roms: boolean };
}
```

## API Design

### Commands
- `get_config() -> Result<AppConfig, String>` — read from TOML
- `set_config(config: AppConfig) -> Result<(), String>` — write to TOML
- `detect_emudeck() -> Result<Option<String>, String>` — scan known paths

## Config Path
`directories::ProjectDirs::from("dev", "cubi", "cubi-frontend").config_dir() / "config.toml"`

## EmuDeck Detection Paths
- Windows: `%APPDATA%\emudeck\Emulators\`, `C:\EmuDeck\Emulators\`
- Linux: `~/Emulation/`

## Task Breakdown
| Task ID | Title | Estimate | Dependencies |
|---------|-------|----------|--------------|
| TASK-002-01 | AppConfig Rust models + TOML serialization | S | TASK-001-01 |
| TASK-002-02 | config_service + Tauri commands | S | TASK-002-01 |
| TASK-002-03 | Settings UI page with browse dialogs | M | TASK-002-02 |
