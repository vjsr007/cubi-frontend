````skill
---
name: emulator-domain-knowledge
description: Comprehensive knowledge about emulator frontends, game systems, ROM formats, BIOS requirements, emulator configurations, and the retro gaming ecosystem. Based on REAL data from a production EmuDeck setup. Use this skill when working on any emulator-related feature.
version: "2.0.0"
metadata:
  author: cubi-frontend team
  domain: retro-gaming
  stack: tauri-rust-react
  data-source: "E:\\Emulation (production EmuDeck setup, 170+ systems, 58K+ media files)"
---

# Emulator Domain Knowledge

## Core Architecture: Portable Data Folder

### Design Principle
The emulation data folder (ROMs, BIOS, saves, media) is **completely separate** from emulator installations. This enables:
- **Portability**: Move the data folder to any drive/machine
- **Independence**: No dependency on local emulator paths
- **Backup**: Only data needs backup, emulators are reinstallable

### Real Folder Structure (from production EmuDeck setup)
```
{DATA_ROOT}/                    # e.g., E:\Emulation — user-configurable
├── bios/                       # BIOS files (200+ files, loose + emulator subdirs)
├── roms/                       # ROM files (170+ system folders)
│   └── systems.txt             # System folder → display name mapping
├── saves/                      # Save files (per-emulator organization)
├── storage/                    # Scraped media (downloaded_media/)
│   └── downloaded_media/       # 58K+ files across 13 media types
├── dlc/                        # DLC content (switch/)
└── tools/                      # Launchers, utilities, CHD converter
    ├── launchers/              # 23 PowerShell launcher scripts
    ├── esde/                   # ES-DE frontend configs
    ├── pegasus/                # Pegasus frontend configs
    ├── srm/                    # Save Room Manager
    └── chdconv/                # CHD conversion tool
```

### Emulator Installation (External — NOT in data folder)
Emulators live at `%APPDATA%/emudeck/Emulators/` on Windows:
```
%APPDATA%/emudeck/Emulators/
├── RetroArch/retroarch.exe
├── duckstation/duckstation-qt-x64-ReleaseLTCG.exe
├── Dolphin-x64/Dolphin.exe
├── PCSX2-Qt/pcsx2-qtx64.exe
├── PPSSPP/PPSSPPWindows64.exe
├── melonDS/melonDS.exe
├── mGBA/mGBA.exe
├── Ryujinx/ryujinx.exe
├── rpcs3/rpcs3.exe
├── xemu/xemu.exe
├── xenia/xenia_canary.exe
├── flycast/flycast.exe
├── scummvm/scummvm.exe
├── Vita3K/Vita3K.exe
├── Cemu/Cemu.exe
├── lime3ds/lime3ds.exe
├── azahar/azahar.exe
├── shadps4-qt/shadps4.exe
├── Model2/emulator.exe
├── supermodel/Supermodel.exe
├── bigpemu/BigPEmu.exe
└── esde/ES-DE.exe
```

**Key for cubi-frontend**: When configuring emulator paths, cubi must support:
1. Auto-detection of EmuDeck paths (`%APPDATA%/emudeck/Emulators/`)
2. Custom user-specified paths (for non-EmuDeck setups)
3. RetroArch core paths (inside RetroArch installation)

---

## Game Systems & Emulators

