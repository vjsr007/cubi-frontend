---
name: rgsx
description: Use when installing, configuring, using or troubleshooting RGSX (Retro Game Sets Xtra), the ROM/game downloader for Batocera, Knulli and RetroBat. Covers install commands, the web interface on port 5000, folder paths, gamelist refresh, controller mapping, supported systems via es_systems.cfg, API keys for premium sources, and syncing downloaded ROMs with the local E:\roms library on Windows.
---

# RGSX — Retro Game Sets Xtra

RGSX is a free, controller-first **ROM/game downloader** that runs *inside* a retro-gaming
distro (Batocera, Knulli, RetroBat), not on the Windows PC. It auto-discovers which systems
your device supports, downloads games from multiple sources, and drops them into the right
`/roms/<system>/` folders so EmulationStation picks them up.

Official repo: https://github.com/RetroGameSets/RGSX (not affiliated with Batocera/RetroBat).

---

## This workspace

- Local ROM library lives at `E:\roms` (Windows). This is where you organize/keep ROMs
  pulled off the device, or stage ROMs to copy onto the device's SD card.
- RGSX itself runs on the **device** (handheld/mini-PC). You interact with it either on the
  device UI or — more useful from this PC — via its **web interface on port 5000**.
- When the device's SD card is mounted on this PC (a drive letter), its `/roms` maps to
  `<DRIVE>:\roms` and `/saves` to `<DRIVE>:\saves`. That lets you do manual install / config
  edits / ROM copying from here with normal file tools.

---

## Install

### Batocera / Knulli — one-liner (over SSH/terminal on the device)
```bash
curl -L bit.ly/rgsx-install | sh
```
Then on the device: `Menu > Game Settings > Update game list`.

### Manual install (any system, works from Windows with the SD card mounted)
1. Download: https://github.com/RetroGameSets/RGSX/releases/latest/download/RGSX_full_latest.zip
2. Extract:
   - **Batocera / Knulli:** copy the `ports` folder into the card's `/roms/` (→ `/roms/ports/RGSX/`)
   - **RetroBat:** copy **both** `ports` and `windows` folders into `/roms/`
3. On the device: `Menu > Game Settings > Update game list`.

Updates: same flow with `RGSX_update_latest.zip` from the latest release.

### Launch
Find **RGSX** under **PORTS** (Batocera/Knulli: "Homebrew and ports") or the **WINDOWS** system
(RetroBat). First launch auto-downloads system images + game lists and auto-maps a recognized
controller.

---

## Web interface (Batocera / Knulli only) — best path from this PC
- URL: `http://<DEVICE_IP>:5000` (or `http://BATOCERA:5000`).
- Mobile-responsive; same game sources as the on-device app; real-time download status.
- Enable at boot: `Pause Menu > Settings > Web Service > Toggle Enable at Boot`.
- Port `5000` — check device firewall if unreachable. Confirm the PC and device are on the
  same LAN; test with `Test-NetConnection <DEVICE_IP> -Port 5000` in PowerShell.

---

## Using it
- Open RGSX → pick a system → pick a game → download. It lands in the matching `/roms/<system>/`.
- After downloads: `Menu > Game Settings > Update game list` (or restart EmulationStation) so
  games appear.
- Scan ROMs you added yourself: `Pause Menu > Games > Scan Owned ROMs`.
- See platforms RGSX hides because the device lacks them: `Pause Menu > Games > Show Unsupported Platforms`.

## Supported systems
RGSX auto-discovers supported systems by reading the device's **`es_systems.cfg`** and the
allowed file extensions defined there. If a system is missing in RGSX, it's almost always
because that system isn't defined/enabled in `es_systems.cfg` on the device.

## Controller mapping
- Auto-maps on first launch for recognized pads.
- Fix broken controls: delete `/saves/ports/rgsx/controls.json` and relaunch.
- Manual: `Pause Menu > Controls > Remap Controls`.

## API keys (premium download sources)
Place plaintext key files in `/saves/ports/rgsx/`, e.g. `1FichierAPI.txt`, `AllDebridAPI.txt`.

---

## Folder / path map (on the device, or `<DRIVE>:\…` when card is mounted on Windows)
```
/roms/ports/RGSX/              # main app (all systems)
/roms/windows/RGSX/            # RetroBat-only files
/roms/ports/RGSX/logs/RGSX.log # debug log — read this first when something fails
/saves/ports/rgsx/             # user data & config
  ├── rgsx_settings.json       # layout (3x3..4x4), language (EN/FR/DE/ES/IT/PT), font size
  ├── controls.json            # controller mapping (delete to reset)
  ├── history.json             # download history
  ├── systems_list.json        # discovered systems
  ├── games/                   # platform game databases
  ├── images/                  # platform artwork
  └── *API.txt                 # premium API keys
```

---

## Troubleshooting checklist
1. **Downloaded game doesn't show** → `Update game list` / restart ES; confirm it landed in the
   right `/roms/<system>/` and the extension is allowed in `es_systems.cfg`.
2. **System missing in RGSX** → it's not in `es_systems.cfg`; enable that core/system on the device.
3. **Controls dead/wrong** → delete `/saves/ports/rgsx/controls.json`, relaunch.
4. **Web UI unreachable** → enable Web Service at boot; same LAN; `Test-NetConnection <ip> -Port 5000`.
5. **Anything else** → read `/roms/ports/RGSX/logs/RGSX.log`.

## Syncing with this PC's `E:\roms`
- To stage ROMs for the device: organize them under `E:\roms\<system>\` mirroring the device's
  system folder names (e.g. `snes`, `nes`, `megadrive`, `psx`), then copy to the card's `/roms/`.
- To back up what RGSX downloaded: copy `<CARD>:\roms\<system>\` back into `E:\roms\<system>\`.
- Reuse the movie-library workflow style: scan, dedupe, then homologate folder/system names.
