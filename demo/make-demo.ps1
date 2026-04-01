#!/usr/bin/env pwsh
# ============================================================================
# CUBI FRONTEND v0.7.0 — Demo Video Master Script
# One-click pipeline: Install tools → Generate voice → Record → Assemble
# ============================================================================
# 
# USAGE:
#   .\make-demo.ps1                  # Interactive full pipeline
#   .\make-demo.ps1 -InstallOnly     # Just install prerequisites
#   .\make-demo.ps1 -VoiceOnly       # Generate voiceover only
#   .\make-demo.ps1 -AssembleOnly    # Assemble existing recordings
#   .\make-demo.ps1 -Spanish         # Spanish voiceover
#
# ALL TOOLS ARE 100% FREE:
#   - edge-tts (Microsoft Neural TTS — free, no API key)
#   - ffmpeg (screen recording + video editing — free, open source)
#   - Python 3.8+ (for edge-tts — free)
#
# ============================================================================

param(
    [switch]$InstallOnly,
    [switch]$VoiceOnly,
    [switch]$AssembleOnly,
    [switch]$Spanish,
    [string]$Voice = "",
    [string]$BGM = ""
)

$ErrorActionPreference = "Stop"
$demoDir = $PSScriptRoot

Write-Host @"

  ╔═══════════════════════════════════════════════════════╗
  ║        CUBI FRONTEND v0.7.0 — Demo Producer          ║
  ║     100% Free Tools: edge-tts + ffmpeg + PowerShell   ║
  ╚═══════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ============================================================================
# STEP 0: Check / Install Prerequisites
# ============================================================================
function Test-Prerequisites {
    Write-Host "=== Checking Prerequisites ===" -ForegroundColor Yellow
    $missing = @()

    # Python
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $pyVer = & python --version 2>&1
        Write-Host "  [OK] Python: $pyVer" -ForegroundColor Green
    } else {
        Write-Host "  [!!] Python: NOT FOUND" -ForegroundColor Red
        $missing += "python"
    }

    # edge-tts
    $edgeTts = Get-Command edge-tts -ErrorAction SilentlyContinue
    if ($edgeTts) {
        Write-Host "  [OK] edge-tts: installed" -ForegroundColor Green
    } else {
        Write-Host "  [!!] edge-tts: NOT FOUND" -ForegroundColor Red
        $missing += "edge-tts"
    }

    # ffmpeg
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($ffmpeg) {
        $ffVer = (& ffmpeg -version 2>&1 | Select-Object -First 1) -replace 'ffmpeg version\s+', ''
        Write-Host "  [OK] ffmpeg: $ffVer" -ForegroundColor Green
    } else {
        Write-Host "  [!!] ffmpeg: NOT FOUND" -ForegroundColor Red
        $missing += "ffmpeg"
    }

    # ffprobe
    $ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
    if ($ffprobe) {
        Write-Host "  [OK] ffprobe: installed" -ForegroundColor Green
    } else {
        Write-Host "  [!!] ffprobe: NOT FOUND (comes with ffmpeg)" -ForegroundColor Red
        if ("ffmpeg" -notin $missing) { $missing += "ffmpeg" }
    }

    return $missing
}

function Install-Prerequisites {
    param([string[]]$Missing)

    Write-Host "`n=== Installing Missing Tools ===" -ForegroundColor Yellow

    foreach ($tool in $Missing) {
        switch ($tool) {
            "python" {
                Write-Host "  Installing Python via winget..."
                winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
            }
            "edge-tts" {
                Write-Host "  Installing edge-tts via pip..."
                pip install edge-tts
            }
            "ffmpeg" {
                Write-Host "  Installing ffmpeg via winget..."
                winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
                Write-Host "  NOTE: You may need to restart your terminal for PATH updates." -ForegroundColor Yellow
            }
        }
    }

    Write-Host "`nAll tools installed. Re-run this script if PATH needs refresh." -ForegroundColor Green
}