### Complete System Table (from real systems.txt — 130+ systems)
| System | Folder ID | ROM Extensions (real) | Primary Emulator | ROM Format |
|--------|-----------|----------------------|------------------|------------|
| Atari 2600 | atari2600 | .a26, .bin, .zip | RetroArch (stella) | Cartridge/zip |
| Atari 5200 | atari5200 | .a52, .bin, .zip | RetroArch (a5200) | Cartridge/zip |
| Atari 7800 | atari7800 | .a78, .bin, .zip | RetroArch (prosystem) | Cartridge/zip |
| Intellivision | intellivision | .int, .bin, .zip | RetroArch (freeintv) | Cartridge/zip |
| ColecoVision | colecovision | .col, .bin, .zip | RetroArch (bluemsx) | Cartridge/zip |
| SG-1000 | sg1000 | .sg, .zip | RetroArch (genesis_plus_gx) | Cartridge/zip |
| Sega Master System | mastersystem | .sms, .zip | RetroArch (genesis_plus_gx) | Cartridge/zip |
| Sega Game Gear | gamegear | .gg, .zip | RetroArch (genesis_plus_gx) | Cartridge/zip |
| NES / Famicom | nes | .nes, .zip | RetroArch (mesen) | Cartridge/zip |
| Famicom Disk System | fds | .fds, .zip | RetroArch (mesen) | Cartridge/zip |
| SNES / Super Famicom | snes | .sfc, .smc, .zip | RetroArch (snes9x) | Cartridge/zip |
| Satellaview | satellaview | .bs, .sfc, .zip | RetroArch (snes9x) | Cartridge/zip |
| Game Boy | gb | .gb, .zip | RetroArch (gambatte) | Cartridge/zip |
| Game Boy Color | gbc | .gbc, .zip | RetroArch (gambatte) | Cartridge/zip |
| Game Boy Advance | gba | .gba, .zip | mGBA (standalone) | Cartridge/zip |
| Sega Genesis / Mega Drive | megadrive | .gen, .md, .bin, .zip | RetroArch (genesis_plus_gx) | Cartridge/zip |
| PC Engine / TurboGrafx-16 | pcengine | .pce, .zip | RetroArch (mednafen_pce) | Cartridge/zip |
| Nintendo 64 | n64 | .n64, .v64, .z64, .zip | RetroArch (mupen64plus) | Cartridge/zip |
| Neo Geo | neogeo | .zip | RetroArch (fbneo) | ROM set |
| Neo Geo Pocket / Color | ngpc | .ngp, .ngc, .zip | RetroArch (mednafen_ngp) | Cartridge/zip |
| WonderSwan | wswan | .ws, .zip | RetroArch (mednafen_wswan) | Cartridge/zip |
| WonderSwan Color | wswanc | .wsc, .zip | RetroArch (mednafen_wswan) | Cartridge/zip |
| Nintendo DS | nds | .nds, .zip | melonDS (standalone) | Cartridge |
| PlayStation 1 | psx | .pbp, .chd, .bin/.cue | DuckStation (standalone) | Disc |
| Dreamcast | dreamcast | .cdi, .chd, .gdi | Flycast / RetroArch | Disc |
| PlayStation Portable | psp | .cso, .iso, .chd | PPSSPP (standalone) | Disc |
| PlayStation 2 | ps2 | .iso, .chd, .cso | PCSX2 (standalone) | Disc |
| GameCube | gc | .rvz, .iso, .gcz | Dolphin (standalone) | Disc |
| Wii | wii | .rvz, .iso, .wbfs | Dolphin (standalone) | Disc |
| Nintendo 3DS | 3ds | .3ds, .cia, .cxi | Lime3DS / Azahar | Cartridge |
| PlayStation 3 | ps3 | .ps3 directory | RPCS3 (standalone) | Directory |
| Xbox | xbox | .iso, .xiso | xemu (standalone) | Disc |
| Nintendo Switch | switch | .nsp, .xci | Ryujinx (standalone) | Cartridge |
| PS Vita | psvita | .vpk | Vita3K (standalone) | Package |
| Wii U | wiiu | .wux, .wud, .rpx | Cemu (standalone) | Disc |
| Xbox 360 | xbox360 | .iso, .xex | Xenia (standalone) | Disc |
| PS4 | ps4 | .pkg, game folders | ShadPS4 (standalone) | Package |
| MAME | mame | .zip, .7z | RetroArch (mame) | ROM set |
| Final Burn Neo | fbneo | .zip | RetroArch (fbneo) | ROM set |
| ScummVM | scummvm | game dirs | ScummVM (standalone) | Directory |
| Game & Watch | gw | .mgw | RetroArch (gw) | Cartridge |
| Arcade (Model 2) | model2 | .zip | Model 2 Emulator | ROM set |
| Arcade (Supermodel) | supermodel | .zip | Supermodel | ROM set |
| Atari Jaguar | atarijaguar | .j64, .jag | BigPEmu | Cartridge |

