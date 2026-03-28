````skill
---
name: rom-scanner
description: Skill for scanning ROM files across filesystem directories, identifying systems by extension/header, computing hashes (CRC32/MD5/SHA-1), verifying against No-Intro/Redump DATs, and importing existing gamelist.xml metadata. Based on REAL data from a 170+ system EmuDeck collection.
version: "2.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  language: rust
  data-source: "E:\\Emulation (12K+ ROMs across 170+ system folders)"
---

# ROM Scanner Skill

## Purpose
Guide the implementation of ROM scanning functionality: recursive directory walking, file identification by extension and magic bytes, hash computation, DAT-based verification, and gamelist.xml/systems.txt import from existing ES-DE setups.

## Architecture

### Rust Crate Dependencies
```toml
walkdir = "2"          # Recursive directory traversal
sha2 = "0.10"          # SHA-256 hashing
sha1 = "0.10"          # SHA-1 for DAT verification
md-5 = "0.10"          # MD5 hashing
crc32fast = "1.4"      # CRC32 for DAT matching
rayon = "1.10"         # Parallel file processing
glob = "0.3"           # Pattern matching
quick-xml = "0.36"     # gamelist.xml parsing
zip = "2"              # Reading inside .zip archives
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["fs", "sync"] }
```

### Core Data Structures (Rust)

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Represents a discovered ROM file with all metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedRom {
    pub path: PathBuf,
    pub file_name: String,
    pub file_size: u64,
    pub system_id: String,           // Folder name: "nes", "psx", "gc"
    pub system_name: String,         // Display name from systems.txt: "Nintendo Entertainment System"
    pub extension: String,
    pub rom_format: RomFormat,
    pub subfolder: Option<String>,   // e.g., "# PT-BR #", "## HACKS ##"
    pub crc32: Option<String>,
    pub md5: Option<String>,
    pub sha1: Option<String>,
    pub dat_match: Option<DatMatch>,
    pub gamelist_meta: Option<GamelistMeta>,  // Imported from gamelist.xml
    pub scan_timestamp: i64,
}

/// ROM format classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RomFormat {
    CartridgeZip,     // .zip containing cartridge ROM (NES, SNES, N64, GBA, etc.)
    CartridgeRaw,     // .nes, .sfc, .gba, etc. uncompressed
    DiscIso,          // .iso standard disc image
    DiscChd,          // .chd MAME compressed disc
    DiscRvz,          // .rvz Dolphin compressed
    DiscCso,          // .cso compressed ISO (PSP)
    DiscPbp,          // .pbp PlayStation Store package
    DiscCdi,          // .cdi DiscJuggler (Dreamcast)
    DiscGdi,          // .gdi + track files (Dreamcast)
    NintendoPackage,  // .nsp, .xci (Switch)
    Directory,        // .ps3 directory, ScummVM game dir
    ArcadeRomSet,     // .zip MAME/FBNeo/NeoGeo ROM set
    Package,          // .vpk (Vita), .pkg (PS4)
    ShortcutLnk,      // .lnk (ShadPS4 special case)
}

