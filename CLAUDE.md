# CLAUDE.md — cubi-frontend

## Project Overview
**cubi-frontend** is a multiplayer emulator frontend (similar to EmulationStation-DE, Pegasus, LaunchBox) built with **Tauri 2 (Rust backend) + React 19 + TypeScript + Tailwind CSS 4**. It allows users to browse, manage, and launch games across multiple emulator systems with a beautiful, gamepad-navigable UI.

## Tech Stack
- **Backend**: Rust (Tauri 2.x) — compiled native binary, no runtime dependency
- **Frontend**: React 19 + TypeScript 5.x
- **Styling**: Tailwind CSS 4 with CSS custom properties for theming
- **Database**: SQLite via rusqlite (bundled)
- **Build**: Cargo + Vite + Tauri CLI
- **Testing**: Vitest (frontend) + cargo test (backend)

## Architecture
```
src-tauri/          # Rust backend (Tauri commands, scanner, launcher, DB)
src/                # React frontend (components, pages, hooks, stores)
specs/              # Spec-driven development artifacts
.claude/            # Claude Code agent configs and custom skills
```

### Portable Folder Architecture (CRITICAL)
The user's game data lives in a **single portable folder** (e.g., `E:\Emulation`). This folder contains ONLY data — no emulator binaries. Emulators are installed separately (e.g., EmuDeck at `%APPDATA%/emudeck/Emulators/`).

**Data folder structure (user-configured root):**
```
{DATA_ROOT}/
├── roms/{system}/             # ROM files per system (40+ systems)
│   ├── gamelist.xml           # Metadata from scrapers
│   └── downloaded_images/     # Per-game box art
├── bios/                      # BIOS files (root + emulator subdirs)
├── saves/                     # Save states per emulator
├── storage/
│   └── downloaded_media/      # Scraped media (13 types × 40+ systems)
│       └── {FullSystemName}/{media_type}/
└── tools/launchers/           # Launch scripts (EmuDeck .ps1 files)
```

**Design rules:**
- Never assume emulators are inside the data folder
- Support multiple data roots (USB drives, NAS, etc.)
- Auto-detect EmuDeck paths, allow custom paths
- All filesystem paths are configurable via TOML config

### Key Modules
- **Scanner**: Walks ROM directories, identifies systems, hashes files (walkdir + rayon + sha2)
- **Launcher**: Spawns emulator processes with correct args, auto-detects EmuDeck (tokio::process)
- **Metadata**: Imports gamelist.xml, scrapes from ScreenScraper/IGDB APIs (reqwest + quick-xml + serde)
- **Media Manager**: Indexes 58K+ media files from dual locations, thumbnails, lazy loading
- **Gamepad**: Web Gamepad API — primary input method, spatial navigation, haptics
- **Theme Engine**: CSS custom properties + Framer Motion + optional CRT effects
- **Config**: TOML-based configuration (toml crate)

## Development Methodology: Spec-Driven Development

### Workflow Cycle
```
REQ (requirement) → DES (design) → TASK (breakdown) → CODE → TEST → REVIEW
```

### Spec Numbering
- `REQ-001`, `REQ-002`, ... — Requirements
- `DES-001`, `DES-002`, ... — Design documents
- `TASK-001-01`, `TASK-001-02`, ... — Task breakdowns (linked to DES)

### Rules
1. **Never code without a spec** — Every feature starts as a REQ, gets a DES, then TASKs
2. **Specs are source of truth** — If code diverges from spec, update spec first
3. **One TASK per commit** — Each task maps to a single, reviewable commit
4. **Tests before implementation** — Write test stubs in DES phase, implement in CODE phase

## Rust Conventions
- Use `thiserror` for error types, never `unwrap()` in production code
- All Tauri commands return `Result<T, String>` for IPC serialization
- Use `serde::{Serialize, Deserialize}` for all data structures crossing IPC
- Organize modules: `src-tauri/src/{commands/, models/, services/, db/}`
- Use `log` + `env_logger` for structured logging
- Prefer `rayon` for parallel scanning, `tokio` for async I/O

## TypeScript/React Conventions
- Functional components only, hooks for state management
- Use `@tauri-apps/api/core` invoke() for backend calls
- Zustand for global state (lightweight, no boilerplate)
- React Query (TanStack) for async data fetching/caching
- All types in `src/types/` directory
- Component structure: `src/components/{feature}/{Component}.tsx`
- Pages: `src/pages/{PageName}.tsx`

