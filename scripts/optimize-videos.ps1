<#
.SYNOPSIS
Optimizes CareerOS intro videos using FFmpeg for the Boot Experience.

.DESCRIPTION
This script converts the provided high-resolution MP4 files into highly compressed, 
web-optimized VP9 WebM format to ensure fast loading and smooth playback on all devices.
It outputs intro_landscape.webm and intro_portrait.webm.

.NOTES
Ensure FFmpeg is installed and available in your PATH before running this script.
Target size: 8MB–12MB.
#>

param (
    [string]$InputDir = ".\public",
    [string]$OutputDir = ".\public",
    [int]$Crf = 35,
    [string]$Preset = "veryslow"
)

# Function to check if FFmpeg is installed
function Check-FFmpeg {
    try {
        $null = Get-Command ffmpeg -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (-not (Check-FFmpeg)) {
    Write-Host "Error: FFmpeg is not installed or not added to your PATH." -ForegroundColor Red
    Write-Host "Please download FFmpeg from https://ffmpeg.org/download.html and add it to your system PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host "FFmpeg found. Starting video optimization..." -ForegroundColor Green

# 1. Optimize Landscape Video
$landscapeInput = Join-Path $InputDir "intro_landscape.mp4"
$landscapeOutput = Join-Path $OutputDir "intro_landscape.webm"

if (Test-Path $landscapeInput) {
    Write-Host "Optimizing Landscape Video..." -ForegroundColor Cyan
    # Two-pass encoding for optimal quality/size ratio (VP9)
    # -c:v libvpx-vp9 : Use VP9 codec
    # -crf 35 -b:v 0 : Target a visual quality rather than a strict bitrate
    # -an : Remove audio (handled separately or not needed if muted)
    ffmpeg -y -i "$landscapeInput" -c:v libvpx-vp9 -pass 1 -b:v 0 -crf $Crf -threads 8 -speed 4 -tile-columns 2 -an -f webm NUL
    ffmpeg -y -i "$landscapeInput" -c:v libvpx-vp9 -pass 2 -b:v 0 -crf $Crf -threads 8 -speed 1 -tile-columns 2 -an "$landscapeOutput"
    Write-Host "Generated: $landscapeOutput" -ForegroundColor Green
} else {
    Write-Host "File not found: $landscapeInput" -ForegroundColor Yellow
}

# 2. Optimize Portrait Video
$portraitInput = Join-Path $InputDir "intro_portrait.mp4"
$portraitOutput = Join-Path $OutputDir "intro_portrait.webm"

if (Test-Path $portraitInput) {
    Write-Host "`nOptimizing Portrait Video..." -ForegroundColor Cyan
    ffmpeg -y -i "$portraitInput" -c:v libvpx-vp9 -pass 1 -b:v 0 -crf $Crf -threads 8 -speed 4 -tile-columns 2 -an -f webm NUL
    ffmpeg -y -i "$portraitInput" -c:v libvpx-vp9 -pass 2 -b:v 0 -crf $Crf -threads 8 -speed 1 -tile-columns 2 -an "$portraitOutput"
    Write-Host "Generated: $portraitOutput" -ForegroundColor Green
} else {
    Write-Host "File not found: $portraitInput" -ForegroundColor Yellow
}

# Cleanup pass log files
if (Test-Path "ffmpeg2pass-0.log") { Remove-Item "ffmpeg2pass-0.log" }

Write-Host "`nOptimization complete. Please test the Boot Experience to verify the visual quality." -ForegroundColor Green