/// Metadata imported from gamelist.xml
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamelistMeta {
    pub name: String,
    pub sortname: Option<String>,
    pub description: Option<String>,
    pub rating: Option<f32>,
    pub release_date: Option<String>,    // "YYYYMMDDTHHMMSS"
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub genre_id: Option<i32>,
    pub players: Option<String>,
    pub image_path: Option<String>,      // Relative: ./downloaded_images/X.png
    pub play_count: Option<i32>,
    pub last_played: Option<String>,
    pub md5: Option<String>,
    pub hash_crc32: Option<String>,      // Uppercase hex from <hash>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatMatch {
    pub dat_name: String,            // "No-Intro - NES"
    pub game_name: String,           // Verified game name
    pub region: Option<String>,      // "(USA)", "(EUR)", etc.
    pub status: DatStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatStatus {
    Verified,     // Hash matches known good dump
    BadDump,      // Known bad dump
    Unknown,      // Not in DAT
}

/// System discovered from data folder
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredSystem {
    pub folder_id: String,           // "nes", "psx", "gc"
    pub display_name: String,        // From systems.txt: "Nintendo Entertainment System"
    pub rom_count: usize,
    pub has_gamelist: bool,
    pub has_downloaded_images: bool,
    pub has_media: bool,             // In storage/downloaded_media/{id}/
    pub rom_formats: Vec<String>,    // Extensions found
    pub subfolders: Vec<String>,     // "# PT-BR #", "## HACKS ##", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanConfig {
    pub data_root: PathBuf,          // E.g., E:\Emulation
    pub systems_filter: Option<Vec<String>>,  // Scan only specific systems
    pub recursive: bool,             // Scan subfolders within system dirs
    pub compute_hashes: bool,
    pub verify_dats: bool,
    pub import_gamelist: bool,       // Import existing gamelist.xml
    pub max_file_size_mb: Option<u64>,
    pub skip_hidden: bool,           // Skip .dot files/dirs
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub total_files: usize,
    pub scanned: usize,
    pub identified: usize,
    pub imported: usize,             // From gamelist.xml
    pub errors: usize,
    pub current_file: String,
    pub current_system: String,
    pub phase: ScanPhase,
    pub systems_discovered: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScanPhase {
    SystemDiscovery,   // Reading systems.txt, scanning roms/ dirs
    GamelistImport,    // Parsing gamelist.xml files
    RomDiscovery,      // Walking directories for ROM files
    Identification,    // Matching extensions/headers
    Hashing,           // Computing checksums
    MediaMapping,      // Linking ROMs to media files
    Verification,      // DAT comparison
    Complete,
}
```

### System Identification Strategy

#### Phase 1: System Discovery from Data Folder
```rust
/// Discover systems from the data root
fn discover_systems(data_root: &Path) -> Result<Vec<DiscoveredSystem>, ScanError> {
    let roms_dir = data_root.join("roms");
    let systems_txt = roms_dir.join("systems.txt");
    
    // Parse systems.txt for display names
    let name_map = parse_systems_txt(&systems_txt)?;
    // Format: "folder_id: Display Name" per line
    
    // Scan roms/ directory for system folders
    let mut systems = Vec::new();
    for entry in std::fs::read_dir(&roms_dir)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let folder_id = entry.file_name().to_string_lossy().to_string();
            let display_name = name_map.get(&folder_id)
                .cloned()
                .unwrap_or_else(|| folder_id.clone());
            
            let system_path = entry.path();
            systems.push(DiscoveredSystem {
                folder_id: folder_id.clone(),
                display_name,
                rom_count: count_roms(&system_path),
                has_gamelist: system_path.join("gamelist.xml").exists(),
                has_downloaded_images: system_path.join("downloaded_images").is_dir(),
                has_media: data_root.join("storage/downloaded_media")
                    .join(&folder_id).is_dir(),
                rom_formats: detect_formats(&system_path),
                subfolders: detect_subfolders(&system_path),
            });
        }
    }
    Ok(systems)
}

