````skill
---
name: media-manager
description: Skill for managing game media assets (box art, screenshots, videos, manuals, etc.), indexing from dual source locations, generating thumbnails, lazy loading, and caching. Based on REAL media data from a production E:\Emulation setup with 58K+ files across 13 media types.
version: "1.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: rust
  data-source: "E:\\Emulation\\storage\\downloaded_media + E:\\Emulation\\roms\\*/downloaded_images"
---

# Media Manager Skill

## Purpose
Guide the implementation of game media asset management: indexing media from filesystem, matching to games, thumbnail generation, lazy loading in the UI, caching, and efficient display.

## Real Media Data Summary

### Total Inventory
- **58,000+ media files** across all systems
- **36,000+ PNG** (box art, screenshots, wheels)
- **12,000+ JPG** (fan art, screenshots)
- **5,800+ MP4** (video snaps)
- **3,200+ PDF** (manuals)

### Dual Media Locations
Media exists in TWO separate directory trees. **Both must be scanned.**

#### Location 1: `storage/downloaded_media/{system}/{media_type}/`
Primary media storage from ScreenScraper/Skraper downloads.
```
E:\Emulation\storage\downloaded_media\
├── Sega - Mega Drive - Genesis\
│   ├── box2dfront\           # Box art front
│   ├── box2dback\            # Box art back
│   ├── sstitle\              # Title screen
│   ├── ss\                   # In-game screenshot
│   ├── fanart\               # Fan artwork
│   ├── wheel\                # Clear logo/wheel
│   ├── video\                # Video snap
│   ├── marquee\              # Marquee/banner
│   ├── bezels\               # Bezel overlays
│   ├── manual\               # Game manuals (PDF)
│   ├── maps\                 # Game maps
│   ├── mixrbv2\              # Mix image (composite)
│   └── support2d\            # 2D support renders
├── Sony - PlayStation\
│   └── ...
├── Nintendo - Super Nintendo\
│   └── ...
└── [40+ system folders]
```

#### Location 2: `roms/{system}/downloaded_images/`
Per-system media from EmulationStation scraping.
```
E:\Emulation\roms\
├── nes\
│   └── downloaded_images\    # PNG box art per game
├── snes\
│   └── downloaded_images\
├── psx\
│   └── downloaded_images\
└── ...
```

### Media Type Registry (13 Types)

| Media Type | Format | Typical Size | Example |
|-----------|--------|-------------|---------|
| `box2dfront` | PNG | 180KB - 1.4MB | Front box art |
| `box2dback` | PNG | 200KB - 1.5MB | Back box art |
| `sstitle` | PNG | 30KB - 150KB | Title screen capture |
| `ss` | PNG | 40KB - 200KB | In-game screenshot |
| `fanart` | JPG | 200KB - 2MB | Fan artwork |
| `wheel` | PNG (transparent) | 15KB - 50KB | Clear logo/wheel |
| `video` | MP4 | 1.2MB - 4.4MB | Video snap (~30s) |
| `marquee` | PNG | 20KB - 100KB | Marquee/banner |
| `bezels` | PNG | 500KB - 3MB | Bezel overlays |
| `manual` | PDF | 2MB - 14MB | Game manual |
| `maps` | PNG/JPG | 100KB - 5MB | Game world maps |
| `mixrbv2` | PNG | 100KB - 400KB | Composite mix image |
| `support2d` | PNG | 50KB - 200KB | 2D support render |

---

