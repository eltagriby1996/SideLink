# BitLoader Automated Release Packager
param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== BitLoader Release Packaging Pipeline ===" -ForegroundColor Cyan

# 1. Clean build servers
Write-Host "Shutting down MSBuild daemon..."
dotnet build-server shutdown

# 2. Build Solution and Run Tests
Write-Host "Running automated tests..." -ForegroundColor Yellow
dotnet test "$ScriptDir\BitLoader.sln" --configuration $Configuration
if ($LASTEXITCODE -ne 0) {
    Write-Error "Automated tests failed. Aborting packaging."
}

# 3. Publish Windows Desktop Client
$DistDir = "$ScriptDir\dist\BitLoader"
Write-Host "Publishing Windows Desktop Client to $DistDir..." -ForegroundColor Yellow
dotnet publish "$ScriptDir\src\BitLoader.App\BitLoader.App.csproj" -c $Configuration -o $DistDir -p:UseSharedCompilation=false

# 4. Create ZIP Distribution Archive
$ZipPath = "$ScriptDir\dist\BitLoader-v1.0.0-win-x64.zip"
Write-Host "Creating portable ZIP archive: $ZipPath..." -ForegroundColor Yellow
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipPath -CompressionLevel Optimal

# 5. Check if Inno Setup is available to compile the .exe installer
$Iscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (Test-Path $Iscc) {
    Write-Host "Compiling Windows Installer with Inno Setup..." -ForegroundColor Yellow
    & $Iscc "$ScriptDir\installer\BitLoaderSetup.iss"
} else {
    Write-Host "Inno Setup compiler (ISCC.exe) not found on path. Portable ZIP archive created at $ZipPath." -ForegroundColor Green
}

Write-Host "=== Packaging Complete! ===" -ForegroundColor Green
Write-Host "Executable: $DistDir\BitLoader.App.exe"
Write-Host "Distribution Archive: $ZipPath"
