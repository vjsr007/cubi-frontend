# PRD — Cubi Frontend
## Product Requirements Document v0.6.0

---

## 1. Product Vision

**Cubi Frontend** is a cross-platform video game emulation frontend (similar to EmulationStation-DE, Pegasus, LaunchBox) built with **Tauri 2 + React 19 + TypeScript + Tailwind CSS 4**. It allows users to browse, manage, and launch games across 41+ systems with a modern, gamepad-navigable UI designed for big screens (TV/monitor) and desktop.

### Value Proposition
- **One place for all your games**: Retro (NES → PS3), handhelds (GB → Switch) and PC (Steam/Epic/GOG/EA)
- **Zero configuration**: Auto-detects EmuDeck, ROMs, BIOS, and existing media
- **Portability**: User data lives in a portable folder (USB, NAS, etc.)
- **Native performance**: Compiled binary with Tauri 2 — no Electron, no runtime
- **Smart scraping**: Multi-source (ScreenScraper, IGDB, TheGamesDB, Libretro, Steam, SteamGridDB)
- **Customizable**: Themes, languages, controller mapping, per-emulator configuration

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|--------|
| Backend | Rust (Tauri 2) | 2.x |
| Frontend | React + TypeScript | 19.x / 5.x |
| Styling | Tailwind CSS | 4.x |
| State | Zustand | 5.x |
| Data fetching | TanStack React Query | 5.x |
| Animation | Framer Motion | 11.x |
| Router | React Router DOM | 7.x |
| Database | SQLite (rusqlite bundled) | 0.31 |
| Configuration | TOML | — |
| Build | Cargo + Vite + Tauri CLI | — |
| CI/CD | GitHub Actions | Multi-platform |

---

## 3. Supported Platforms

| Platform | Output Format |
|----------|---------------|
| Windows x64 | `.msi` installer + `.exe` portable |
| macOS Intel | `.dmg` + `.tar.gz` |
| macOS Apple Silicon | `.dmg` + `.tar.gz` |
| Linux x64 | `.AppImage` + `.deb` |

---

## 4. Supported Emulation Systems (41)

### Nintendo (12)
| System | ID | Extensions |
|---------|-----|------------|
| NES | `nes` | `.nes`, `.fds`, `.unf`, `.zip`, `.7z` |
| Super Nintendo | `snes` | `.sfc`, `.smc`, `.fig`, `.bs`, `.zip`, `.7z` |
| Nintendo 64 | `n64` | `.n64`, `.z64`, `.v64`, `.zip`, `.7z` |
| Game Boy | `gb` | `.gb`, `.sgb`, `.zip`, `.7z` |
| Game Boy Color | `gbc` | `.gbc`, `.zip`, `.7z` |
| Game Boy Advance | `gba` | `.gba`, `.zip`, `.7z` |
| Nintendo DS | `nds` | `.nds`, `.zip`, `.7z` |
| Nintendo 3DS | `3ds` | `.3ds`, `.cia`, `.cxi` |
| GameCube | `gamecube` | `.iso`, `.rvz`, `.gcz`, `.wbfs`, `.ciso` |
| Wii | `wii` | `.iso`, `.rvz`, `.gcz`, `.wbfs`, `.ciso`, `.wad` |
| Wii U | `wiiu` | `.rpx`, `.wud`, `.wux`, `.iso` |
| Nintendo Switch | `switch` | `.nsp`, `.xci`, `.nro` |

### Sega (5)
| System | ID | Extensions |
|---------|-----|------------|
| Genesis / Mega Drive | `genesis` | `.md`, `.bin`, `.gen`, `.smd`, `.zip`, `.7z` |
| Master System | `mastersystem` | `.sms`, `.zip`, `.7z` |
| Game Gear | `gamegear` | `.gg`, `.zip`, `.7z` |
| Saturn | `saturn` | `.cue`, `.iso`, `.mdf`, `.chd` |
| Dreamcast | `dreamcast` | `.cdi`, `.iso`, `.chd`, `.gdi` |

