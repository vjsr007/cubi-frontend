#!/usr/bin/env pwsh
# ============================================================================
# CUBI FRONTEND v0.7.0 — Video Assembly Script
# Combines screen recordings + voiceover into final demo video
# ============================================================================
# PREREQUISITES:
#   ffmpeg in PATH (choco install ffmpeg / winget install ffmpeg)
# ============================================================================

param(
    [string]$AudioDir = "$PSScriptRoot\audio",
    [string]$VideoDir = "$PSScriptRoot\recordings",
    [string]$OutputDir = "$PSScriptRoot\output",
    [string]$OutputFile = "cubi-frontend-v0.7.0-demo.mp4",
    [switch]$SceneByScene,       # Combine individual scenes
    [switch]$FullTake,           # Use single full recording
    [string]$BackgroundMusic = "" # Optional BGM file path
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$finalOutput = Join-Path $OutputDir $OutputFile

# ============================================================================
# SCENE NAMES (must match recording + audio file names)
# ============================================================================
$sceneNames = @(
    "01-intro",
    "02-library",
    "03-grid-list",
    "04-game-detail",
    "05-themes-default",
    "06-themes-hyperspin",
    "07-themes-aurora",
    "08-gamepad",
    "09-scraper",
    "10-pc-games",
    "11-metadata-editor",
    "12-emulator-settings",
    "13-localization",
    "14-performance",
    "15-outro"
)

# ============================================================================
# HELPER: Get audio duration using ffprobe
# ============================================================================
function Get-MediaDuration {
    param([string]$FilePath)
    $result = & ffprobe -v quiet -print_format json -show_format $FilePath 2>&1
    $json = $result | ConvertFrom-Json
    return [double]$json.format.duration
}

# ============================================================================
# OPTION 1: Scene-by-scene assembly (recommended)
# ============================================================================
function Invoke-SceneAssembly {
    Write-Host "`n=== Scene-by-Scene Assembly ===" -ForegroundColor Cyan

    $tempDir = Join-Path $OutputDir "temp"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    $combinedScenes = @()

    foreach ($name in $sceneNames) {
        $videoFile = Join-Path $VideoDir "$name.mp4"
        $audioFile = Join-Path $AudioDir "$name.mp3"
        $outputScene = Join-Path $tempDir "$name-combined.mp4"

        if (-not (Test-Path $videoFile)) {
            Write-Host "  SKIP: $name (no video)" -ForegroundColor Yellow
            continue
        }

        Write-Host "  Processing: $name ..." -NoNewline

        if (Test-Path $audioFile) {
            # Get durations
            $videoDur = Get-MediaDuration $videoFile
            $audioDur = Get-MediaDuration $audioFile

            # Use the longer duration (pad video or audio)
            $maxDur = [Math]::Max($videoDur, $audioDur)

            # Combine video + voiceover audio
            $args = @(
                "-y",
                "-i", "`"$videoFile`"",
                "-i", "`"$audioFile`"",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "20",
                "-c:a", "aac",
                "-b:a", "192k",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                "-pix_fmt", "yuv420p",
                "`"$outputScene`""
            )
            $cmd = "ffmpeg $($args -join ' ') 2>&1"
            Invoke-Expression $cmd | Out-Null
        } else {
            # No audio — just re-encode video
            $cmd = "ffmpeg -y -i `"$videoFile`" -c:v libx264 -preset medium -crf 20 -an -pix_fmt yuv420p `"$outputScene`" 2>&1"
            Invoke-Expression $cmd | Out-Null
        }

        if (Test-Path $outputScene) {
            $combinedScenes += $outputScene
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAILED" -ForegroundColor Red
        }
    }

    if ($combinedScenes.Count -eq 0) {
        Write-Host "`nNo scenes to combine!" -ForegroundColor Red
        return
    }

    # Create concat list
    $concatFile = Join-Path $tempDir "concat-scenes.txt"
    $combinedScenes | ForEach-Object {
        "file '$($_ -replace '\\','/')'"
    } | Out-File -FilePath $concatFile -Encoding utf8

    # Concatenate all scenes
    Write-Host "`n  Concatenating $($combinedScenes.Count) scenes ..." -NoNewline
    $cmd = "ffmpeg -y -f concat -safe 0 -i `"$concatFile`" -c copy `"$finalOutput`" 2>&1"
    Invoke-Expression $cmd | Out-Null

    if (Test-Path $finalOutput) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }

    # Cleanup temp
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ============================================================================
# OPTION 2: Full take + full voiceover overlay
# ============================================================================
function Invoke-FullTakeAssembly {
    Write-Host "`n=== Full Take Assembly ===" -ForegroundColor Cyan

    $videoFile = Join-Path $VideoDir "full-recording.mp4"
    $audioFile = Join-Path $AudioDir "full-voiceover.mp3"

    if (-not (Test-Path $videoFile)) {
        Write-Host "ERROR: full-recording.mp4 not found in $VideoDir" -ForegroundColor Red
        return
    }

    $ffmpegArgs = @("-y", "-i", "`"$videoFile`"")

    if (Test-Path $audioFile) {
        Write-Host "  Overlaying voiceover on full recording..."
        $ffmpegArgs += @("-i", "`"$audioFile`"")
        $ffmpegArgs += @(
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[aout]",
            "-map", "0:v:0",
            "-map", "[aout]"
        )
    } else {
        Write-Host "  No voiceover found, using video audio only..."
        $ffmpegArgs += @("-map", "0:v:0", "-map", "0:a:0?")
    }

    $ffmpegArgs += @(
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "`"$finalOutput`""
    )

    $cmd = "ffmpeg $($ffmpegArgs -join ' ') 2>&1"
    Write-Host "  Encoding final video ..." -NoNewline
    Invoke-Expression $cmd | Out-Null

    if (Test-Path $finalOutput) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

# ============================================================================
# ADD BACKGROUND MUSIC (optional post-processing)
# ============================================================================
function Add-BackgroundMusic {
    param([string]$BGMFile)

    if (-not (Test-Path $BGMFile)) {
        Write-Host "BGM file not found: $BGMFile" -ForegroundColor Red
        return
    }

    $tempOutput = Join-Path $OutputDir "temp-with-bgm.mp4"

    Write-Host "`n  Adding background music ..." -NoNewline

    # Mix: voice at 100%, BGM at 15% volume
    $cmd = @"
ffmpeg -y -i "$finalOutput" -i "$BGMFile" -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=3[aout]" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 192k "$tempOutput" 2>&1
"@
    Invoke-Expression $cmd | Out-Null

    if (Test-Path $tempOutput) {
        Move-Item $tempOutput $finalOutput -Force
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

# ============================================================================
# ADD INTRO/OUTRO TITLE CARDS (text overlay)
# ============================================================================
function Add-TitleOverlays {
    Write-Host "`n  Adding title overlays ..." -NoNewline

    $tempOutput = Join-Path $OutputDir "temp-with-titles.mp4"

    # Add text overlay for first 5 seconds and last 5 seconds
    $introText = "CUBI FRONTEND v0.7.0"
    $subtitleText = "The Ultimate Emulator Frontend"
    $outroText = "github.com/vjsr007/cubi-frontend"

    $filter = @"
drawtext=text='$introText':fontsize=64:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2-40:enable='between(t,0,4)',drawtext=text='$subtitleText':fontsize=36:fontcolor=white@0.8:borderw=2:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2+40:enable='between(t,0.5,4)',drawtext=text='$outroText':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(t,duration-5)'
"@

    $cmd = "ffmpeg -y -i `"$finalOutput`" -vf `"$filter`" -c:v libx264 -preset medium -crf 20 -c:a copy `"$tempOutput`" 2>&1"
    Invoke-Expression $cmd | Out-Null

    if (Test-Path $tempOutput) {
        Move-Item $tempOutput $finalOutput -Force
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " SKIPPED (font issue)" -ForegroundColor Yellow
    }
}

# ============================================================================
# GENERATE GITHUB-OPTIMIZED VERSION
# ============================================================================
function Export-GitHubVersion {
    $ghOutput = Join-Path $OutputDir "cubi-frontend-demo-github.mp4"

    Write-Host "`n  Creating GitHub-optimized version (25MB max) ..." -NoNewline

    # Get duration
    $duration = Get-MediaDuration $finalOutput

    # Target 24MB = 192Mbit → bitrate = 192000 / duration kbps
    $targetBitrate = [math]::Floor(192000 / $duration)
    $targetBitrate = [math]::Min($targetBitrate, 2500)  # Cap at 2500kbps

    $cmd = "ffmpeg -y -i `"$finalOutput`" -c:v libx264 -b:v ${targetBitrate}k -pass 1 -an -f null NUL 2>&1"
    Invoke-Expression $cmd | Out-Null

    $cmd = "ffmpeg -y -i `"$finalOutput`" -c:v libx264 -b:v ${targetBitrate}k -pass 2 -c:a aac -b:a 128k -pix_fmt yuv420p `"$ghOutput`" 2>&1"
    Invoke-Expression $cmd | Out-Null

    # Cleanup 2-pass log files
    Remove-Item "ffmpeg2pass-*.log*" -ErrorAction SilentlyContinue

    if (Test-Path $ghOutput) {
        $sizeMB = [math]::Round((Get-Item $ghOutput).Length / 1MB, 2)
        Write-Host " OK ($sizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

# ============================================================================
# GENERATE GIF PREVIEW (for README.md)
# ============================================================================
function Export-GifPreview {
    $gifOutput = Join-Path $OutputDir "cubi-frontend-preview.gif"

    Write-Host "`n  Creating GIF preview (10s, 480p) ..." -NoNewline

    # Extract 10 seconds starting at 0:20, scale to 480p, 10fps
    $cmd = "ffmpeg -y -ss 20 -t 10 -i `"$finalOutput`" -vf `"fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`" `"$gifOutput`" 2>&1"
    Invoke-Expression $cmd | Out-Null

    if (Test-Path $gifOutput) {
        $sizeMB = [math]::Round((Get-Item $gifOutput).Length / 1MB, 2)
        Write-Host " OK ($sizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  CUBI FRONTEND v0.7.0 — Video Assembly" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Step 1: Combine video + audio
if ($FullTake) {
    Invoke-FullTakeAssembly
} elseif ($SceneByScene) {
    Invoke-SceneAssembly
} else {
    # Auto-detect: check if scene files or full recording exist
    $hasScenes = $sceneNames | Where-Object { Test-Path (Join-Path $VideoDir "$_.mp4") }
    $hasFull = Test-Path (Join-Path $VideoDir "full-recording.mp4")

    if ($hasScenes.Count -gt 0) {
        Write-Host "  Detected scene-by-scene recordings" -ForegroundColor Green
        Invoke-SceneAssembly
    } elseif ($hasFull) {
        Write-Host "  Detected full recording" -ForegroundColor Green
        Invoke-FullTakeAssembly
    } else {
        Write-Host "ERROR: No recordings found in $VideoDir" -ForegroundColor Red
        Write-Host "Run .\02-record-screen.ps1 first!" -ForegroundColor Yellow
        return
    }
}

if (-not (Test-Path $finalOutput)) {
    Write-Host "`nAssembly failed. Check ffmpeg output above." -ForegroundColor Red
    return
}

# Step 2: Add title overlays
Add-TitleOverlays

# Step 3: Add background music (if provided)
if ($BackgroundMusic -and (Test-Path $BackgroundMusic)) {
    Add-BackgroundMusic -BGMFile $BackgroundMusic
}

# Step 4: Create distribution versions
Export-GitHubVersion
Export-GifPreview

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  ASSEMBLY COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

$files = Get-ChildItem $OutputDir -File | ForEach-Object {
    [PSCustomObject]@{
        File = $_.Name
        Size = "$([math]::Round($_.Length / 1MB, 2)) MB"
    }
}
$files | Format-Table -AutoSize

Write-Host "Output directory: $OutputDir"
Write-Host "`nNext steps:"
Write-Host "  1. Review: open $finalOutput"
Write-Host "  2. Upload 'cubi-frontend-demo-github.mp4' to GitHub Release v0.7.0"
Write-Host "  3. Add 'cubi-frontend-preview.gif' to README.md"
Write-Host "  4. (Optional) Upload full video to YouTube"
