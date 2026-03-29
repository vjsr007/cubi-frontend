# DES-007 — Media Manager Design

**Status:** APPROVED
**REQ:** REQ-007
**Created:** 2026-03-28

## Architecture

```
src-tauri/src/
├── models/media.rs              # GameMedia, SystemMedia structs
├── services/media_service.rs    # resolve_game_media(), resolve_system_media()
└── commands/media.rs            # Tauri IPC commands

src/
├── hooks/useMedia.ts            # useGameMedia(), useSystemMedia() — React Query
└── components/media/
    ├── MediaImage.tsx           # Lazy image with fallback
    ├── VideoPreview.tsx         # <video> with mute/unmute, autoplay
    └── MediaGallery.tsx         # Carousel of all available images for a game
```

## Rust Data Structures

```rust
// models/media.rs
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameMedia {
    pub box_art: Option<String>,      // box2dfront/ (or downloaded_images/)
    pub back_cover: Option<String>,   // box2dback/
    pub screenshot: Option<String>,   // ss/
    pub title_screen: Option<String>, // sstitle/
    pub fan_art: Option<String>,      // fanart/
    pub wheel: Option<String>,        // wheel/ (transparent logo)
    pub marquee: Option<String>,      // marquee/
    pub mix_image: Option<String>,    // mixrbv2/
    pub video: Option<String>,        // video/ (.mp4)
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemMedia {
    pub fan_art: Option<String>,   // system-level fanart (backgrounds)
    pub wheel: Option<String>,     // system logo
    pub marquee: Option<String>,   // system marquee
}
```

## Media Resolution Algorithm

```
resolve_game_media(game_id):
  1. Load game from DB → get file_name, system_id
  2. stem = Path::new(file_name).file_stem()
  3. data_root = load_config().paths.data_root
  4. media_folder = system_to_media_folder(system_id)  ← mapping table
  5. For each media type:
     a. Check storage/downloaded_media/{media_folder}/{type}/{stem}.{ext}
     b. If not found and type == box_art: check roms/{system_id}/downloaded_images/{stem}.{ext}
  6. Return GameMedia struct

resolve_system_media(system_id):
  1. media_folder = system_to_media_folder(system_id)
  2. Scan storage/downloaded_media/{media_folder}/fanart/ for any image
  3. Scan storage/downloaded_media/{media_folder}/wheel/ for any image
  4. Return SystemMedia struct
```

## System Name Mapping Table
Maps our system IDs → `storage/downloaded_media/` folder names (ScreenScraper convention):
```
nes       → "Nintendo - Nintendo Entertainment System"
snes      → "Nintendo - Super Nintendo"
n64       → "Nintendo - Nintendo 64"
gb        → "Nintendo - Game Boy"
gbc       → "Nintendo - Game Boy Color"
gba       → "Nintendo - Game Boy Advance"
nds       → "Nintendo - DS"
gc        → "Nintendo - GameCube"
wii       → "Nintendo - Wii"
wiiu      → "Nintendo - Wii U"
switch    → "Nintendo - Switch"
megadrive → "Sega - Mega Drive - Genesis"
genesis   → "Sega - Mega Drive - Genesis"
mastersystem → "Sega - Master System - Mark III"
gamegear  → "Sega - Game Gear"
saturn    → "Sega - Saturn"
dreamcast → "Sega - Dreamcast"
psx       → "Sony - PlayStation"
ps2       → "Sony - PlayStation 2"
ps3       → "Sony - PlayStation 3"
psp       → "Sony - PlayStation Portable"
psvita    → "Sony - PlayStation Vita"
ps4       → "Sony - PlayStation 4"
atari2600 → "Atari - 2600"
atari5200 → "Atari - 5200"
atari7800 → "Atari - 7800"
pcengine  → "NEC - PC Engine - TurboGrafx-16"
neogeo    → "SNK - Neo Geo"
mame      → "MAME"
fbneo     → "FinalBurn Neo"
3ds       → "Nintendo - 3DS"
xbox      → "Microsoft - Xbox"
xbox360   → "Microsoft - Xbox 360"
```

## IPC Commands

```rust
// commands/media.rs
get_game_media(game_id: String) -> Result<GameMedia, String>
get_system_media(system_id: String) -> Result<SystemMedia, String>
```

## Frontend Hooks

```typescript
// hooks/useMedia.ts
useGameMedia(gameId: string | null) → { data: GameMedia | null, isLoading }
useSystemMedia(systemId: string | null) → { data: SystemMedia | null, isLoading }
```

Uses React Query with `staleTime: Infinity` (media paths don't change during session).

## VideoPreview Component

- `<video src={convertFileSrc(path)} autoPlay muted loop playsInline />`
- Mute toggle button (💔/🔊) overlaid bottom-right
- Fade in once loaded (onCanPlay)
- On unmount: pause + reset src to free memory
- Falls back to best image if video fails

## HyperSpin Theme Integration

### PreviewPanel updates:
1. If `mode === 'game'` and game has video → show VideoPreview
2. Else if game has box_art/mix_image/screenshot → show best image
3. Background: system fanart blurred at 20% opacity behind everything

### WheelCarousel/SystemWheel:
- Each badge: if system has wheel logo → show it instead of text (or alongside)

## Task Breakdown

- TASK-007-01: Rust models/media.rs + services/media_service.rs
- TASK-007-02: Rust commands/media.rs + register in lib.rs
- TASK-007-03: Frontend useMedia hook + api wrappers
- TASK-007-04: MediaImage + VideoPreview components
- TASK-007-05: Integrate into HyperSpin PreviewPanel + Default GameCard