### ROM Counts (from real collection — top 30 systems)
```
mame:1932  nes:1249  megadrive:916  snes:886  gba:873
atari2600:649  gbc:552  gb:496  mastersystem:306  pcengine:299
gamegear:268  n64:239  fds:237  neogeo:184  nds:170
intellivision:166  colecovision:162  atari7800:157  fbneo:116  wswan:115
psx:115  wswanc:94  ngpc:87  atari5200:78  psp:75
sg1000:71  dreamcast:67  gw:56  satellaview:56  gc:45
```

### Compressed ROM Formats (confirmed in real collection)
| Format | Extension | Systems Found | Description |
|--------|-----------|--------------|-------------|
| ZIP | .zip | All cartridge systems | Standard archive, most common |
| CHD | .chd | psx, ps2, dreamcast, psp | Compressed Hunks of Data (MAME standard) |
| RVZ | .rvz | gc, wii | Revolution Zip (Dolphin native) |
| CSO | .cso | psp | Compressed ISO |
| PBP | .pbp | psx | PlayStation Store package format |
| CDI | .cdi | dreamcast | DiscJuggler image |
| ISO | .iso | ps2, psp, gc, wii, xbox | Standard disc image |
| NSP/XCI | .nsp, .xci | switch | Nintendo package/cartridge dump |

---

## BIOS Directory Structure (Real)

### Root Level BIOS Files (loose in `bios/`)
Real files found:
```
scph5501.bin          # PSX BIOS (USA) — REQUIRED
scph5500.bin          # PSX BIOS (Japan)
scph5502.bin          # PSX BIOS (Europe)
gba_bios.bin          # GBA BIOS — optional
dc_boot.bin           # Dreamcast boot ROM
dc_flash.bin          # Dreamcast flash ROM
neogeo.zip            # Neo Geo BIOS set
3do_bios.bin          # 3DO BIOS
disksys.rom           # Famicom Disk System BIOS
bios7.bin             # NDS ARM7 BIOS
bios9.bin             # NDS ARM9 BIOS
firmware.bin          # NDS firmware
PSXONPSP660.BIN       # PSX-on-PSP BIOS
```

### Emulator-Specific BIOS Subdirectories
```
bios/
├── citra/            # 3DS system files (aes_keys.txt)
├── dolphin-emu/      # GC/Wii system files
├── pcsx2/            # PS2 BIOS collection
├── ryujinx/          # Switch firmware + keys
│   ├── system/
│   └── keys/         # prod.keys, title.keys
├── yuzu/             # Switch firmware + keys (legacy)
│   └── keys/
├── lime3ds/          # 3DS system (nand/, sdmc/, sysdata/)
├── azahar/           # 3DS system (alternative)
├── system/           # Shared system files
├── firmware/         # Shared firmware files
└── keys/             # Shared encryption keys
```

### BIOS Requirements Table (verified)
| System | BIOS File(s) | Location | Required? |
|--------|-------------|----------|-----------|
| PlayStation 1 | scph5501.bin (USA), scph5500.bin (JP), scph5502.bin (EU) | bios/ (root) | Yes |
| PlayStation 2 | Various SCPH files | bios/pcsx2/ | Yes |
| Dreamcast | dc_boot.bin, dc_flash.bin | bios/ (root) | Yes |
| Neo Geo | neogeo.zip | bios/ (root) | Yes |
| NDS | bios7.bin, bios9.bin, firmware.bin | bios/ (root) | Yes (melonDS) |
| FDS | disksys.rom | bios/ (root) | Yes |
| GBA | gba_bios.bin | bios/ (root) | Optional |
| 3DS | System files | bios/lime3ds/ or bios/azahar/ | Yes |
| Switch | prod.keys, title.keys, firmware | bios/ryujinx/keys/ + system/ | Yes |
| GC/Wii | IPL files | bios/dolphin-emu/ | Optional |

---

## ROM Directory Conventions (Real)