## Data Structures

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameMedia {
    pub game_id: i64,
    pub media_type: MediaType,
    pub source_path: PathBuf,
    pub thumbnail_path: Option<PathBuf>,
    pub file_size: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: String,
    pub source: MediaSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum MediaType {
    Box2dFront,
    Box2dBack,
    TitleScreen,    // sstitle
    Screenshot,     // ss
    FanArt,
    Wheel,
    Video,
    Marquee,
    Bezel,
    Manual,
    Map,
    MixImage,       // mixrbv2
    Support2d,
}

impl MediaType {
    pub fn folder_name(&self) -> &str {
        match self {
            Self::Box2dFront => "box2dfront",
            Self::Box2dBack => "box2dback",
            Self::TitleScreen => "sstitle",
            Self::Screenshot => "ss",
            Self::FanArt => "fanart",
            Self::Wheel => "wheel",
            Self::Video => "video",
            Self::Marquee => "marquee",
            Self::Bezel => "bezels",
            Self::Manual => "manual",
            Self::Map => "maps",
            Self::MixImage => "mixrbv2",
            Self::Support2d => "support2d",
        }
    }
    
    pub fn display_name(&self) -> &str {
        match self {
            Self::Box2dFront => "Box Art (Front)",
            Self::Box2dBack => "Box Art (Back)",
            Self::TitleScreen => "Title Screen",
            Self::Screenshot => "Screenshot",
            Self::FanArt => "Fan Art",
            Self::Wheel => "Logo/Wheel",
            Self::Video => "Video",
            Self::Marquee => "Marquee",
            Self::Bezel => "Bezel",
            Self::Manual => "Manual",
            Self::Map => "Map",
            Self::MixImage => "Mix Image",
            Self::Support2d => "Support Render",
        }
    }
    
    pub fn is_image(&self) -> bool {
        !matches!(self, Self::Video | Self::Manual)
    }
    
    /// Priority order for display (which image to show first)
    pub fn display_priority(&self) -> u8 {
        match self {
            Self::Box2dFront => 0,  // Highest: always show box art
            Self::MixImage => 1,
            Self::Screenshot => 2,
            Self::TitleScreen => 3,
            Self::Wheel => 4,
            Self::FanArt => 5,
            Self::Marquee => 6,
            Self::Box2dBack => 7,
            Self::Video => 8,
            Self::Support2d => 9,
            Self::Bezel => 10,
            Self::Map => 11,
            Self::Manual => 12,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MediaSource {
    /// From storage/downloaded_media/{system}/{type}/
    DownloadedMedia,
    /// From roms/{system}/downloaded_images/
    DownloadedImages,
    /// User manually added
    UserAdded,
}
```

---

## System Name Mapping

The `storage/downloaded_media/` folder uses full system names (ScreenScraper convention),
while `roms/` uses short IDs.

```rust
/// Map short system ID to ScreenScraper folder name
fn system_to_media_folder(system_id: &str) -> Option<&str> {
    match system_id {
        "nes" => Some("Nintendo - Nintendo Entertainment System"),
        "snes" => Some("Nintendo - Super Nintendo"),
        "n64" => Some("Nintendo - Nintendo 64"),
        "gb" => Some("Nintendo - Game Boy"),
        "gbc" => Some("Nintendo - Game Boy Color"),
        "gba" => Some("Nintendo - Game Boy Advance"),
        "nds" => Some("Nintendo - DS"),
        "3ds" => Some("Nintendo - 3DS"),
        "gc" => Some("Nintendo - GameCube"),
        "wii" => Some("Nintendo - Wii"),
        "wiiu" => Some("Nintendo - Wii U"),
        "switch" => Some("Nintendo - Switch"),
        "megadrive" => Some("Sega - Mega Drive - Genesis"),
        "mastersystem" => Some("Sega - Master System - Mark III"),
        "gamegear" => Some("Sega - Game Gear"),
        "saturn" => Some("Sega - Saturn"),
        "dreamcast" => Some("Sega - Dreamcast"),
        "psx" => Some("Sony - PlayStation"),
        "ps2" => Some("Sony - PlayStation 2"),
        "ps3" => Some("Sony - PlayStation 3"),
        "psp" => Some("Sony - PlayStation Portable"),
        "psvita" => Some("Sony - PlayStation Vita"),
        "atari2600" => Some("Atari - 2600"),
        "atari5200" => Some("Atari - 5200"),
        "atari7800" => Some("Atari - 7800"),
        "pcengine" => Some("NEC - PC Engine - TurboGrafx-16"),
        "neogeo" => Some("SNK - Neo Geo"),
        "mame" => Some("MAME"),
        "fbneo" => Some("FinalBurn Neo"),
        "colecovision" => Some("Coleco - ColecoVision"),
        "sg1000" => Some("Sega - SG-1000"),
        _ => None,
    }
}
```

---

## Media Indexing Pipeline

```rust
/// Index all media for a given system
pub fn index_system_media(
    data_root: &Path,      // E:\Emulation
    system_id: &str,
    games: &[GameEntry],   // Already-scanned games
) -> Vec<GameMedia> {
    let mut all_media = Vec::new();
    
    // Source 1: storage/downloaded_media/{full_system_name}/{type}/
    if let Some(media_folder) = system_to_media_folder(system_id) {
        let media_base = data_root.join("storage/downloaded_media").join(media_folder);
        if media_base.is_dir() {
            for media_type in MediaType::all() {
                let type_dir = media_base.join(media_type.folder_name());
                if type_dir.is_dir() {
                    index_media_directory(&type_dir, media_type, MediaSource::DownloadedMedia, games, &mut all_media);
                }
            }
        }
    }
    
    // Source 2: roms/{system_id}/downloaded_images/
    let images_dir = data_root.join("roms").join(system_id).join("downloaded_images");
    if images_dir.is_dir() {
        // These are typically box art images
        index_media_directory(&images_dir, MediaType::Box2dFront, MediaSource::DownloadedImages, games, &mut all_media);
    }
    
    all_media
}

/// Match media files to games by filename
fn index_media_directory(
    dir: &Path,
    media_type: MediaType,
    source: MediaSource,
    games: &[GameEntry],
    results: &mut Vec<GameMedia>,
) {
    for entry in std::fs::read_dir(dir).into_iter().flatten().flatten() {
        let path = entry.path();
        if !path.is_file() { continue; }
        
        let file_stem = path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default();
        
        // Match: media filename stem == ROM filename stem
        // e.g., "Sonic The Hedgehog (USA, Europe).png" matches
        //        "Sonic The Hedgehog (USA, Europe).md"
        if let Some(game) = find_game_by_stem(games, file_stem) {
            let metadata = std::fs::metadata(&path).ok();
            results.push(GameMedia {
                game_id: game.id,
                media_type: media_type.clone(),
                source_path: path.clone(),
                thumbnail_path: None,
                file_size: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                width: None,
                height: None,
                mime_type: mime_from_extension(&path),
                source,
            });
        }
    }
}

fn mime_from_extension(path: &Path) -> String {
    match path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png".into(),
        Some("jpg") | Some("jpeg") => "image/jpeg".into(),
        Some("mp4") => "video/mp4".into(),
        Some("pdf") => "application/pdf".into(),
        Some("webp") => "image/webp".into(),
        _ => "application/octet-stream".into(),
    }
}
```

---

## Thumbnail Generation

```rust
/// Generate thumbnails for grid/list views
/// Use Tauri's asset protocol to serve images efficiently
pub fn generate_thumbnail(
    source: &Path,
    thumb_dir: &Path,
    target_width: u32,
) -> Result<PathBuf, MediaError> {
    // Use `image` crate for resizing
    let img = image::open(source)
        .map_err(|e| MediaError::ImageProcessing(e.to_string()))?;
    
    let thumb = img.resize(
        target_width,
        u32::MAX, // Maintain aspect ratio
        image::imageops::FilterType::Lanczos3,
    );
    
    let hash = blake3::hash(source.to_string_lossy().as_bytes());
    let thumb_path = thumb_dir.join(format!("{}.webp", hash.to_hex()));
    
    thumb.save_with_format(&thumb_path, image::ImageFormat::WebP)
        .map_err(|e| MediaError::SaveFailed(e.to_string()))?;
    
    Ok(thumb_path)
}

/// Thumbnail size presets
pub struct ThumbnailSizes;
impl ThumbnailSizes {
    pub const GRID_SMALL: u32 = 160;   // Grid view compact
    pub const GRID_MEDIUM: u32 = 240;  // Grid view normal
    pub const GRID_LARGE: u32 = 320;   // Grid view large
    pub const DETAIL: u32 = 480;       // Detail panel
    pub const HERO: u32 = 800;         // Hero/banner image
}
```

---

## Frontend Integration

### React Media Component
```tsx
import { convertFileSrc } from '@tauri-apps/api/core';

interface GameMediaProps {
  gamePath: string;  // ROM path (stem used for matching)
  mediaType: string; // "box2dfront", "screenshot", etc.
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
}

function GameMediaImage({ gamePath, mediaType, width, height, fallback }: GameMediaProps) {
  const { data: mediaUrl, isLoading, error } = useQuery({
    queryKey: ['media', gamePath, mediaType],
    queryFn: async () => {
      const result = await invoke<string | null>('get_game_media', {
        romPath: gamePath,
        mediaType,
      });
      if (!result) return null;
      // Convert filesystem path to Tauri asset URL
      return convertFileSrc(result);
    },
    staleTime: Infinity, // Media paths don't change often
  });

  if (isLoading) return <div className="animate-pulse bg-surface-200 rounded" />;
  if (error || !mediaUrl) return fallback ?? <PlaceholderImage />;

  return (
    <img
      src={mediaUrl}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className="object-cover rounded"
    />
  );
}
```

### Lazy Loading Strategy
```tsx
// Use IntersectionObserver for virtualized grids
function useVisibleMedia(ref: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px' } // Preload 200px ahead
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return isVisible;
}
```

### Video Preview Component
```tsx
function VideoPreview({ videoPath }: { videoPath: string }) {
  const videoUrl = convertFileSrc(videoPath);
  
  return (
    <video
      src={videoUrl}
      autoPlay
      muted
      loop
      playsInline
      className="w-full h-full object-cover"
      onError={(e) => {
        // Fallback to static image if video fails
        (e.target as HTMLVideoElement).style.display = 'none';
      }}
    />
  );
}
```

---

## Caching Strategy

```rust
/// LRU cache for media path lookups
/// Avoids repeated filesystem scans
use lru::LruCache;
use std::num::NonZeroUsize;

pub struct MediaCache {
    /// (game_id, media_type) -> file path
    path_cache: LruCache<(i64, MediaType), Option<PathBuf>>,
    /// source_path -> thumbnail_path
    thumb_cache: LruCache<PathBuf, PathBuf>,
}

impl MediaCache {
    pub fn new() -> Self {
        Self {
            path_cache: LruCache::new(NonZeroUsize::new(10_000).unwrap()),
            thumb_cache: LruCache::new(NonZeroUsize::new(5_000).unwrap()),
        }
    }
}
```

---

## Tauri IPC Commands

```rust
#[tauri::command]
async fn get_game_media(
    rom_path: String,
    media_type: String,
) -> Result<Option<String>, String> {
    // Resolve media path for given game and type
    // Check both media locations
    // Return full path or None
    todo!()
}

#[tauri::command]
async fn get_all_game_media(
    rom_path: String,
) -> Result<Vec<GameMedia>, String> {
    // Return all media types available for a game
    todo!()
}

#[tauri::command]
async fn get_media_stats() -> Result<MediaStats, String> {
    // Total files, disk usage, per-type counts
    todo!()
}

#[tauri::command]
async fn generate_thumbnails(
    system_id: String,
    size: u32,
) -> Result<u32, String> {
    // Batch generate thumbnails for a system
    // Return count of generated thumbnails
    todo!()
}
```

---

## Key Design Rules

1. **Check BOTH media locations** — `storage/downloaded_media/` AND `roms/*/downloaded_images/`
2. **Match by filename stem** — media filename minus extension must match ROM filename minus extension
3. **System name mapping required** — `downloaded_media` uses full names, `roms` uses short IDs
4. **Priority display order** — Box art first, then mix, screenshot, title screen
5. **Lazy load everything** — 58K+ files means aggressive lazy loading
6. **WebP thumbnails** — Generate WebP thumbnails for fast grid rendering
7. **Tauri asset protocol** — Use `convertFileSrc()` for serving local files
8. **LRU caching** — Cache media path lookups, avoid repeated FS scans
9. **Video on hover** — Play video snaps when user hovers on game card
10. **Graceful fallback** — Always show placeholder if media missing
````