### Sony (4)
| System | ID | Extensions |
|---------|-----|------------|
| PlayStation | `ps1` | `.cue`, `.bin`, `.iso`, `.chd`, `.pbp`, `.mds`, `.mdf` |
| PlayStation 2 | `ps2` | `.iso`, `.chd`, `.cso`, `.gz` |
| PlayStation 3 | `ps3` | `.iso`, `.pkg` |
| PSP | `psp` | `.iso`, `.cso`, `.pbp`, `.chd` |

### Microsoft (1)
| System | ID | Extensions |
|---------|-----|------------|
| Xbox (Original) | `xbox` | `.iso`, `.xbe` |

### Arcade (6)
| System | ID | Extensions |
|---------|-----|------------|
| Arcade (MAME) | `arcade` | `.zip`, `.7z`, `.chd` |
| FinalBurn Neo | `fbneo` | `.zip`, `.7z`, `.chd` |
| Neo Geo | `neogeo` | `.zip`, `.7z`, `.chd` |
| CPS-1 | `cps1` | `.zip`, `.7z` |
| CPS-2 | `cps2` | `.zip`, `.7z` |
| CPS-3 | `cps3` | `.zip`, `.7z` |

### Retro Computers (8)
| System | ID | Extensions |
|---------|-----|------------|
| Amiga | `amiga` | `.adf`, `.lha`, `.hdf`, `.zip`, `.7z` |
| Atari 2600 | `atari2600` | `.a26`, `.bin`, `.rom`, `.zip`, `.7z` |
| Atari 5200 | `atari5200` | `.a52`, `.bin`, `.rom`, `.zip`, `.7z` |
| Atari 7800 | `atari7800` | `.a78`, `.bin`, `.rom`, `.zip`, `.7z` |
| Atari ST | `atarist` | `.st`, `.msa`, `.dim`, `.zip`, `.7z` |
| Commodore 64 | `c64` | `.d64`, `.t64`, `.prg`, `.tap`, `.crt`, `.zip`, `.7z` |
| MSX / MSX2 | `msx` | `.rom`, `.mx1`, `.mx2`, `.dsk`, `.cas`, `.zip`, `.7z` |
| ColecoVision | `colecovision` | `.col`, `.rom`, `.zip`, `.7z` |

### Misc. Handhelds (4)
| System | ID | Extensions |
|---------|-----|------------|
| Atari Lynx | `atarilynx` | `.lnx`, `.zip`, `.7z` |
| PC Engine / TurboGrafx-16 | `pcengine` | `.pce`, `.cue`, `.bin`, `.chd`, `.zip`, `.7z` |
| Neo Geo Pocket Color | `ngpc` | `.ngc`, `.ngp`, `.zip`, `.7z` |
| WonderSwan Color | `wswan` | `.ws`, `.wsc`, `.zip`, `.7z` |

### PC (1)
| System | ID | Extensions |
|---------|-----|------------|
| PC (Windows) | `pc` | `.exe`, `.lnk` (Steam/Epic/GOG/EA shortcuts) |

---

## 5. Supported Emulators (10)

| Emulator | Systems | EmuDeck Detection | Launch |
|----------|---------|-------------------|-------------|
| **RetroArch** | NES, SNES, N64, GB, GBC, GBA, 3DS, Genesis, Master System, Game Gear, Saturn, Dreamcast, Arcade, FBNeo, Neo Geo, CPS1/2/3, Amiga, Atari (todos), PC Engine, NGPC, ColecoVision, MSX, C64, WonderSwan | `RetroArch/retroarch.exe` | `-L {core}.dll "{rom}"` + override cfg |
| **melonDS** | Nintendo DS | `melonDS/melonDS.exe` | `--fullscreen "{rom}"` |
| **Dolphin** | GameCube, Wii | `Dolphin-x64/Dolphin.exe` | `--batch --exec="{rom}"` |
| **PCSX2** | PS2 | `PCSX2/pcsx2-qt.exe` | `"{rom}"` |
| **DuckStation** | PS1 | `duckstation/duckstation-qt.exe` | `"{rom}"` |
| **PPSSPP** | PSP | `PPSSPP/PPSSPPWindows64.exe` | `"{rom}"` |
| **RPCS3** | PS3 | `rpcs3/rpcs3.exe` | `--no-gui "{rom}"` |
| **xemu** | Xbox | `xemu/xemu.exe` | `-dvd_path "{rom}"` |
| **Ryujinx** | Switch | `Ryujinx/Ryujinx.exe` | `--fullscreen "{rom}"` |
| **Native PC Launcher** | PC Games | N/A | `steam://`, `com.epicgames.`, direct `.exe` |