# ============================================================================
# STEP 1: Generate Voiceover
# ============================================================================
function Invoke-VoiceGeneration {
    Write-Host "`n=== Step 1: Generating Voiceover ===" -ForegroundColor Yellow

    $voiceArgs = @()

    if ($Spanish) {
        if (-not $Voice) { $Voice = "es-MX-DaliaNeural" }
        $voiceArgs += @("-Voice", $Voice)
        Write-Host "  Using Spanish voice: $Voice"
    } elseif ($Voice) {
        $voiceArgs += @("-Voice", $Voice)
        Write-Host "  Using custom voice: $Voice"
    }

    & "$demoDir\01-generate-voiceover.ps1" @voiceArgs
}

# ============================================================================
# STEP 2: Record Screen
# ============================================================================
function Invoke-Recording {
    Write-Host "`n=== Step 2: Screen Recording ===" -ForegroundColor Yellow
    Write-Host @"

  Before recording, make sure:
  1. Cubi Frontend is running (npx tauri dev)
  2. Your game library is populated with games
  3. Screen resolution is 1920x1080
  4. (Optional) Connect a gamepad for Scene 8

"@ -ForegroundColor White

    & "$demoDir\02-record-screen.ps1"
}

# ============================================================================
# STEP 3: Assemble Video
# ============================================================================
function Invoke-Assembly {
    Write-Host "`n=== Step 3: Assembling Video ===" -ForegroundColor Yellow

    $assemblyArgs = @()
    if ($BGM) {
        $assemblyArgs += @("-BackgroundMusic", $BGM)
    }

    & "$demoDir\03-assemble-video.ps1" @assemblyArgs
}

# ============================================================================
# MAIN
# ============================================================================

# Check prerequisites
$missing = Test-Prerequisites

if ($missing.Count -gt 0) {
    Write-Host "`nMissing tools: $($missing -join ', ')" -ForegroundColor Red
    $install = Read-Host "Install them now? (Y/N)"
    if ($install.ToUpper() -eq "Y") {
        Install-Prerequisites -Missing $missing
    } else {
        Write-Host "Cannot proceed without: $($missing -join ', ')" -ForegroundColor Red
        return
    }
}

if ($InstallOnly) { return }

# List available voices
if ($Spanish -and -not $Voice) {
    Write-Host "`nAvailable Spanish voices:" -ForegroundColor Yellow
    & edge-tts --list-voices 2>&1 | Select-String "es-" | Select-Object -First 10
}

# Execute pipeline
if ($VoiceOnly) {
    Invoke-VoiceGeneration
} elseif ($AssembleOnly) {
    Invoke-Assembly
} else {
    # Full pipeline
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  FULL PIPELINE" -ForegroundColor Cyan
    Write-Host "  Step 1: Generate voiceover (automatic)" -ForegroundColor White
    Write-Host "  Step 2: Record screen (interactive)" -ForegroundColor White
    Write-Host "  Step 3: Assemble final video (automatic)" -ForegroundColor White
    Write-Host "============================================`n" -ForegroundColor Cyan

    $proceed = Read-Host "Start? (Y/N)"
    if ($proceed.ToUpper() -ne "Y") { return }

    Invoke-VoiceGeneration
    Invoke-Recording
    Invoke-Assembly

    Write-Host @"

  ╔═══════════════════════════════════════════════════════╗
  ║                 DEMO VIDEO COMPLETE!                  ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Output: demo\output\cubi-frontend-v0.7.0-demo.mp4   ║
  ║  GitHub: demo\output\cubi-frontend-demo-github.mp4    ║
  ║  GIF:    demo\output\cubi-frontend-preview.gif        ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Upload to:                                           ║
  ║  - GitHub Release v0.7.0 (the MP4)                    ║
  ║  - README.md (the GIF preview)                        ║
  ║  - YouTube (the full quality video)                    ║
  ╚═══════════════════════════════════════════════════════╝

"@ -ForegroundColor Green
}
