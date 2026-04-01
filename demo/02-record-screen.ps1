#!/usr/bin/env pwsh
# ============================================================================
# CUBI FRONTEND v0.7.0 — Screen Recording Guide & Helper
# Uses ffmpeg (gdigrab) for screen capture on Windows
# ============================================================================
# PREREQUISITES:
#   choco install ffmpeg     OR    winget install ffmpeg
#   (ffmpeg must be in PATH)
# ============================================================================

param(
    [string]$OutputDir = "$PSScriptRoot\recordings",
    [int]$FPS = 30,
    [string]$Resolution = "1920x1080"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# ============================================================================
# RECORDING SCENES — Follow this guide while recording
# ============================================================================
$scenes = @(
    @{
        Name  = "01-intro"
        Duration = "15s"
        Instructions = @"
SCENE 1: INTRO (0:00 - 0:15)
=============================
ACTION: App launches, show the main library view loading
- Start with the app closed
- Launch Cubi Frontend (npx tauri dev or the .exe)
- Let the splash/loading complete
- Show the full library grid populated with games
- Slowly move mouse over a few game cards (hover effects)
"@
    },
    @{
        Name  = "02-library"
        Duration = "25s"
        Instructions = @"
SCENE 2: LIBRARY OVERVIEW (0:15 - 0:40)
========================================
ACTION: Browse through systems, search, filter
- Click different systems in the sidebar (NES, SNES, PS2, Switch...)
- Show the game count badges updating
- Type in the search bar to filter games in real-time
- Click a genre filter
- Toggle favorites filter
- Change sort order (by rating, by last played)
"@
    },
    @{
        Name  = "03-grid-list"
        Duration = "15s"
        Instructions = @"
SCENE 3: GRID & LIST VIEWS (0:40 - 0:55)
=========================================
ACTION: Switch between grid and list views
- Show grid view with large thumbnails
- Use zoom slider to change columns (5→3→1 column)
- Switch to list view (table mode)
- Scroll through the list showing columns
- Switch back to grid
"@
    },
    @{
        Name  = "04-game-detail"
        Duration = "25s"
        Instructions = @"
SCENE 4: GAME DETAIL VIEW (0:55 - 1:20)
========================================
ACTION: Open a game with good metadata/art
- Click a popular game (e.g., Super Mario, Zelda, or a PC game with Steam data)
- Show the metadata panel (description, developer, year, genre)
- Click the 3D box art to FLIP it (front → back → front)
- Scroll down to media gallery (screenshots, fan art)
- Hover over the Launch button
- Show play stats if available
"@
    },
    @{
        Name  = "05-themes-default"
        Duration = "10s"
        Instructions = @"
SCENE 5A: DEFAULT THEME (1:20 - 1:30)
======================================
ACTION: Show the default theme briefly
- Navigate to Settings → Theme
- Ensure "Default" is selected
- Go back to Library to show the dark theme layout
"@
    },
    @{
        Name  = "06-themes-hyperspin"
        Duration = "20s"
        Instructions = @"
SCENE 5B: HYPERSPIN THEME (1:30 - 1:50)
========================================
ACTION: Switch to HyperSpin and navigate
- In Settings → Theme, select "HyperSpin"
- Go to Library — show the spinning wheel carousel
- Navigate up/down to spin through games
- Show the CRT TV preview panel on the right
- Let the wheel animation play on 3-4 games
"@
    },
    @{
        Name  = "07-themes-aurora"
        Duration = "15s"
        Instructions = @"
SCENE 5C: AURORA THEME (1:50 - 2:05)
=====================================
ACTION: Switch to Aurora and navigate
- In Settings → Theme, select "Aurora"
- Go to Library — show the tile carousel
- Scroll horizontally through tiles
- Point out the bokeh particle animation in background
- Show the system boxes at the bottom
"@
    },
    @{
        Name  = "08-gamepad"
        Duration = "25s"
        Instructions = @"
SCENE 6: GAMEPAD NAVIGATION (2:05 - 2:30)
==========================================
ACTION: Put down mouse, use gamepad only
*** CONNECT A CONTROLLER BEFORE THIS SCENE ***
- Navigate the library with D-pad (up/down/left/right)
- Show the focus ring moving between game cards
- Press A to select a game (open detail)
- Press B to go back
- Press LB/RB to switch systems
- Press Start for settings
- Show visual feedback (focus ring, haptic rumble if captured)
TIP: Use OBS with gamepad overlay if possible
"@
    },
    @{
        Name  = "09-scraper"
        Duration = "30s"
        Instructions = @"
SCENE 7: SCRAPER SYSTEM (2:30 - 3:00)
======================================
ACTION: Show scraper configuration and run a job
- Go to Scraper Configuration page
- Show the list of configured scrapers (ScreenScraper, Steam, IGDB...)
- Show credential fields (blur sensitive data!)
- Start a scrape job for one system
- Show progress: metadata downloading, images appearing
- Show a game before/after scraping (empty → full metadata + art)
"@
    },
    @{
        Name  = "10-pc-games"
        Duration = "20s"
        Instructions = @"
SCENE 8: PC GAME INTEGRATION (3:00 - 3:20)
===========================================
ACTION: Show PC game features
- Switch to PC system in sidebar
- Show imported Steam/Epic/GOG games
- Open a PC game detail view
- Show Steam-specific data: reviews, categories, DLC count
- Show SteamGridDB custom artwork
- Show the launch button (Steam protocol)
"@
    },
    @{
        Name  = "11-metadata-editor"
        Duration = "20s"
        Instructions = @"
SCENE 9: METADATA EDITOR (3:20 - 3:40)
=======================================
ACTION: Edit a game's metadata live
- Open a game detail → click Edit
- Change the title or description
- Edit genre/tags
- Upload custom box art (paste a URL)
- Search YouTube for a trailer
- Show changes saving in real-time
"@
    },
    @{
        Name  = "12-emulator-settings"
        Duration = "20s"
        Instructions = @"
SCENE 10: EMULATOR SETTINGS (3:40 - 4:00)
==========================================
ACTION: Show emulator configuration
- Go to Emulator Configuration page
- Show per-system emulator selection dropdown
- For a RetroArch system, show core selection
- Go to Emulator Settings → change resolution or FPS
- Show ROM Path Overrides page
- Show EmuDeck auto-detected paths
"@
    },
    @{
        Name  = "13-localization"
        Duration = "15s"
        Instructions = @"
SCENE 11: LOCALIZATION (4:00 - 4:15)
=====================================
ACTION: Switch languages live
- Go to Settings → Language
- Switch from English → Español (show UI text change)
- Switch to 日本語 (Japanese)
- Switch to Français (French)
- Switch back to English
- All text updates instantly without reload
"@
    },
    @{
        Name  = "14-performance"
        Duration = "15s"
        Instructions = @"
SCENE 12: PERFORMANCE (4:15 - 4:30)
====================================
ACTION: Show speed and efficiency
- Trigger a ROM scan (Settings or scan button)
- Show the scan progress bar moving fast
- Show Task Manager briefly (low memory ~100-150MB)
- Show app window responding instantly to clicks
"@
    },
    @{
        Name  = "15-outro"
        Duration = "15s"
        Instructions = @"
SCENE 13: OUTRO (4:30 - 4:50)
==============================
ACTION: Final showcase
- Show the library one last time with a beautiful theme
- Slowly scroll through games
- End on a wide shot of the full app
- (Optionally show the GitHub releases page in browser)
"@
    }
)

# ============================================================================
# INTERACTIVE RECORDING MODE
# ============================================================================
function Show-RecordingGuide {
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  CUBI FRONTEND v0.7.0 — RECORDING GUIDE" -ForegroundColor Cyan
    Write-Host "  Total scenes: $($scenes.Count) | Target: ~5 min" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan

    Write-Host "OPTION A: Record each scene individually (recommended)`n" -ForegroundColor Yellow

    foreach ($i in 0..($scenes.Count - 1)) {
        $s = $scenes[$i]
        Write-Host "--- $($s.Name) ($($s.Duration)) ---" -ForegroundColor Green
        Write-Host $s.Instructions
        Write-Host ""
    }
}

function Start-SceneRecording {
    param([int]$SceneIndex)

    $scene = $scenes[$SceneIndex]
    $outFile = Join-Path $OutputDir "$($scene.Name).mp4"

    Write-Host "`n=== RECORDING: $($scene.Name) ===" -ForegroundColor Red
    Write-Host $scene.Instructions -ForegroundColor Yellow
    Write-Host "`nRecording to: $outFile"
    Write-Host "Press 'q' in the ffmpeg window to stop recording.`n" -ForegroundColor Magenta

    # Record full desktop using GDI grab (Windows)
    $ffmpegArgs = @(
        "-y",
        "-f", "gdigrab",
        "-framerate", "$FPS",
        "-video_size", $Resolution,
        "-offset_x", "0",
        "-offset_y", "0",
        "-i", "desktop",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        $outFile
    )

    Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait
    Write-Host "Saved: $outFile" -ForegroundColor Green
}

function Start-FullRecording {
    $outFile = Join-Path $OutputDir "full-recording.mp4"

    Write-Host "`n=== FULL RECORDING MODE ===" -ForegroundColor Red
    Write-Host "Recording entire demo in one take." -ForegroundColor Yellow
    Write-Host "Follow the scene guide printed above."
    Write-Host "Press 'q' in the ffmpeg window to stop.`n" -ForegroundColor Magenta

    $ffmpegArgs = @(
        "-y",
        "-f", "gdigrab",
        "-framerate", "$FPS",
        "-video_size", $Resolution,
        "-offset_x", "0",
        "-offset_y", "0",
        "-i", "desktop",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        $outFile
    )

    Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait
    Write-Host "Saved: $outFile" -ForegroundColor Green
}

# ============================================================================
# MAIN MENU
# ============================================================================
Show-RecordingGuide

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RECORDING OPTIONS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [G] Show guide only (read instructions)"
Write-Host "  [F] Full recording (one continuous take)"
Write-Host "  [S] Scene-by-scene recording (recommended)"
Write-Host "  [1-15] Record specific scene number"
Write-Host "  [Q] Quit"
Write-Host ""

$choice = Read-Host "Choose option"

switch ($choice.ToUpper()) {
    "G" { Show-RecordingGuide }
    "F" { Start-FullRecording }
    "S" {
        for ($i = 0; $i -lt $scenes.Count; $i++) {
            Write-Host "`n>>> Scene $($i+1)/$($scenes.Count): $($scenes[$i].Name)" -ForegroundColor Cyan
            $proceed = Read-Host "Press ENTER to start recording, or 'S' to skip"
            if ($proceed.ToUpper() -ne "S") {
                Start-SceneRecording -SceneIndex $i
            }
        }
        Write-Host "`n=== All scenes recorded! ===" -ForegroundColor Green
        Write-Host "Run .\03-assemble-video.ps1 to combine everything."
    }
    "Q" { return }
    default {
        $num = [int]$choice - 1
        if ($num -ge 0 -and $num -lt $scenes.Count) {
            Start-SceneRecording -SceneIndex $num
        } else {
            Write-Host "Invalid option." -ForegroundColor Red
        }
    }
}
