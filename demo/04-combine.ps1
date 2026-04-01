#!/usr/bin/env pwsh
# ============================================================================
# CUBI FRONTEND v0.7.0 — Combine Video + Voiceover
# Takes the Playwright recording (.webm) and merges it with the voiceover
# ============================================================================

param(
    [string]$VideoDir = "$PSScriptRoot\recordings",
    [string]$AudioFile = "$PSScriptRoot\audio\full-voiceover.mp3",
    [string]$OutputDir = "$PSScriptRoot\output",
    [string]$FfmpegPath = ""
)

# Find ffmpeg
if (-not $FfmpegPath) {
    $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($cmd) { $FfmpegPath = $cmd.Source }
    if (-not $FfmpegPath) {
        # Try common locations
        $candidates = @(
            "C:\Users\vjsan\AppData\Local\Microsoft\WinGet\Packages\yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-N-123074-g4e32fb4c2a-win64-gpl\bin\ffmpeg.exe"
        )
        foreach ($c in $candidates) { if (Test-Path $c) { $FfmpegPath = $c; break } }
    }
}

if (-not $FfmpegPath -or -not (Test-Path $FfmpegPath)) {
    Write-Host "ERROR: ffmpeg not found. Install with: winget install Gyan.FFmpeg" -ForegroundColor Red
    exit 1
}

Write-Host "Using ffmpeg: $FfmpegPath" -ForegroundColor DarkGray

# Create output dir
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Find the video file
$videoFile = Get-ChildItem "$VideoDir\*.webm" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $videoFile) {
    Write-Host "ERROR: No .webm video found in $VideoDir" -ForegroundColor Red
    Write-Host "Run the Playwright recording first: npx tsx demo/record-demo.ts" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== CUBI FRONTEND — Video Assembly ===" -ForegroundColor Cyan
$vidSize = [math]::Round($videoFile.Length / 1MB, 1)
Write-Host "Video: $($videoFile.Name) - $vidSize MB"
Write-Host "Audio: $AudioFile"

# Step 1: Merge video + audio into MP4
$finalFile = Join-Path $OutputDir "cubi-frontend-v0.7.0-demo.mp4"
Write-Host "`n[1/3] Merging video + voiceover..." -ForegroundColor Yellow

& $FfmpegPath -y `
    -i $videoFile.FullName `
    -i $AudioFile `
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p `
    -c:a aac -b:a 192k `
    -shortest `
    -movflags +faststart `
    $finalFile 2>&1 | Out-Null

if (Test-Path $finalFile) {
    $size = [math]::Round((Get-Item $finalFile).Length / 1MB, 1)
    Write-Host "  OK: $finalFile - $size MB" -ForegroundColor Green
} else {
    Write-Host "  FAILED to create final video" -ForegroundColor Red
    exit 1
}

# Step 2: GitHub-optimized version (< 25 MB for README embedding)
$githubFile = Join-Path $OutputDir "cubi-frontend-demo-github.mp4"
Write-Host "[2/3] Creating GitHub-optimized version (< 25 MB)..." -ForegroundColor Yellow

& $FfmpegPath -y `
    -i $finalFile `
    -vf "scale=1280:720" `
    -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p `
    -c:a aac -b:a 128k `
    -movflags +faststart `
    $githubFile 2>&1 | Out-Null

if (Test-Path $githubFile) {
    $size = [math]::Round((Get-Item $githubFile).Length / 1MB, 1)
    Write-Host "  OK: $githubFile - $size MB" -ForegroundColor Green
    if ($size -gt 25) {
        Write-Host "  WARNING: Still > 25 MB. Increasing compression..." -ForegroundColor Yellow
        & $FfmpegPath -y `
            -i $finalFile `
            -vf "scale=1280:720" `
            -c:v libx264 -preset veryslow -crf 32 -pix_fmt yuv420p `
            -c:a aac -b:a 96k `
            -movflags +faststart `
            $githubFile 2>&1 | Out-Null
        $size = [math]::Round((Get-Item $githubFile).Length / 1MB, 1)
        $clr = if ($size -le 25) { 'Green' } else { 'Yellow' }
        Write-Host "  Recompressed: $size MB" -ForegroundColor $clr
    }
} else {
    Write-Host "  FAILED" -ForegroundColor Red
}

# Step 3: GIF preview (10 seconds, 480p)
$gifFile = Join-Path $OutputDir "cubi-frontend-preview.gif"
Write-Host "[3/3] Creating GIF preview (10s, 480p)..." -ForegroundColor Yellow

& $FfmpegPath -y `
    -ss 5 -t 10 `
    -i $finalFile `
    -vf "fps=15,scale=854:480:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" `
    -loop 0 `
    $gifFile 2>&1 | Out-Null

if (Test-Path $gifFile) {
    $size = [math]::Round((Get-Item $gifFile).Length / 1MB, 1)
    Write-Host "  OK: $gifFile - $size MB" -ForegroundColor Green
} else {
    Write-Host "  FAILED - GIF generation" -ForegroundColor Red
}

# Summary
Write-Host "`n=== OUTPUT FILES ===" -ForegroundColor Cyan
Get-ChildItem $OutputDir | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name) — $sizeMB MB" -ForegroundColor White
}

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Upload to GitHub Releases or embed in README.md:"
Write-Host '  ![Cubi Demo](demo/output/cubi-frontend-preview.gif)' -ForegroundColor DarkGray
Write-Host '  [Watch Full Demo](demo/output/cubi-frontend-demo-github.mp4)' -ForegroundColor DarkGray