/// Parse systems.txt: "folder_id: Display Name"
fn parse_systems_txt(path: &Path) -> Result<HashMap<String, String>, ScanError> {
    let content = std::fs::read_to_string(path)?;
    let mut map = HashMap::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') { continue; }
        if let Some((id, name)) = line.split_once(':') {
            map.insert(id.trim().to_string(), name.trim().to_string());
        }
    }
    Ok(map)
}
```

#### Phase 2: ROM Identification by Extension (primary method)
```rust
/// Extension → possible system IDs (when ROM is NOT inside a system folder)
/// When scanning inside a known system folder, system is already determined
fn identify_system_by_extension(ext: &str) -> Option<Vec<&str>> {
    match ext.to_lowercase().as_str() {
        // === Cartridge systems (typically found as .zip) ===
        "a26" | "bin" => Some(vec!["atari2600"]),  // .bin is ambiguous
        "a52" => Some(vec!["atari5200"]),
        "a78" => Some(vec!["atari7800"]),
        "nes" | "unf" | "unif" => Some(vec!["nes"]),
        "fds" => Some(vec!["fds"]),
        "sfc" | "smc" => Some(vec!["snes"]),
        "bs" => Some(vec!["satellaview"]),
        "gb" => Some(vec!["gb"]),
        "gbc" => Some(vec!["gbc"]),
        "gba" => Some(vec!["gba"]),
        "n64" | "v64" | "z64" => Some(vec!["n64"]),
        "nds" => Some(vec!["nds"]),
        "3ds" | "cia" | "cxi" => Some(vec!["3ds"]),
        "gen" | "md" | "smd" => Some(vec!["megadrive"]),
        "sms" => Some(vec!["mastersystem"]),
        "gg" => Some(vec!["gamegear"]),
        "sg" => Some(vec!["sg1000"]),
        "pce" => Some(vec!["pcengine"]),
        "ws" => Some(vec!["wswan"]),
        "wsc" => Some(vec!["wswanc"]),
        "ngp" | "ngc" => Some(vec!["ngpc"]),
        "int" => Some(vec!["intellivision"]),
        "col" => Some(vec!["colecovision"]),
        "mgw" => Some(vec!["gw"]),
        "j64" | "jag" => Some(vec!["atarijaguar"]),
        
        // === Disc/package formats ===
        "pbp" => Some(vec!["psx"]),           // PSX via PBP
        "cso" => Some(vec!["psp"]),           // PSP compressed
        "rvz" => Some(vec!["gc", "wii"]),     // Dolphin format
        "cdi" => Some(vec!["dreamcast"]),     // DiscJuggler
        "gdi" => Some(vec!["dreamcast"]),     // GD-ROM descriptor
        "wbfs" => Some(vec!["wii"]),
        "wad" => Some(vec!["wii"]),
        "wux" | "wud" | "rpx" => Some(vec!["wiiu"]),
        "nsp" | "xci" | "nca" => Some(vec!["switch"]),
        "vpk" => Some(vec!["psvita"]),
        "xex" => Some(vec!["xbox360"]),
        "pkg" => Some(vec!["ps4"]),           // Also PS3/Vita, context needed
        "lnk" => Some(vec!["ps4"]),           // ShadPS4 shortcuts
        
        // === Multi-system formats (need system folder context) ===
        "iso" => Some(vec!["ps2", "psp", "gc", "wii", "xbox", "xbox360"]),
        "chd" => Some(vec!["psx", "ps2", "dreamcast", "psp"]),
        "cue" => Some(vec!["psx", "ps2", "dreamcast"]),
        
        // === Archive formats (context-dependent) ===
        "zip" => None,   // Could be any cartridge system OR arcade ROM set
        "7z" => Some(vec!["mame", "fbneo"]),
        
        _ => None,
    }
}
```

#### Phase 3: Header Magic Bytes (disambiguation for loose files)
```rust
fn identify_by_header(data: &[u8]) -> Option<&str> {
    if data.len() < 16 { return None; }
    
    // NES: "NES\x1A" (iNES header)
    if &data[0..4] == b"NES\x1A" { return Some("nes"); }
    
    // N64: Big-endian: 0x80371240
    if &data[0..4] == &[0x80, 0x37, 0x12, 0x40] { return Some("n64"); }
    // N64 Byte-swapped: 0x37804012
    if &data[0..4] == &[0x37, 0x80, 0x40, 0x12] { return Some("n64"); }
    // N64 Little-endian: 0x40123780
    if &data[0..4] == &[0x40, 0x12, 0x37, 0x80] { return Some("n64"); }
    
    // GB/GBC: Nintendo logo at 0x104, type at 0x143
    if data.len() > 0x150 && data[0x104..0x108] == [0xCE, 0xED, 0x66, 0x66] {
        return if data[0x143] == 0x80 || data[0x143] == 0xC0 {
            Some("gbc")
        } else {
            Some("gb")
        };
    }
    
    // GBA: Fixed value at 0xB2 == 0x96
    if data.len() > 0xBD && data[0xB2] == 0x96 { return Some("gba"); }
    
    // SNES: Check for valid header at 0x7FC0 (LoROM) or 0xFFC0 (HiROM)
    if data.len() > 0x8000 {
        // LoROM check
        let checksum = u16::from_le_bytes([data[0x7FDC], data[0x7FDD]]);
        let complement = u16::from_le_bytes([data[0x7FDE], data[0x7FDF]]);
        if checksum ^ complement == 0xFFFF { return Some("snes"); }
    }
    
    // NDS: "PASS" at offset, Nintendo logo CRC at 0x15C
    if data.len() > 0x160 {
        let logo_crc = u16::from_le_bytes([data[0x15C], data[0x15D]]);
        if logo_crc == 0xCF56 { return Some("nds"); }
    }
    
    None
}
```

#### Phase 4: Directory-Based ROM Detection
```rust
/// Detect directory-based "ROMs" (PS3, ScummVM)
fn detect_directory_roms(system_path: &Path, system_id: &str) -> Vec<PathBuf> {
    match system_id {
        "ps3" => {
            // PS3 games are directories ending in .ps3
            // containing PS3_GAME/, PS3_DISC.SFB
            std::fs::read_dir(system_path)
                .into_iter()
                .flatten()
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.file_type().map(|ft| ft.is_dir()).unwrap_or(false)
                    && e.file_name().to_string_lossy().ends_with(".ps3")
                    && e.path().join("PS3_DISC.SFB").exists()
                })
                .map(|e| e.path())
                .collect()
        }
        "scummvm" => {
            // ScummVM games are subdirectories with game data
            std::fs::read_dir(system_path)
                .into_iter()
                .flatten()
                .filter_map(|e| e.ok())
                .filter(|e| e.file_type().map(|ft| ft.is_dir()).unwrap_or(false))
                .map(|e| e.path())
                .collect()
        }
        _ => Vec::new(),
    }
}
```

### Scanning Pipeline

```
1. SYSTEM DISCOVERY
   ├── Parse systems.txt for folder_id → display_name mapping
   ├── List directories in roms/
   ├── Check for gamelist.xml, downloaded_images/ in each
   ├── Check for storage/downloaded_media/{system}/ 
   └── Emit ScanProgress::SystemDiscovery

