# Cubi Frontend

[![Release](https://img.shields.io/github/v/release/vjsr007/cubi-frontend?style=flat-square&label=Latest%20Release)](https://github.com/vjsr007/cubi-frontend/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/vjsr007/cubi-frontend/release.yml?style=flat-square&label=Build)](https://github.com/vjsr007/cubi-frontend/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/vjsr007/cubi-frontend?style=flat-square)](LICENSE)

A multiplayer emulator frontend built with **Tauri 2 + React 19 + TypeScript + Tailwind CSS 4**. Browse, manage, and launch games across 40+ emulator systems with a gamepad-navigable UI.

Inspired by EmulationStation-DE, Pegasus, and LaunchBox — designed to work alongside EmuDeck on Windows.

---

## Demo

<p align="center">
  <video src="https://vjsr007.github.io/cubi-frontend/cubi-demo-720p.mp4" controls autoplay muted loop width="854">
    Your browser does not support the video tag.
  </video>
</p>

<p align="center">
  <a href="https://vjsr007.github.io/cubi-frontend/">
    ▶️ Watch on full page
  </a>
</p>

---

## Download

Pre-built installers are available on the [Releases page](https://github.com/vjsr007/cubi-frontend/releases/latest).

| Platform | Installer | Notes |
|---|---|---|
| **Windows** | [📥 Download `.msi`](https://github.com/vjsr007/cubi-frontend/releases/latest) | Requires WebView2 (pre-installed on Win 10 1803+ / Win 11) |
| **macOS — Apple Silicon** | [📥 Download `.dmg`](https://github.com/vjsr007/cubi-frontend/releases/latest) | M1/M2/M3/M4 — native arm64 build |
| **macOS — Intel** | [📥 Download `.dmg`](https://github.com/vjsr007/cubi-frontend/releases/latest) | x86_64 build |
| **Linux** | [📥 Download `.AppImage`](https://github.com/vjsr007/cubi-frontend/releases/latest) | Portable, no install needed |
| **Linux (Debian/Ubuntu)** | [📥 Download `.deb`](https://github.com/vjsr007/cubi-frontend/releases/latest) | `sudo dpkg -i cubi-frontend_*.deb` |

> All installers are built automatically by GitHub Actions on every tagged release. See [Build from source](#build-for-production) if you prefer to compile locally.

### macOS first-launch note

macOS may block the app since it is not notarized. Right-click the `.app` → **Open** → **Open** to bypass Gatekeeper on first launch.

---

## Features

- **HyperSpin theme** — spinning oval wheel, TV/CRT preview panel, gamepad navigation
- **Multi-system library** — ROM scanning, gamelist.xml import, SQLite database
- **Media support** — box art, screenshots, videos, fan art, wheel logos per game and system
- **Auto media download** — falls back to Libretro thumbnails CDN and RetroPie GitHub assets when no local media is found
- **Emulator launcher** — auto-detects EmuDeck, supports 21+ emulators
- **Navigation audio** — Web Audio API synthesized sounds (no bundled audio files)
- **Theming system** — themes completely replace the UI; HyperSpin is the default custom theme
- **Gamepad input** — full Gamepad API support, spatial navigation, haptics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Rust + Tauri 2 |
| Frontend | React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Data fetching | TanStack React Query 5 |
| Database | SQLite (rusqlite bundled) |
| Build | Vite 6 + Cargo |

---

## Prerequisites

### Required

- **Node.js** 20+ — [nodejs.org](https://nodejs.org)
- **Rust** (stable) — install via [rustup.rs](https://rustup.rs)
- **WebView2** — pre-installed on Windows 11; if missing, download from Microsoft

### Windows-specific

Tauri on Windows requires the **MSVC Build Tools**:

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

During installation select: **Desktop development with C++**

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/vjsr007/cubi-frontend.git
cd cubi-frontend
```

### 2. Install Rust (if not already installed)

```powershell
winget install Rustlang.Rustup
# Restart your terminal, then verify:
rustc --version
cargo --version
```

### 3. Install Node dependencies

```bash
npm install
```

### 4. Install Tauri CLI

```bash
npm install -g @tauri-apps/cli
# or use npx tauri (no global install needed)
```

---

## Development

### Start the dev server

```powershell
# Option A — via npm script
npm run tauri dev

# Option B — via powershell script (if cargo is not on PATH)
powershell.exe -ExecutionPolicy Bypass -File run-dev.ps1
```

This starts:
- Vite dev server on `http://localhost:1420` with HMR
- Rust backend compiled in debug mode
- Native Tauri window

### First run setup

On first launch, go to **Settings** (⚙ button top-left) and set:

1. **Data Root** — path to your emulation folder (e.g. `E:\Emulation`)
2. **EmuDeck path** — auto-detected if installed, or set manually
3. **Theme** — choose HyperSpin or Default

Then use **Scan Library** to index your ROMs.

---

## Build for production

### Local build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

### Release build (GitHub Actions)

Push a version tag to trigger the automated multi-platform build:

```bash
# Use the guided release workflow
/release

# Or manually:
git tag v0.2.0
git push origin main --tags
```

The [release workflow](https://github.com/vjsr007/cubi-frontend/actions/workflows/release.yml) builds Windows (`.msi`), macOS Intel + Apple Silicon (`.dmg`), and Linux (`.AppImage`, `.deb`) in parallel and publishes them to the [Releases page](https://github.com/vjsr007/cubi-frontend/releases).

---

## Project Structure

```
cubi-frontend/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC commands (config, library, scanner, launcher, media)
│   │   ├── models/         # Serde data structs
│   │   ├── services/       # Business logic (scanner, launcher, media, downloader)
│   │   └── db/             # SQLite operations
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── components/         # UI components by feature
│   ├── hooks/              # Custom hooks (useMedia, useAudio, useGamepad)
│   ├── pages/              # Page-level components
│   ├── stores/             # Zustand stores
│   ├── themes/             # Theme system
│   │   ├── default/        # Default sidebar theme
│   │   └── hyperspin/      # HyperSpin wheel theme
│   ├── types/              # TypeScript types
│   └── lib/                # invoke.ts — Tauri API bridge
├── specs/                  # Spec-driven development artifacts (REQ/DES/TASK)
└── .claude/                # Claude Code agent configs
```

---

## Data Folder Layout

Cubi expects a single portable data folder (configurable in Settings):

```
{DATA_ROOT}/
├── roms/{system}/          # ROM files (gc/, snes/, psx/, ...)
│   ├── gamelist.xml        # Metadata from scrapers
│   └── downloaded_images/  # Per-game images
├── bios/                   # BIOS files
├── saves/                  # Save states
└── storage/
    └── downloaded_media/   # Scraped media (13 types × 40+ systems)
        └── {System Name}/{type}/
```

Emulators are **not** inside the data folder — they are installed separately (e.g. via EmuDeck at `%APPDATA%\emudeck\Emulators\`).

---

## Media Download Fallback

When no local scraped media is found, Cubi auto-downloads from:

- **Game box art / screenshots** — [Libretro Thumbnails CDN](https://thumbnails.libretro.com)
- **System logos** — [RetroPie Carbon theme on GitHub](https://github.com/RetroPie/es-theme-carbon)

Downloaded assets are cached in `%APPDATA%\dev.cubi.frontend\media_cache\`.

---

## Commands Reference

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server only |
| `npm run tauri dev` | Start full Tauri dev environment |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run tauri build` | Full production binary build |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest frontend tests |
| `cargo test` | Run Rust backend tests |

---

## Development Notes

- **Spec-Driven Development** — every feature starts as a `REQ` → `DES` → `TASK` spec in `/specs/`. Never code without a spec.
- **IPC boundary** — all backend calls go through `src/lib/invoke.ts`; never call `invoke()` directly in components.
- **Asset protocol** — local file paths are served via `convertFileSrc()` from `@tauri-apps/api/core`. Requires the `protocol-asset` Tauri feature.
- **No `unwrap()`** — Rust code uses `thiserror` + `?` operator. All Tauri commands return `Result<T, String>`.

---

## License

MIT
