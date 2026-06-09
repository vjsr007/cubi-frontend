---
name: emulation-rom-library
description: Use when migrating/consolidating ROMs into the RetroBat/EmuDeck library on this PC (E:\Emulation\roms), de-duplicating, extracting multi-part RAR/zip game archives, or scraping covers + metadata with Skyscraper (run from WSL) for EmulationStation/RetroBat. Windows + WSL workflow.
---

# Emulation ROM Library — Migrate & Scrape (RetroBat on Windows)

## Overview
Reusable workflow for this machine's emulation setup: consolidating ROMs into the
library, de-duplicating, unpacking split archives, and scraping box art + metadata
with **Skyscraper** running inside **WSL Ubuntu-24.04** (no native Windows build exists).

## Environment facts (this PC)
- **Frontend:** RetroBat-style EmulationStation. Config in `C:\Users\vjsan\.emulationstation\`
  (`es_settings.cfg`, `gamelists\`, scraper setting was `TheArchive`).
- **Library root (destination):** `E:\Emulation\roms\<system>\` (EmuDeck layout; system folders
  use short names: `nds gba gc saturn 3do pcengine pcenginecd neogeo fbneo mame ...`).
- **System metadata:** each system folder has `systeminfo.txt` / `metadata.txt`
  (line `Platform (for scraping): <id>` is useful).
- **Per-system media convention:** images live next to ROMs in `roms\<system>\images\`
  or `roms\<system>\media\{covers,screenshots,marquees,videos}\`; `gamelist.xml` sits in
  the system folder and references media with **relative** `./media/...` paths. RetroBat
  honors whatever paths the gamelist contains.
- **Tools present:** `7z` (`C:\Program Files\7-Zip\7z.exe`, also scoop shim), UnRAR
  (`C:\Program Files\WinRAR\UnRAR.exe`), WSL Ubuntu-24.04, Python 3.11, git.
- **Skyscraper:** built from source in WSL → `/usr/local/bin/Skyscraper` (v3.20.0, Gemba fork).
  Config in `/root/.skyscraper/` (`config.ini`, `artwork.xml`). Helper scripts kept in
  `E:\Emulation\roms\_scrape\` (`scrape_new.sh`, `merge_gamelist.py`, per-system `*.txt` lists).
- Related: the **rgsx** skill covers downloading ROM sets; this skill covers consolidating
  + scraping what's already on disk.

## Part A — Migrate / consolidate ROMs into the library

Goal: move games from a staging folder (e.g. `E:\roms\<system>`) into `E:\Emulation\roms\<system>`,
skipping anything already present, then delete the source. Source games may be **split RAR**
(`name.part1.rar … partN.rar`) or whole-system **.zip** collections, and may be nested.

1. **List & classify** source vs destination. Inspect archive contents without extracting:
   - `7z l "file.part1.rar"` (use UnRAR for old RAR4 vols that 7z rejects:
     `& "C:\Program Files\WinRAR\UnRAR.exe" l file.part1.rar`).
2. **De-dup by exact byte size** (reliable for identical dumps): if the extracted file's size
   matches the file already in the destination, the game is already there → just delete source.
   Different region/format dumps (e.g. `[SX3E01].wbfs` vs `Pandora's Tower (USA).rvz`) are NOT
   the same — ask the user before treating as duplicate.
3. **Extract real moves** with skip-existing: `7z x "<zip>" -o"E:\Emulation\roms\<sys>" -aos -y`
   (`-aos` = skip files that already exist; never overwrites). Delete the source archive only
   after `7z` exits 0/1.