### Folder Structure (ES-DE / EmuDeck standard)
```
roms/
├── systems.txt                 # Folder → display name mapping
├── atari2600/
│   ├── Game (Region).zip
│   ├── gamelist.xml            # ES-DE scraper metadata
│   └── downloaded_images/      # Local scraper images
├── nes/
│   ├── Game (Region).zip
│   ├── # PT-BR #/             # Regional subfolder
│   ├── ## HACKS ##/            # Category subfolder
│   ├── # DYNAVISION #/        # Special collection
│   ├── gamelist.xml
│   └── downloaded_images/
├── psx/
│   ├── Game.pbp
│   └── gamelist.xml
├── gc/
│   ├── Game.rvz
│   └── gamelist.xml
├── switch/
│   ├── Game [titleID].nsp
│   └── SubFolder/
│       └── Game.xci
├── ps3/
│   └── GameFolder.ps3/
│       ├── PS3_GAME/
│       ├── PS3_UPDATE/
│       └── PS3_DISC.SFB
└── ... (170+ system folders)
```

### systems.txt Format (folder → display name mapping)
```
# Format: folder_id: Display Name
3do: 3DO
amiga: Commodore Amiga
atari2600: Atari 2600
atari5200: Atari 5200
atari7800: Atari 7800
colecovision: ColecoVision
dreamcast: Sega Dreamcast
fds: Nintendo Famicom Disk System
gb: Nintendo Game Boy
gba: Nintendo Game Boy Advance
gbc: Nintendo Game Boy Color
gc: Nintendo GameCube
gamegear: Sega Game Gear
genesis: Sega Genesis
intellivision: Mattel Intellivision
mame: MAME
mastersystem: Sega Master System
megadrive: Sega Mega Drive
n64: Nintendo 64
nds: Nintendo DS
neogeo: SNK Neo Geo
nes: Nintendo Entertainment System
ngpc: SNK Neo Geo Pocket Color
pcengine: NEC PC Engine
ps2: Sony PlayStation 2
ps3: Sony PlayStation 3
psp: Sony PlayStation Portable
psx: Sony PlayStation
psvita: Sony PlayStation Vita
satellaview: Nintendo Satellaview
sg1000: Sega SG-1000
snes: Super Nintendo Entertainment System
switch: Nintendo Switch
wii: Nintendo Wii
wiiu: Nintendo Wii U
wswan: Bandai WonderSwan
wswanc: Bandai WonderSwan Color
xbox: Microsoft Xbox
xbox360: Microsoft Xbox 360
ps4: Sony PlayStation 4
# ... 130+ total entries
```

### ROM Naming Conventions (No-Intro standard, confirmed in real data)
```
# Cartridge systems — typically .zip archives
Game Name (Region).zip
Game Name (USA).zip
Game Name (Europe) (En,Fr,De).zip
Game Name (Japan) (Rev 1).zip

# Disc systems — various formats
Game Name (USA).pbp           # PSX
Game Name (Europe).iso        # PS2
Game Name (USA).rvz           # GameCube
Game Name.cdi                 # Dreamcast
Game Name (USA).cso           # PSP

# Switch — with title ID in brackets
Game Name [01001F5010DFA000] [v0].nsp

# PS3 — directory per game
Game Name.ps3/
├── PS3_GAME/
│   └── USRDIR/
├── PS3_UPDATE/
└── PS3_DISC.SFB
```

### ROM Subfolder Patterns (real)
ROMs can be organized in subfolders within system directories:
```
nes/
├── Game1.zip                    # Root-level ROM
├── # PT-BR #/                   # Regional collection (Brazil)
│   └── GameBR.zip
├── ## HACKS ##/                 # ROM hacks collection
│   └── HackGame.zip
├── # DYNAVISION #/              # Special hardware collection
│   └── DynaGame.zip
├── # Japan #/                   # Japanese imports
│   └── JapanGame.zip
├── # GENESIS (JP) #/           # Cross-system collection
│   └── GenesisJP.zip
└── # TAITO #/                   # Publisher collection
    └── TaitoGame.zip
```
**IMPORTANT**: Scanner must recursively scan these subfolders. The `#` prefix/suffix pattern indicates organizational folders, NOT system identifiers.

---

## Gamelist XML Format (ES-DE Standard — Real)

