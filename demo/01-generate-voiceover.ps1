#!/usr/bin/env pwsh
# ============================================================================
# CUBI FRONTEND v0.7.0 — Demo Voiceover Generator
# Uses edge-tts (free Microsoft Neural TTS) to generate narration clips
# ============================================================================
# PREREQUISITES:
#   pip install edge-tts
#   (Python 3.8+ required)
# ============================================================================

param(
    [string]$OutputDir = "$PSScriptRoot\audio",
    [string]$Voice = "en-US-GuyNeural",       # Male professional voice
    # Alternatives: en-US-JennyNeural (female), es-MX-DaliaNeural (Spanish female)
    [string]$Rate = "+5%"                       # Slightly faster for energy
)

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# ============================================================================
# NARRATION SEGMENTS — Edit text here to customize your demo
# Each segment = one audio clip, synced to screen recording later
# ============================================================================
$segments = [ordered]@{

    # === INTRO (0:00 - 0:15) ===
    "01-intro" = @"
Welcome to Cubi Frontend, version 0.7.0.
A next-generation multiplayer emulator frontend, built with Tauri, React, and Rust.
Let me walk you through everything Cubi can do.
"@

    # === LIBRARY OVERVIEW (0:15 - 0:40) ===
    "02-library" = @"
This is the Game Library, the heart of Cubi.
It supports 41 gaming systems, from the NES and Super Nintendo, all the way to PlayStation 3, Nintendo Switch, and even PC games from Steam, Epic, and GOG.
You can browse by system using the sidebar, search in real time, filter by genre or favorites, and sort by title, rating, or last played.
"@

    # === GAME GRID & LIST (0:40 - 0:55) ===
    "03-grid-list" = @"
The library supports two view modes.
Grid view shows beautiful box art thumbnails in a responsive layout, with zoom control from 1 to 5 columns.
List view gives you a detailed table with columns for title, release date, play count, and rating.
Switch between them instantly with the R3 stick button on your gamepad.
"@

    # === GAME DETAIL VIEW (0:55 - 1:20) ===
    "04-game-detail" = @"
Click any game to open the detail view.
Here you'll see the full metadata: description, developer, publisher, release year, genre, and your play stats.
Notice the 3D box art. Click it to flip the box and see the back cover, complete with a system-colored spine.
Below, you'll find the media gallery with screenshots, fan art, and video trailers.
One click on the launch button starts the game in the correct emulator.
"@

    # === THEMES (1:20 - 2:00) ===
    "05-themes-default" = @"
Now let's talk about themes. Cubi ships with three built-in themes.
The Default theme is a clean, modern dark layout with a purple accent.
"@

    "06-themes-hyperspin" = @"
Switching to HyperSpin theme.
This is an arcade-inspired layout with a spinning 3D wheel carousel.
Games rotate in a semicircle with perspective transforms.
Notice the CRT TV frame effect on the preview panel, just like a real arcade cabinet.
"@

    "07-themes-aurora" = @"
And here's Aurora, inspired by the Xbox 360 dashboard.
It features an animated tile carousel with smooth horizontal scrolling.
The bokeh particle animation in the background adds a premium feel.
System boxes line the bottom, and navigation is instant.
All theme switches happen without any page reload.
"@

    # === GAMEPAD NAVIGATION (2:00 - 2:30) ===
    "08-gamepad" = @"
Cubi is designed for the couch.
Full gamepad support with spatial navigation. The D-pad and analog sticks move between items intelligently.
A button confirms, B goes back, bumpers switch systems, triggers scroll pages.
You even get haptic feedback: light rumble on navigation, heavy on selection, and a confirm pattern when launching a game.
Up to 4 controllers can connect simultaneously.
"@

    # === SCRAPER SYSTEM (2:30 - 3:00) ===
    "09-scraper" = @"
The multi-source scraper is one of Cubi's most powerful features.
It connects to 9 different services: Steam Store API, IGDB, SteamGridDB, ScreenScraper, TheGamesDB, MobyGames, PCGamingWiki, YouTube, and a headless web scraper.
Each scraper can be configured with credentials and priority order.
Run a scrape job and watch as metadata, box art, screenshots, and even video trailers are downloaded automatically for thousands of games.
"@

    # === PC GAME INTEGRATION (3:00 - 3:20) ===
    "10-pc-games" = @"
PC game integration sets Cubi apart.
Import your Steam, Epic Games, GOG, and EA App libraries with one click.
Cubi pulls rich metadata from Steam: user reviews, categories, DLC count, achievements, and system requirements.
SteamGridDB provides custom box art, banners, and logos.
Launch games via Steam protocol or direct executable. Your entire PC gaming library, managed alongside your retro collection.
"@

    # === METADATA EDITOR (3:20 - 3:40) ===
    "11-metadata-editor" = @"
Every game's metadata is fully editable.
Change titles, descriptions, developers, publishers, years, genres, and tags.
Upload custom box art from a file or paste a URL.
Search YouTube for trailers and download them directly with yt-dlp integration.
All changes save instantly to the local database.
"@

    # === EMULATOR SETTINGS (3:40 - 4:00) ===
    "12-emulator-settings" = @"
Cubi supports 10 emulators out of the box, with EmuDeck auto-detection on Windows.
For each system, you can choose which emulator to use, and for RetroArch, which core.
Fine-tune per-emulator settings: resolution, FPS limit, aspect ratio, and video filters.
Custom ROM paths let you organize files however you want, across USB drives, NAS, or cloud.
"@

    # === LOCALIZATION (4:00 - 4:15) ===
    "13-localization" = @"
Cubi speaks your language.
Six languages are included: English, Spanish, French, German, Japanese, and Portuguese.
Switch languages instantly in Settings. All UI text updates in real time, no restart needed.
"@

    # === PERFORMANCE & TECH (4:15 - 4:35) ===
    "14-performance" = @"
Under the hood, Cubi is blazing fast.
The Rust backend scans 5000 ROMs in under 30 seconds using parallel processing with Rayon.
BLAKE3 hashing provides unique game identification.
The app starts in under 2 seconds and uses less than 150 MB of memory.
The installer is under 30 MB. No Java, no .NET, no runtime dependencies.
"@

    # === OUTRO (4:35 - 4:50) ===
    "15-outro" = @"
That's Cubi Frontend, version 0.7.0.
41 systems, 10 emulators, 3 themes, 6 languages, 9 scraper sources, and full gamepad control.
The ultimate game library manager for collectors, retro enthusiasts, and PC gamers alike.
Download it now from the GitHub releases page. Thanks for watching!
"@
}

