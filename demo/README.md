# Cubi Frontend Demo Video Pipeline

## Quick Start

```powershell
cd demo
.\make-demo.ps1
```

This will:
1. Check/install prerequisites (Python, edge-tts, ffmpeg)
2. Generate AI voiceover narration (15 scenes, ~5 min)
3. Guide you through screen recording (scene by scene)
4. Assemble the final video with titles and optimized exports

## Prerequisites (All Free)

| Tool | Purpose | Install |
|------|---------|---------|
| **Python 3.8+** | Required by edge-tts | `winget install Python.Python.3.12` |
| **edge-tts** | Microsoft Neural TTS (free, no API key) | `pip install edge-tts` |
| **ffmpeg** | Screen recording + video assembly | `winget install Gyan.FFmpeg` |

## Scripts

| Script | Purpose |
|--------|---------|
| `make-demo.ps1` | Master orchestrator (run this) |
| `01-generate-voiceover.ps1` | Generates 15 narration clips with AI voice |
| `02-record-screen.ps1` | Guided screen recording (scene by scene or full) |
| `03-assemble-video.ps1` | Combines video + audio, adds titles, exports |

## Usage Options

```powershell
# Full pipeline (interactive)
.\make-demo.ps1

# Install tools only
.\make-demo.ps1 -InstallOnly

# Generate voiceover only
.\make-demo.ps1 -VoiceOnly

# Spanish voiceover
.\make-demo.ps1 -Spanish

# Custom voice (see: edge-tts --list-voices)
.\make-demo.ps1 -Voice "en-GB-RyanNeural"

# Assemble only (after recording)
.\make-demo.ps1 -AssembleOnly

# With background music
.\make-demo.ps1 -BGM "C:\path\to\music.mp3"
```

## Output Files

| File | Size | Use |
|------|------|-----|
| `cubi-frontend-v0.7.0-demo.mp4` | ~50-100 MB | Full quality, YouTube upload |
| `cubi-frontend-demo-github.mp4` | < 25 MB | GitHub Release attachment |
| `cubi-frontend-preview.gif` | < 10 MB | README.md inline preview |

## Demo Scene Guide (~5 minutes)

| # | Scene | Duration | Key Action |
|---|-------|----------|------------|
| 1 | Intro | 15s | App launch, library loaded |
| 2 | Library | 25s | Browse systems, search, filter |
| 3 | Grid/List | 15s | View modes, zoom slider |
| 4 | Game Detail | 25s | 3D box flip, metadata, media |
| 5a | Default Theme | 10s | Dark modern layout |
| 5b | HyperSpin | 20s | Spinning wheel, CRT frame |
| 5c | Aurora | 15s | Xbox 360 tiles, bokeh |
| 6 | Gamepad | 25s | D-pad nav, haptics, focus ring |
| 7 | Scraper | 30s | Multi-source scrape job |
| 8 | PC Games | 20s | Steam/Epic import, metadata |
| 9 | Metadata Editor | 20s | Edit fields, YouTube search |
| 10 | Emulator Settings | 20s | Config, cores, paths |
| 11 | Localization | 15s | Switch 6 languages live |
| 12 | Performance | 15s | Fast scan, low memory |
| 13 | Outro | 15s | Final showcase |

## Customizing the Voiceover

Edit `01-generate-voiceover.ps1` — the `$segments` hashtable contains all narration text. Change any text and re-run.

### Available Voices (Popular)

```
en-US-GuyNeural        # Male, American (default)
en-US-JennyNeural      # Female, American
en-GB-RyanNeural       # Male, British
es-MX-DaliaNeural      # Female, Mexican Spanish
es-ES-AlvaroNeural     # Male, Spain Spanish
ja-JP-KeitaNeural      # Male, Japanese
fr-FR-HenriNeural      # Male, French
```

List all voices: `edge-tts --list-voices`

## Tips for Best Results

1. **Resolution**: Set display to 1920x1080 before recording
2. **Clean desktop**: Hide taskbar, close other apps
3. **Populated library**: Have 50+ games with metadata/art for impressive visuals
4. **Gamepad**: Connect an Xbox controller for Scene 8
5. **Dark room**: Reduces screen reflections in recordings
6. **Scene-by-scene**: Easier to re-record individual mistakes