2. GAMELIST IMPORT (if import_gamelist=true)
   ├── For each system with gamelist.xml
   ├── Parse XML → GamelistMeta per <game> entry
   ├── Index by ROM filename for quick lookup
   ├── Extract existing hashes (md5, crc32)
   └── Emit ScanProgress::GamelistImport

3. ROM DISCOVERY: walkdir per system folder
   ├── Walk system directory recursively
   ├── Track subfolder names (# PT-BR #, ## HACKS ##, etc.)
   ├── Filter by known extensions
   ├── Detect directory-based ROMs (PS3, ScummVM)
   ├── Skip: gamelist.xml, downloaded_images/, metadata.txt, systeminfo.txt
   ├── Skip hidden files/dirs (., ..)
   ├── Skip files > max_file_size_mb
   └── Emit ScanProgress::RomDiscovery

4. IDENTIFICATION: Parallel with rayon
   ├── System already known from folder location
   ├── Classify ROM format (CartridgeZip, DiscIso, etc.)
   ├── For .zip files: peek at contents for true format
   ├── For ambiguous extensions: read header magic bytes
   ├── Merge with gamelist metadata if available
   └── Emit ScanProgress::Identification

5. MEDIA MAPPING
   ├── For each ROM, search media in:
   │   ├── storage/downloaded_media/{system}/{media_type}/
   │   └── roms/{system}/downloaded_images/
   ├── Match by filename (ROM name minus ext = media name minus ext)
   └── Emit ScanProgress::MediaMapping

6. HASHING: Parallel with rayon (optional, or use gamelist hashes)
   ├── Check if gamelist already has hashes → skip if present
   ├── CRC32 (fast, for DAT matching)
   ├── MD5 (for gamelist compat)
   ├── SHA-1 (for BIOS verification)
   └── Emit ScanProgress::Hashing

7. VERIFICATION: Compare against DATs (optional)
   ├── Load DAT XML/CLR files
   ├── Match by CRC32 → then SHA-1
   ├── Set DatStatus: Verified/BadDump/Unknown
   └── Emit ScanProgress::Verification
```

### Gamelist XML Parser

```rust
use quick_xml::events::Event;
use quick_xml::Reader;

/// Parse gamelist.xml from a system directory
fn parse_gamelist(gamelist_path: &Path) -> Result<Vec<GamelistMeta>, ScanError> {
    let content = std::fs::read_to_string(gamelist_path)?;
    let mut reader = Reader::from_str(&content);
    let mut games = Vec::new();
    let mut current_game: Option<GamelistMetaBuilder> = None;
    let mut current_field = String::new();
    
    loop {
        match reader.read_event()? {
            Event::Start(e) => {
                match e.name().as_ref() {
                    b"game" => current_game = Some(GamelistMetaBuilder::new()),
                    _ => current_field = String::from_utf8_lossy(e.name().as_ref()).to_string(),
                }
            }
            Event::Text(e) => {
                if let Some(ref mut game) = current_game {
                    let text = e.unescape()?.to_string();
                    match current_field.as_str() {
                        "path" => game.path = Some(text),
                        "name" => game.name = Some(text),
                        "sortname" => game.sortname = Some(text),
                        "desc" => game.description = Some(text),
                        "rating" => game.rating = text.parse().ok(),
                        "releasedate" => game.release_date = Some(text),
                        "developer" => game.developer = Some(text),
                        "publisher" => game.publisher = Some(text),
                        "genre" => game.genre = Some(text),
                        "genreid" => game.genre_id = text.parse().ok(),
                        "players" => game.players = Some(text),
                        "image" => game.image_path = Some(text),
                        "playcount" => game.play_count = text.parse().ok(),
                        "lastplayed" => game.last_played = Some(text),
                        "md5" => game.md5 = Some(text),
                        "hash" => game.hash_crc32 = Some(text),
                        _ => {}
                    }
                }
            }
            Event::End(e) if e.name().as_ref() == b"game" => {
                if let Some(game) = current_game.take() {
                    if let Some(meta) = game.build() {
                        games.push(meta);
                    }
                }
            }
            Event::Eof => break,
            _ => {}
        }
    }
    Ok(games)
}
```

### Subfolder Detection

```rust
/// Detect organizational subfolders (# Name #, ## Name ##)
fn detect_subfolders(system_path: &Path) -> Vec<String> {
    std::fs::read_dir(system_path)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|ft| ft.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| {
            // Skip known non-ROM directories
            !matches!(name.as_str(), "downloaded_images" | ".DS_Store")
            // Include directories with # pattern (organizational)
            && (name.starts_with('#') || name.starts_with("##"))
        })
        .collect()
}