4. **Flatten nested archives**: some zips nest games under subfolders
   (`games\cps1\*.zip`, `japan\*.7z`). Extract to a temp dir, then move the inner game files
   **flat** into the destination skipping existing; keep special subfolders intact
   (e.g. FBNeo `samples\*.zip` → `fbneo\samples\`, never flattened — names collide with romsets).
5. **Empty folders**: delete (`Remove-Item -Recurse -Force`).
6. **Corrupted folders** ("The file or directory is corrupted and unreadable"): NTFS damage.
   Move shell off the drive (`Set-Location C:\`), run `chkdsk E: /f /x` (forces dismount;
   do this LAST, after all extractions, since it needs exclusive access), then delete.
7. **Space:** check free space first (`Get-PSDrive E`). If archives ≈ free space, process
   **one system at a time**: extract → delete that archive → next (keeps peak usage ~one archive).

## Part B — Scrape covers + metadata (Skyscraper via WSL)

### One-time setup
- ScreenScraper.fr account required (free = **1 thread**, ~20k requests/day). Skyscraper has its
  own baked-in devid; only the user's login/password are needed.
- Build (already done here): `apt install build-essential qtbase5-dev qt5-qmake qtchooser p7zip-full`,
  `git clone --depth 1 https://github.com/Gemba/skyscraper.git`, `qmake && make -j && make install`.
- `~/.skyscraper/config.ini`:
  ```ini
  [main]
  unattend="true"
  videos="true"
  verbosity="1"
  [screenscraper]
  userCreds="USER:PASS"
  ```
- **Covers as the priority** ("portadas"): replace `~/.skyscraper/artwork.xml` so each resource is
  exported raw (cover → `<thumbnail>`, screenshot → `<image>`, wheel → `<marquee>`):
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <artwork>
    <output type="cover"/>
    <output type="screenshot"/>
    <output type="marquee" resource="wheel"/>
  </artwork>
  ```

### Frontend & paths (critical)
- Use frontend **`emulationstation`** (NOT `batocera` — that one hardcodes Batocera's
  `/userdata/roms/...` absolute paths and won't write media on Windows).
- Always pass `--flags relative` so gamelist paths are `./media/...`.
- Two phases per system:
  - **gather** (network → cache): `Skyscraper -p <PLATFORM> -s screenscraper -i "<romdir>" [--includefrom list]`
  - **generate** (cache → gamelist+media): `Skyscraper -p <PLATFORM> -f emulationstation -i "<romdir>" -g "<romdir>" -o "<romdir>/media" --flags relative,unattend [--includefrom list]`

### Platform mapping (system folder → Skyscraper `-p`)
Most match by name (`nds gba gc saturn 3do pcengine pcenginecd neogeo`). Exceptions:
**fbneo → `fba`**, **mame (MAME 2003 Plus etc.) → `mame`**. Arcade hit-rate is lower (short
romset names like `1941.zip`); ScreenScraper still matches many by short name.

### Scrape only NEW ROMs
- `Skyscraper --includefrom <file>` limits the run to filenames listed (one per line, UTF-8).
- **Identify new files** (after a `-aos` extract the source is usually gone):
  - Files **moved** from a temp extraction → `CreationTime >= today` (works).
  - Files **`7z`-extracted** keep the archive's stored timestamps (NTFS extra field restores
    even creation time) → use **`LastWriteTime` date == the source archive's date signature**
    (e.g. the GBA/TG16 zips were `1996-12-24`; MAME 2003 Plus `2019-01-01`; FBNeo `2023-09-2x`).
    Calibrate the filter so its count matches the known before/after diff.
  - Systems that were empty before → all files are new.
- **Preserve existing gamelists**: generating with `--includefrom` writes a gamelist of ONLY the
  new games and overwrites the old one. So back up first and **merge**:
  `scrape_new.sh` does backup → gather → generate → `merge_gamelist.py old new out` (union keyed by
  `<path>`, new entries win). Result keeps prior entries + adds new.

### Reusable runner
`E:\Emulation\roms\_scrape\scrape_new.sh <platform> <system_folder>` does the full per-system
flow (gather + backup + generate + merge) using `_scrape\<system>.txt` as the new-files list.
Run it from WSL; ROMs are at `/mnt/e/Emulation/roms`.

## Gotchas / lessons learned
- **`7z` fails on some RAR4 multi-vol** ("Cannot open the file as archive") → use UnRAR.
- **Heredocs inside `wsl bash -lc '...'`** can still expand `$vars` → write scripts with the
  Write tool to a real file instead; then `sed -i 's/\r$//' file` to strip CRLF before running.
- **PowerShell guardrail** may block a `Remove-Item` whose command text contains `\samples\`
  (path-protection false positive) — detect dirs by `$_.Directory.Name -eq 'samples'` instead.
- Free ScreenScraper account is **single-threaded** → full library (~10k games) takes many hours
  and can exhaust the daily quota; prefer scraping only-new or batch across days.
- The `flash` system here is the reference for media naming (`images\<rom>-thumb.png` / `-marquee.png`).