### Complete Field Reference (from real gamelist.xml)
```xml
<?xml version="1.0"?>
<gameList>
  <game>
    <path>./Qb (USA) (Unl).a26</path>
    <name>ZZZ(NOTGAME):##DEMOS##</name>
    <sortname>047 =- ZZZ(NOTGAME):##DEMOS##</sortname>
    <desc>Longer description text...</desc>
    <rating>0</rating>
    <releasedate>20040101T000000</releasedate>
    <developer>AtariAge</developer>
    <publisher>AtariAge</publisher>
    <genre>Action</genre>
    <genreid>1</genreid>
    <players>2</players>
    <image>./downloaded_images/Qb (USA) (Unl).png</image>
    <playcount>0</playcount>
    <lastplayed></lastplayed>
    <md5>3025bdc30b5aec9fb40668787f67d24c</md5>
    <hash>14E56D88</hash>
  </game>
</gameList>
```

### Gamelist Fields
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| path | string | Relative path to ROM (./filename.ext) | Yes |
| name | string | Display name | Yes |
| sortname | string | Sort key (for custom ordering) | No |
| desc | string | Game description | No |
| rating | float | Rating 0.0-1.0 | No |
| releasedate | string | Format: YYYYMMDDTHHMMSS | No |
| developer | string | Developer name | No |
| publisher | string | Publisher name | No |
| genre | string | Genre text | No |
| genreid | int | Genre numeric ID | No |
| players | string | Number of players | No |
| image | string | Relative path to cover image | No |
| playcount | int | Times played | No |
| lastplayed | string | Last play timestamp | No |
| md5 | string | MD5 hash of ROM | No |
| hash | string | CRC32 hash (uppercase hex) | No |

### Image Path Formats in gamelist.xml
Two patterns exist:
```xml
<!-- Pattern 1: downloaded_images in ROM directory -->
<image>./downloaded_images/Game Name.png</image>

<!-- Pattern 2: Pegasus-style media subdirectory -->
<image>media/images/subfolder/Game Name.png</image>
```

---

## saves/ Directory Structure (Real)

### Per-Emulator Organization
```
saves/
├── retroarch/
│   ├── saves/          # .srm battery saves
│   └── states/         # .state save states
├── duckstation/        # PSX saves
├── dolphin/            # GC/Wii saves
├── pcsx2/              # PS2 memory cards
├── ppsspp/             # PSP saves
├── melonds/            # NDS saves
├── mgba/               # GBA saves
├── ryujinx/            # Switch saves
├── rpcs3/              # PS3 saves
├── xemu/               # Xbox saves
├── xenia/              # Xbox 360 saves
├── flycast/            # Dreamcast VMU saves
├── scummvm/            # ScummVM saves
├── Vita3K/             # PS Vita saves
├── Cemu/               # Wii U saves
├── lime3ds/            # 3DS saves
├── azahar/             # 3DS saves (alt)
├── shadps4/            # PS4 saves
└── (per-system legacy dirs)
    ├── psp/, ps2/, xbox/, nes/, fds/, states/
    ├── fbneo/, mame/, supermodel/
```

### Save File Formats
| Format | Extension | Emulator |
|--------|-----------|----------|
| SRAM | .srm | RetroArch |
| Battery RAM | .brm | RetroArch (Sega CD) |
| NVRAM | .nvr | RetroArch (arcade) |
| Save state | .state, .state1-9 | RetroArch |
| Memory card | .mcd, .ps2 | PCSX2 |
| Generic save | .sav | Various standalone |

---

## Media Asset Conventions (Real — from storage/downloaded_media/)

### Structure
```
storage/downloaded_media/
├── {system_id}/                # One folder per system
│   ├── box2dfront/            # Front box art (primary cover)
│   ├── wheel/                 # Logo/wheel art (transparent)
│   ├── screenshots/           # In-game screenshots
│   ├── titlescreens/          # Title screen captures
│   ├── videos/                # Video snaps (30-60 sec)
│   ├── miximages/             # Composite image (cover+screen+logo)
│   ├── 3dboxes/               # 3D rendered box art
│   ├── backcovers/            # Back of box art
│   ├── fanart/                # Fan artwork / backgrounds
│   ├── manuals/               # Game manual PDFs
│   ├── physicalmedia/         # Cartridge/disc art
│   ├── covers_bak/            # Backup covers (legacy)
│   └── marquees_bak/          # Backup marquees (legacy)
```