/// All organizational subfolder patterns found in real data:
/// "# PT-BR #"        — Regional collection (Brazil)
/// "## HACKS ##"      — ROM hacks collection
/// "# DYNAVISION #"   — Special hardware collection
/// "# Japan #"        — Japanese imports
/// "# GENESIS (JP) #" — Cross-system regional
/// "# TAITO #"        — Publisher collection
```

### ZIP Archive Inspection

```rust
/// For .zip files, peek inside to determine actual ROM format
fn inspect_zip_contents(zip_path: &Path) -> Result<RomFormat, ScanError> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    
    // Check first file's extension
    if archive.len() > 0 {
        let entry = archive.by_index(0)?;
        let name = entry.name().to_lowercase();
        
        // Arcade ROM sets contain multiple files (program ROMs, audio, gfx)
        if archive.len() > 3 {
            return Ok(RomFormat::ArcadeRomSet);
        }
        
        // Single-file zips are cartridge ROMs
        if name.ends_with(".nes") || name.ends_with(".sfc") || name.ends_with(".smc")
            || name.ends_with(".gb") || name.ends_with(".gbc") || name.ends_with(".gba")
            || name.ends_with(".md") || name.ends_with(".gen") || name.ends_with(".n64")
            || name.ends_with(".sms") || name.ends_with(".gg") || name.ends_with(".pce")
        {
            return Ok(RomFormat::CartridgeZip);
        }
    }
    
    Ok(RomFormat::CartridgeZip) // Default for single-file zips
}
```

### Tauri IPC Commands

```rust
#[tauri::command]
async fn discover_systems(
    data_root: String,
) -> Result<Vec<DiscoveredSystem>, String> {
    // List systems from roms/ dir + systems.txt
    todo!()
}