# ============================================================================
# GENERATE AUDIO FILES
# ============================================================================
Write-Host "`n=== CUBI FRONTEND — Voiceover Generator ===" -ForegroundColor Cyan
Write-Host "Voice: $Voice | Rate: $Rate | Output: $OutputDir`n"

$total = $segments.Count
$current = 0

foreach ($entry in $segments.GetEnumerator()) {
    $current++
    $name = $entry.Key
    $text = $entry.Value
    $outFile = Join-Path $OutputDir "$name.mp3"

    Write-Host "[$current/$total] Generating: $name.mp3 ..." -NoNewline

    # Write text to temp file (avoids shell escaping issues)
    $tempText = [System.IO.Path]::GetTempFileName()
    $text | Out-File -FilePath $tempText -Encoding utf8

    # Generate audio with edge-tts
    $edgeArgs = @(
        "--voice", $Voice,
        "--rate", $Rate,
        "--file", $tempText,
        "--write-media", $outFile
    )

    try {
        $process = Start-Process -FilePath "edge-tts" -ArgumentList $edgeArgs `
            -Wait -NoNewWindow -PassThru -RedirectStandardError "$env:TEMP\edge-tts-err.txt"

        if ($process.ExitCode -eq 0 -and (Test-Path $outFile)) {
            $size = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
            Write-Host " OK (${size} KB)" -ForegroundColor Green
        } else {
            $errMsg = Get-Content "$env:TEMP\edge-tts-err.txt" -Raw -ErrorAction SilentlyContinue
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host "  Error: $errMsg" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
    } finally {
        Remove-Item $tempText -ErrorAction SilentlyContinue
    }
}

# ============================================================================
# GENERATE CONCAT LIST FOR FFMPEG
# ============================================================================
$concatFile = Join-Path $OutputDir "concat-list.txt"
$segments.Keys | ForEach-Object {
    "file '$_.mp3'"
} | Out-File -FilePath $concatFile -Encoding utf8

Write-Host "`n=== Audio Generation Complete ===" -ForegroundColor Cyan
Write-Host "Files saved to: $OutputDir"
Write-Host "Concat list: $concatFile"

# Create full voiceover by concatenating all segments
$fullAudio = Join-Path $OutputDir "full-voiceover.mp3"
Write-Host "`nMerging all segments into: full-voiceover.mp3 ..." -NoNewline

$ffmpegConcat = "ffmpeg -y -f concat -safe 0 -i `"$concatFile`" -c copy `"$fullAudio`" 2>&1"
$result = Invoke-Expression $ffmpegConcat

if (Test-Path $fullAudio) {
    $totalSize = [math]::Round((Get-Item $fullAudio).Length / 1MB, 2)
    Write-Host " OK ($totalSize MB)" -ForegroundColor Green
} else {
    Write-Host " FAILED (install ffmpeg)" -ForegroundColor Red
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Yellow
Write-Host "1. Run the app:           npx tauri dev"
Write-Host "2. Record screen:         .\02-record-screen.ps1"
Write-Host "3. Assemble final video:  .\03-assemble-video.ps1"