## Tailwind CSS Conventions
- Use CSS custom properties (`--color-primary`, etc.) for theming
- No inline styles — Tailwind utility classes only
- Responsive design: mobile-first, but primary target is desktop/TV
- Animation: Tailwind + Framer Motion for complex transitions

## File Naming
- Rust: `snake_case.rs`
- TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Specs: `REQ-XXX-short-name.md`, `DES-XXX-short-name.md`, `TASK-XXX-YY.md`

## Git Conventions
- Branch: `feat/REQ-XXX-short-name`, `fix/issue-description`, `spec/DES-XXX`
- Commit: `feat(scanner): implement ROM directory walking [TASK-001-01]`
- PR: Link to spec, include test results

## Sub-Agents (Claude Code Task() delegation)
- **Architect** (`.claude/agents/architect.md`): Creates REQ → DES → TASK specs
- **Implementor** (`.claude/agents/implementor.md`): Writes code from TASK specs
- **Reviewer** (`.claude/agents/reviewer.md`): Reviews code, runs tests, checks spec compliance
- **Designer** (`.claude/agents/designer.md`): UI/UX design, component layouts, theme design
- **Release Manager** (`.claude/agents/release-manager.md`): Bumps versions across all 3 version files, commits, tags, and pushes to trigger CI builds; invoke via `/release`

## Key Crates (Cargo.toml)
```toml
tauri = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
rusqlite = { version = "0.31", features = ["bundled"] }
walkdir = "2"
rayon = "1.10"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
sha2 = "0.10"
quick-xml = "0.36"
zip = "2"
directories = "5"
thiserror = "2"
log = "0.4"
env_logger = "0.11"
glob = "0.3"
chrono = "0.4"
blake3 = "1"
image = "0.25"
lru = "0.12"
which = "7"
```

## Key Frontend Packages
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "@tauri-apps/api": "^2.0.0",
  "@tauri-apps/plugin-shell": "^2.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^5.0.0",
  "framer-motion": "^11.0.0",
  "react-router-dom": "^7.0.0",
  "tailwindcss": "^4.0.0"
}
```

## Commands
- `cargo tauri dev` — Start development server
- `cargo tauri build` — Build production binary
- `cargo test` — Run Rust tests
- `npm run test` — Run Vitest frontend tests
- `npm run lint` — ESLint + Prettier check

## Directory Structure Reference
```
cubi-frontend/
├── CLAUDE.md
├── specs/
│   ├── requirements/          # REQ-XXX documents
│   ├── design/                # DES-XXX documents  
│   ├── tasks/                 # TASK-XXX-YY documents
│   └── templates/             # Spec templates
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/          # Tauri IPC commands
│       ├── models/            # Data structures
│       ├── services/          # Business logic
│       └── db/                # SQLite operations
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/                 # TypeScript type definitions
│   ├── components/            # React components by feature
│   ├── pages/                 # Page-level components
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   ├── lib/                   # Utility functions
│   └── assets/                # Static assets
├── .github/
│   └── workflows/
│       └── release.yml        # Multi-platform CI/CD build (Windows/macOS/Linux)
├── .claude/
│   ├── agents/                # Sub-agent definitions
│   │   ├── architect.md
│   │   ├── designer.md
│   │   ├── implementor.md
│   │   ├── reviewer.md
│   │   └── release-manager.md # Release orchestration (version bump → tag → push)
│   ├── commands/              # Slash commands
│   │   ├── spec-design.md
│   │   ├── spec-implement.md
│   │   ├── spec-new.md
│   │   ├── spec-review.md
│   │   ├── spec-status.md
│   │   └── release.md         # /release — guided version bump and release
│   └── skills/                # Custom domain skills
│       ├── emulator-domain/   # Emulator domain knowledge (40+ systems, BIOS, Media types)
│       ├── rom-scanner/       # ROM scanning, hashing, system detection
│       ├── metadata-scraper/  # gamelist.xml import, ScreenScraper/IGDB APIs
│       ├── emulator-launcher/ # Process launching, EmuDeck auto-detect, 21+ emulators
│       ├── media-manager/     # 58K+ media files, dual locations, thumbnails, caching
│       ├── theme-engine/      # CSS themes, layouts (grid/list/carousel), CRT effects
│       ├── gamepad-input/     # Gamepad API, spatial nav, haptics, virtual keyboard
│       ├── version-manager/   # Version files, semver rules, git tagging, CI trigger
│       └── pc-metadata-scraper/ # PC enhanced metadata: Steam Store, IGDB, SteamGridDB, MobyGames, PCGamingWiki, YouTube/yt-dlp, web scraper (chromiumoxide)
└── public/
```