#[tauri::command]
async fn scan_roms(
    config: ScanConfig,
    app: tauri::AppHandle,
) -> Result<Vec<ScannedRom>, String> {
    // Use app.emit("scan-progress", &progress) for events
    todo!()
}

#[tauri::command]
async fn cancel_scan() -> Result<(), String> {
    // Set cancellation token (AtomicBool)
    todo!()
}

#[tauri::command]
async fn get_scan_progress() -> Result<ScanProgress, String> {
    todo!()
}

#[tauri::command]
async fn import_gamelist(
    system_id: String,
    gamelist_path: String,
) -> Result<Vec<GamelistMeta>, String> {
    todo!()
}

#[tauri::command]
async fn verify_rom_hash(
    path: String,
    algorithm: String, // "crc32", "md5", "sha1"
) -> Result<String, String> {
    todo!()
}

#[tauri::command]
async fn detect_data_folders() -> Result<Vec<String>, String> {
    // Auto-detect common locations:
    // 1. EmuDeck: check for E:\Emulation, D:\Emulation, etc.
    // 2. Check %APPDATA%/emudeck/ for configuration
    // 3. Common paths: ~/Emulation, ~/Games, etc.
    todo!()
}
```

### Frontend Integration (React)

```typescript
// src/hooks/useRomScanner.ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface ScanConfig {
  dataRoot: string;          // Root emulation folder
  systemsFilter?: string[];  // Filter specific systems
  recursive: boolean;
  computeHashes: boolean;
  verifyDats: boolean;
  importGamelist: boolean;   // Import existing gamelist.xml data
  maxFileSizeMb?: number;
}

interface ScanProgress {
  totalFiles: number;
  scanned: number;
  identified: number;
  imported: number;
  errors: number;
  currentFile: string;
  currentSystem: string;
  phase: 'SystemDiscovery' | 'GamelistImport' | 'RomDiscovery' | 
         'Identification' | 'Hashing' | 'MediaMapping' | 'Verification' | 'Complete';
  systemsDiscovered: number;
}

interface DiscoveredSystem {
  folderId: string;
  displayName: string;
  romCount: number;
  hasGamelist: boolean;
  hasDownloadedImages: boolean;
  hasMedia: boolean;
  romFormats: string[];
  subfolders: string[];
}