### RetroArch Cores
| System | Core |
|---------|------|
| NES | `fceumm_libretro` |
| SNES | `snes9x_libretro` |
| N64 | `mupen64plus_next_libretro` |
| GB/GBC | `gambatte_libretro` |
| GBA | `mgba_libretro` |
| Genesis/Master System/Game Gear | `genesis_plus_gx_libretro` |
| Saturn | `mednafen_saturn_libretro` |
| Dreamcast | `flycast_libretro` |
| Arcade/FBNeo/Neo Geo/CPS | `fbneo_libretro` / `mame_libretro` |
| PC Engine | `mednafen_pce_libretro` |
| NGPC | `mednafen_ngp_libretro` |
| WonderSwan | `mednafen_wswan_libretro` |
| 3DS | `citra_libretro` |
| Amiga | `puae_libretro` |
| Atari 2600 | `stella_libretro` |
| Atari 7800 | `prosystem_libretro` |
| Atari Lynx | `beetle_lynx_libretro` |
| MSX | `fmsx_libretro` |
| C64 | `vice_x64_libretro` |
| ColecoVision | `gearcoleco_libretro` |

---

## 6. Implemented Features

### 6.1 ROM Scanner (REQ-003) ✅
- Recursive scanning of `{data_root}/roms/{system}/` directories
- Automatic detection of 41 systems by folder name
- `gamelist.xml` parsing (metadata from external scrapers)
- BLAKE3 hashing for unique game IDs
- Real-time scan progress events
- Support for multiple data roots (USB, NAS)

### 6.2 Library UI (REQ-004) ✅
- System list in sidebar with SVG logos
- Game grid with zoom (5 levels: 1–5 columns)
- Compact list view with columns (title, date, plays, rating)
- Real-time title search
- Filters: favorites, genre, system
- Sorting: title, last played date, play count, rating
- Per-system game counters