### Media Statistics (Real — 58,146 total files)
| File Type | Count | Percentage |
|-----------|-------|------------|
| PNG | 36,638 | 63% |
| JPG | 12,448 | 21.4% |
| MP4 | 5,835 | 10% |
| PDF | 3,225 | 5.5% |

### Media Type Details (Real sizes from production data)
| Type | Folder | Format | Typical Size | Use In UI |
|------|--------|--------|-------------|-----------|
| Box Art (2D Front) | box2dfront/ | PNG | 180KB — 1.4MB | Grid view, detail panel |
| Wheel/Logo | wheel/ | PNG (transparent) | 15 — 50KB | Overlay on backgrounds |
| Screenshots | screenshots/ | PNG | varies | Detail panel, gallery |
| Title Screens | titlescreens/ | PNG | varies | Alternative screenshot |
| Videos | videos/ | MP4 | 1.2 — 4.4MB | Preview on hover/select |
| Mix Images | miximages/ | PNG | 590KB — 850KB | Combined view (ES-DE style) |
| 3D Boxes | 3dboxes/ | PNG | 300 — 400KB | Fancy grid view |
| Back Covers | backcovers/ | PNG | 1.3 — 1.7MB | Detail panel flip |
| Fan Art | fanart/ | JPG | 80 — 240KB | Background/wallpaper |
| Manuals | manuals/ | PDF | 2 — 14MB | Manual viewer |
| Physical Media | physicalmedia/ | PNG | 260 — 480KB | Collection view |

### Media Naming Convention
**File names match ROM names exactly (minus ROM extension) + media extension:**
```
ROM:   Akira (Europe).zip
Media: Akira (Europe).png   (in box2dfront/)
       Akira (Europe).png   (in wheel/)
       Akira (Europe).mp4   (in videos/)
       Akira (Europe).pdf   (in manuals/)
```

### Local Downloaded Images
Some ROM directories also contain a `downloaded_images/` folder with images:
```
roms/nes/downloaded_images/
├── 10-Yard Fight (USA, Europe).png     [52KB]
├── 1942 (Japan, USA).png               [41KB]
└── ...
```
These are referenced from `gamelist.xml` via `<image>./downloaded_images/filename.png</image>`.

---

## Metadata Scraping APIs

### ScreenScraper.fr (primary — used by ES-DE for real data)
- **URL**: `https://api.screenscraper.fr/api2/`
- **Auth**: devid + devpassword + softname
- **Rate limit**: 1 req/sec (free), higher with paid
- **Key endpoint**: `jeuInfos.php?systemeid={id}&romnom={filename}&crc={crc}`
- **Returns**: Names, descriptions, media URLs (all 13 types), genres, dates, players
- **System IDs**: Need mapping from our folder IDs to ScreenScraper IDs

### IGDB (via Twitch API)
- **URL**: `https://api.igdb.com/v4/games`
- **Auth**: OAuth2 client credentials (Twitch)
- **Rate limit**: 4 req/sec
- **Query**: Apicalypse syntax `fields *; search "game name"; where platforms = (id);`

### TheGamesDB
- **URL**: `https://api.thegamesdb.net/v1/`
- **Auth**: API key (free)
- **Key endpoint**: `Games/ByGameName?name={name}&platform_id={id}`

### OpenVGDB (SQLite — offline)
- **Source**: https://github.com/OpenVGDB/OpenVGDB
- **Format**: SQLite database, downloadable
- **Use**: Offline hash-based ROM identification

---

## Emulator Launch Patterns (Real — from EmuDeck PowerShell Launchers)