export function useRomScanner() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [systems, setSystems] = useState<DiscoveredSystem[]>([]);
  
  useEffect(() => {
    const unlisten = listen<ScanProgress>('scan-progress', (event) => {
      setProgress(event.payload);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);
  
  const discoverSystems = async (dataRoot: string) => {
    const result = await invoke<DiscoveredSystem[]>('discover_systems', { dataRoot });
    setSystems(result);
    return result;
  };
  
  const startScan = async (config: ScanConfig) => {
    return invoke<ScannedRom[]>('scan_roms', { config });
  };
  
  const cancelScan = async () => invoke('cancel_scan');
  
  return { progress, systems, discoverSystems, startScan, cancelScan };
}
```

### Files to SKIP During Scanning
```rust
const SKIP_FILES: &[&str] = &[
    "gamelist.xml",
    "metadata.txt",
    "systeminfo.txt",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
];

const SKIP_DIRS: &[&str] = &[
    "downloaded_images",  // Local scraper images (not ROMs)
    ".git",
    ".svn",
];

/// Check if a file should be skipped
fn should_skip(entry: &walkdir::DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    
    if entry.file_type().is_dir() {
        return SKIP_DIRS.contains(&name.as_ref());
    }
    
    SKIP_FILES.contains(&name.as_ref())
        || name.starts_with('.')
}
```

### Media Matching Logic

```rust
/// Find all media files for a given ROM
fn find_media_for_rom(
    rom_name: &str,      // "Akira (Europe)" (without extension)
    system_id: &str,     // "megadrive"
    data_root: &Path,    // E:\Emulation
) -> HashMap<String, PathBuf> {
    let mut media = HashMap::new();
    
    // Location 1: storage/downloaded_media/{system}/{type}/{name}.ext
    let media_root = data_root
        .join("storage/downloaded_media")
        .join(system_id);
    
    let media_types = [
        "box2dfront", "wheel", "screenshots", "titlescreens",
        "videos", "miximages", "3dboxes", "backcovers",
        "fanart", "manuals", "physicalmedia",
    ];
    
    for media_type in &media_types {
        let type_dir = media_root.join(media_type);
        if type_dir.is_dir() {
            // Try common extensions
            for ext in &["png", "jpg", "jpeg", "mp4", "pdf"] {
                let path = type_dir.join(format!("{}.{}", rom_name, ext));
                if path.exists() {
                    media.insert(media_type.to_string(), path);
                    break;
                }
            }
        }
    }
    
    // Location 2: roms/{system}/downloaded_images/{name}.png
    let local_img = data_root
        .join("roms")
        .join(system_id)
        .join("downloaded_images")
        .join(format!("{}.png", rom_name));
    if local_img.exists() {
        media.entry("box2dfront".to_string())
            .or_insert(local_img);
    }
    
    media
}
```

## Performance Guidelines
- Use `rayon::par_iter()` for hashing — it's CPU-bound
- Read files in chunks (8KB) for hashing, don't load entire ROM into memory
- For PS2 ISOs (4GB+), hash in streaming mode (or skip hashing large files)
- Cache scan results in SQLite — only re-scan if mtime changed
- Use `walkdir` with `follow_links(false)` to avoid infinite loops
- Emit progress events every 100 files or every 500ms, whichever comes first
- **Import gamelist.xml hashes** instead of recomputing when available
- Scan systems in parallel with rayon, but IO-bound ops stay sequential
- Pre-allocate Vec based on estimated ROM count from quick directory listing

## Testing Strategy
- Unit test: extension → system identification map
- Unit test: header magic bytes → system identification
- Unit test: CRC32/MD5/SHA-1 computation against known values
- Unit test: gamelist.xml parsing with real ES-DE format
- Unit test: systems.txt parsing
- Unit test: subfolder detection (# patterns)
- Unit test: media matching by filename
- Integration test: scan a test directory with sample files
- Integration test: import gamelist.xml and correlate with ROMs
- Integration test: discover systems from mock data folder
- Benchmark: scan throughput on 10K files
- Benchmark: gamelist.xml parse time (large files with 1000+ entries)
````
