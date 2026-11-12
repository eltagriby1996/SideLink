# SideLink Automated Release Packager
param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== SideLink Release Packaging Pipeline ===" -ForegroundColor Cyan

# 1. Clean build servers
Write-Host "Shutting down MSBuild daemon..."
dotnet build-server shutdown

# 2. Build Solution and Run Tests
Write-Host "Running automated tests..." -ForegroundColor Yellow
dotnet test "$ScriptDir\SideLink.sln" --configuration $Configuration
if ($LASTEXITCODE -ne 0) {
    Write-Error "Automated tests failed. Aborting packaging."
}

# 3. Publish Windows Desktop Client
$DistDir = "$ScriptDir\dist\SideLink"
Write-Host "Publishing Windows Desktop Client to $DistDir..." -ForegroundColor Yellow
dotnet publish "$ScriptDir\src\SideLink.App\SideLink.App.csproj" -c $Configuration -o $DistDir -p:UseSharedCompilation=false

# 3.1 Copy Companion assets
if (Test-Path "$ScriptDir\assets\SideStore.ipa") {
    $DistAssets = "$DistDir\assets"
    if (-not (Test-Path $DistAssets)) { New-Item -ItemType Directory -Path $DistAssets -Force | Out-Null }
    Copy-Item "$ScriptDir\assets\SideStore.ipa" -Destination "$DistAssets\SideStore.ipa" -Force
}

# 4. Create ZIP Distribution Archive
$ZipPath = "$ScriptDir\dist\SideLink-v1.0.0-win-x64.zip"
Write-Host "Creating portable ZIP archive: $ZipPath..." -ForegroundColor Yellow
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipPath -CompressionLevel Optimal

# 5. Check if Inno Setup is available to compile the .exe installer
$IsccCandidates = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)
$Iscc = $IsccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($Iscc) {
    Write-Host "Compiling Windows Installer with Inno Setup ($Iscc)..." -ForegroundColor Yellow
    & $Iscc "$ScriptDir\installer\SideLinkSetup.iss"
} else {
    Write-Host "Inno Setup compiler (ISCC.exe) not found on path. Portable ZIP archive created at $ZipPath." -ForegroundColor Green
}

# 6. Synchronize release builds to Desktop and Web downloads
Write-Host "Synchronizing release artifacts to Desktop folders..." -ForegroundColor Yellow

$DesktopLinkDir = "C:\Users\HD\Desktop\SideLink1"
if (Test-Path $DesktopLinkDir) {
    Copy-Item "$DistDir\*" -Destination $DesktopLinkDir -Recurse -Force
    Write-Host "[OK] Updated $($DesktopLinkDir) - Active Desktop shortcut target" -ForegroundColor Green
}

$DesktopDistDir = "C:\Users\HD\Desktop\SideLink-v1.0.0-win-x64"
if (Test-Path $DesktopDistDir) {
    Copy-Item "$DistDir\*" -Destination $DesktopDistDir -Recurse -Force
    Write-Host "[OK] Updated $($DesktopDistDir)" -ForegroundColor Green
}

$InstallerExe = "$ScriptDir\dist\Installer\SideLink-v1.0.0-Setup.exe"
if (Test-Path $InstallerExe) {
    Copy-Item $InstallerExe -Destination "C:\Users\HD\Desktop\SideLink-v1.0.0-Setup.exe" -Force
    $WebDownloads = "$ScriptDir\sidelink-web\public\downloads"
    if (-not (Test-Path $WebDownloads)) { New-Item -ItemType Directory -Path $WebDownloads -Force | Out-Null }
    Copy-Item $InstallerExe -Destination "$WebDownloads\SideLink-v1.0.0-Setup.exe" -Force
    Write-Host "[OK] Copied Installer to Desktop and Web public downloads" -ForegroundColor Green
}

if (Test-Path $ZipPath) {
    Copy-Item $ZipPath -Destination "C:\Users\HD\Desktop\SideLink-v1.0.0-win-x64.zip" -Force
    $WebDownloads = "$ScriptDir\sidelink-web\public\downloads"
    Copy-Item $ZipPath -Destination "$WebDownloads\SideLink-v1.0.0-win-x64.zip" -Force
    Write-Host "[OK] Copied ZIP to Desktop and Web public downloads" -ForegroundColor Green
}

Write-Host "=== Packaging Complete! ===" -ForegroundColor Green
Write-Host "Executable: $DistDir\SideLink.App.exe"
Write-Host "Distribution Archive: $ZipPath"