### Universal EmuDeck Launcher Pattern
All 23 EmuDeck launchers follow this exact pattern:
```powershell
$emulatorFile = "$env:APPDATA/emudeck/Emulators/{EmulatorDir}/{executable}"
$scriptFileName = [System.IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Name)
. "$env:USERPROFILE/AppData/Roaming/EmuDeck/backend/functions/allCloud.ps1"

# Format arguments
$formattedArgs = @()
foreach ($arg in $rawArgs) {
    $formattedArgs += "`"$arg`""
}
emulatorInit $scriptFileName $emulatorFile ($formattedArgs -join ' ')
```

### Emulator Executable Paths (Real — confirmed)
| Emulator | Dir/Exe | Systems |
|----------|---------|---------|
| RetroArch | RetroArch/retroarch.exe | All RetroArch systems |
| DuckStation | duckstation/duckstation-qt-x64-ReleaseLTCG.exe | PSX |
| Dolphin | Dolphin-x64/Dolphin.exe | GC, Wii |
| PCSX2 | PCSX2-Qt/pcsx2-qtx64.exe | PS2 |
| PPSSPP | PPSSPP/PPSSPPWindows64.exe | PSP |
| melonDS | melonDS/melonDS.exe | NDS |
| mGBA | mGBA/mGBA.exe | GBA |
| Ryujinx | Ryujinx/ryujinx.exe | Switch |
| RPCS3 | rpcs3/rpcs3.exe | PS3 |
| xemu | xemu/xemu.exe | Xbox |
| Xenia | xenia/xenia_canary.exe | Xbox 360 |
| Flycast | flycast/flycast.exe | Dreamcast |
| ScummVM | scummvm/scummvm.exe | ScummVM |
| Vita3K | Vita3K/Vita3K.exe | PS Vita |
| Cemu | Cemu/Cemu.exe | Wii U |
| Lime3DS | lime3ds/lime3ds.exe | 3DS |
| Azahar | azahar/azahar.exe | 3DS |
| ShadPS4 | shadps4-qt/shadps4.exe | PS4 |
| BigPEmu | bigpemu/BigPEmu.exe | Atari Jaguar |
| Model 2 | Model2/emulator.exe | Model 2 Arcade |
| Supermodel | supermodel/Supermodel.exe | Model 3 Arcade |

### Special Launch Cases
```powershell
# Xenia — adds fullscreen flag
emulatorInit ... --fullscreen=true

# ShadPS4 — requires cd to emulator dir first, handles .lnk files
Set-Location "$env:APPDATA/emudeck/Emulators/shadps4-qt"
# Also resolves .lnk shortcuts to their targets
```

### RetroArch Core Launch (for cartridge systems via RetroArch)
```
retroarch.exe -L "cores/{core_name}_libretro.dll" "{rom_path}"
```

---

## No-Intro & Redump DAT Verification
- **No-Intro**: Cartridge-based systems (NES, SNES, N64, GB, GBA, DS)
- **Redump**: Disc-based systems (PSX, PS2, Saturn, Dreamcast, GameCube)
- **DAT format**: XML/CLR-MAME-Pro with CRC32, MD5, SHA-1 per ROM
- **Verification**: Hash ROM file → compare against DAT → report match/mismatch
- **Real gamelist.xml** includes both `<md5>` and `<hash>` (CRC32) fields already computed by ES-DE scraper

---

## Pegasus Metadata Format (alternative, found in tools/pegasus/)
```
collection: Super Nintendo
shortname: snes
launch: retroarch -L snes9x_libretro.dll "{file.path}"

game: Super Mario World
file: Super Mario World (USA).sfc
developer: Nintendo
genre: Platform
players: 2
rating: 95%
description: Mario and Luigi travel to Dinosaur Land...
```

---

## DLC Structure (Real)
```
dlc/
└── switch/
    └── (DLC .nsp files organized by game)
```

---

## Key Design Rules for cubi-frontend

1. **NEVER embed emulator paths in the data folder** — emulators are external
2. **Support multiple data folder locations** — user configurable root path
3. **Parse systems.txt for system discovery** — don't hardcode system list
4. **Import from gamelist.xml** — this is existing scraped data, don't re-scrape
5. **Support both media locations** — `storage/downloaded_media/` AND `roms/{system}/downloaded_images/`
6. **Recursive ROM scanning** — sub-folders with `#` patterns are valid
7. **Handle 170+ systems** — don't assume a small fixed set
8. **Save data per-emulator** — not per-system (matches real structure)
9. **Support directory-based "ROMs"** — PS3 (.ps3 dirs), ScummVM (game dirs)
10. **CHD conversion tool available** — `tools/chdconv/` for disc format conversion
````