### 6.3 Game Launcher (REQ-005) ✅
- Emulator registry with EmuDeck auto-detection
- Custom executable, arguments, and core override per system
- Temporary RetroArch config generation (no VSync, no pause on focus loss)
- N64-specific override (OpenGL driver + analog stick)
- Game stats: play count, last played
- PC game launch via protocol (steam://, com.epicgames.)

### 6.4 Configuration System (REQ-002) ✅
- TOML file at `%APPDATA%/cubi/cubi-frontend/config.toml`
- Data roots, emulators, theme, language configuration
- EmuDeck installation auto-detection
- Per-system ROM path overrides (REQ-015)

### 6.5 Multi-Source Scraper (REQ-012) ✅
- Configurable scrapers: ScreenScraper, TheGamesDB, IGDB, Libretro
- Scraper CRUD (add, edit, delete, prioritize)
- Scraping jobs per system or per individual game
- ES-DE credential import
- Media download: box art, screenshots, fan art, wheel, marquee, video

### 6.6 Localization (REQ-011) ✅
- 6 languages: English, Español, Français, Deutsch, 日本語, Português
- Game metadata translation via ScreenScraper
- Language selector in settings
- TypeScript-typed strings (no magic strings)

### 6.7 Metadata Editor (REQ-018) ✅
- Edit: title, description, developer, publisher, year, genre, tags
- Media upload by file or URL (box art, fan art, screenshots)
- YouTube trailer download via yt-dlp
- Search and link to Steam AppID

### 6.8 Steam Integration (REQ-021) ✅
- Steam Store game search
- Game → Steam AppID linking
- Review, category, achievement, and DLC count fetching
- Steam data display on detail page
- Local SQLite cache

### 6.9 PC Game Importer ✅
- Automatic library detection: Steam, Epic Games, GOG, EA App
- Bulk import with SteamGridDB artwork
- Native launch (protocol URL or direct .exe)

### 6.10 Controller Mapping (REQ-016) 🔄 In Progress
- Input profiles (Xbox, PlayStation, Nintendo, Custom)
- Button binding with Web Gamepad API
- RetroArch `.cfg` export
- Per-game and per-system assignment

---

## 7. Themes

| Theme | Description | Status |
|-------|-------------|--------|
| **Default (Dark)** | Modern dark theme with purple accents | ✅ Built-in |
| **HyperSpin** | Classic arcade aesthetic, bold colors | ✅ Built-in |
| **Aurora** | Inspired by Xbox 360 dashboard, tiles, animations | ✅ Built-in |

### Theme System
- CSS custom properties (`--color-primary`, `--color-surface`, `--color-border`, etc.)
- Dynamic theme registry (ThemeManifest → Component)
- Each theme can use its own layout (grid, list, carousel)
- Selection saved in config.toml

---

## 8. Supported Media Types

### Game Media
| Type | Description | Sources |
|------|-------------|--------|
| `box_art` | Front cover | ScreenScraper, TheGamesDB, Libretro, SteamGridDB |
| `back_cover` | Rear cover | ScreenScraper |
| `screenshot` | Gameplay screenshot | ScreenScraper, TheGamesDB, Steam |
| `title_screen` | Title splash screen | ScreenScraper |
| `fan_art` | Fan art / hero art | ScreenScraper, TheGamesDB, SteamGridDB |
| `wheel` | Game wheel logo | ScreenScraper, SteamGridDB |
| `marquee` | Arcade marquee | ScreenScraper |
| `mix_image` | Mixed composition | ScreenScraper |
| `video` | Gameplay video/trailer | ScreenScraper, YouTube (yt-dlp) |

### System Media
| Type | Source |
|------|--------|
| SVG Logos | Bundled (40+ logos) |
| System backgrounds | RetroPie CDN |

---

## 9. External APIs

| API | Purpose | Authentication |
|-----|---------|----------------|
| ScreenScraper | Retro metadata + media | Username + password |
| TheGamesDB | Metadata + boxart | API key (optional) |
| Libretro Thumbnails | Retro artwork | None |
| IGDB (Twitch) | Modern metadata | Bearer token |
| Steam Store API | Reviews, categories, DLC | Public |
| SteamGridDB | PC artwork | API key (optional) |
| MobyGames | Metadata fallback | API key |
| PCGamingWiki | PC requirements, DRM | Web scraper |
| YouTube / yt-dlp | Trailers | None |

---

## 10. Database

**Engine**: SQLite (bundled via rusqlite)
**Schema Version**: 3

### Main Tables
| Table | Purpose | Typical Records |
|-------|---------|----------------|
| `systems` | System definitions | 41 |
| `games` | Game catalog | 5,000+ |
| `scrapers` | Scraper configuration | 4-6 |
| `system_rom_paths` | ROM path overrides | 0-41 |
| `input_profiles` | Gamepad profiles | 3-10 |
| `input_bindings` | Button mappings | 50-200 |
| `emulator_setting_defs` | Setting definitions | 30+ |
| `emulator_settings` | Custom values | 0-100 |
| `game_steam_data` | Steam data | 0-500 |

---

## 11. Portable Folder Architecture

```
{DATA_ROOT}/                        # User folder (e.g., E:\Emulation)
├── roms/{system}/                  # ROMs per system (41+ folders)
│   ├── gamelist.xml                # Scraper metadata
│   └── downloaded_images/          # Per-game box art
├── bios/                           # BIOS files
├── saves/                          # Save states per emulator
└── storage/
    └── downloaded_media/           # Scraped media (13 types × 40+ systems)
        └── {SystemFullName}/{media_type}/
```

**Design Rules:**
- Emulators are NEVER inside the data folder
- Support for multiple data roots (USB drives, NAS, etc.)
- EmuDeck path auto-detection
- All paths configurable via TOML

---

## 12. User Interface

### Pages
| Page | Description |
|------|-------------|
| **Library** | Main navigation: system → game grid/list |
| **Game Detail** | Detailed view: 3D box art, metadata, media, launch |
| **Settings** | General settings: theme, language, data root, fullscreen |
| **Scraper** | Scraper configuration and execution |
| **Emulator Config** | Per-system emulator selection, path overrides |
| **Emulator Settings** | Per-emulator settings (resolution, FPS, aspect ratio) |
| **Input Mapping** | Gamepad profiles, button bindings |
| **ROM Paths** | Per-system ROM path overrides |
| **PC Games** | PC game import and management |

### Main Components
- **Sidebar**: Main navigation with logo, page icons
- **SystemList**: Vertical system list with SVG logos and counters
- **GameGrid**: Responsive grid with zoom (1–5 columns)
- **GameList**: Table-style list view
- **GameCard**: Individual card with thumbnail + title
- **GameBoxCase**: 3D box art with CSS transforms
- **FilterBar**: Filter, search, and sort controls
- **MediaImage**: Lazy loading with fallback
- **MetadataEditor**: Metadata field editor
- **SteamSection**: Collapsible Steam data panel
- **Toast**: Notifications (success/error/info)

---

## 13. CI/CD Pipeline

**Trigger**: Tag push `v[0-9]+.[0-9]+.[0-9]+*`

| Step | Action |
|------|--------|
| 1 | Code checkout |
| 2 | Setup Rust + Node.js |
| 3 | Install npm dependencies |
| 4 | `cargo tauri build` (4 targets in parallel) |
| 5 | Create GitHub Release |
| 6 | Upload artifacts (.msi, .dmg, .AppImage, .deb) |

### Build Matrix
- Windows x64
- macOS Intel (x86_64-apple-darwin)
- macOS Apple Silicon (aarch64-apple-darwin)
- Linux x64

---

## 14. Feature Roadmap

### Implemented ✅
- [x] Project bootstrap (Tauri 2 + React 19)
- [x] TOML configuration system
- [x] ROM scanner with 41 system detection
- [x] Library UI (grid + list + search + filters)
- [x] Game launcher with 10 emulators
- [x] Localization (6 languages)
- [x] Multi-source scraper
- [x] Metadata editor
- [x] Steam integration (reviews, data)
- [x] PC game importer (Steam/Epic/GOG/EA)
- [x] Per-system ROM path overrides
- [x] SVG logos for 40+ systems
- [x] New app icon (Cubi mascot)

### In Progress 🔄
- [ ] Controller mapping with gamepad (REQ-016)

### Approved (pending implementation) 📋
- [ ] Advanced theme engine (REQ-006)
- [ ] Media Manager with LRU cache (REQ-007)
- [ ] Internet media download (REQ-008)
- [ ] System logo download (REQ-009)
- [ ] 3D box art view (REQ-010)
- [ ] Aurora / Xbox 360 theme (REQ-013)
- [ ] PC Enhanced Metadata + web scraper (REQ-015)
- [ ] General emulator settings (REQ-017)
- [ ] Library UX improvements (REQ-019)
- [ ] Scraper improvements (REQ-020)

### Draft 📝
- [ ] Release management / automated CI/CD (REQ-014)

---

## 15. Success Metrics

| Metric | Target |
|--------|--------|
| Startup time | < 2 seconds |
| Scan time (5000 ROMs) | < 30 seconds |
| Memory usage (idle) | < 150 MB |
| Installer size | < 30 MB |
| Supported systems | 41+ |
| Supported emulators | 10+ |
| Languages | 6+ |
| Themes | 3+ |

---

*Generated: March 31, 2026 — Cubi Frontend v0.6.0*
