$ErrorActionPreference = "Stop"

$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $HOME "nexumia-server" }
$Repo = "suitably/LocalGameGalaxy"
$Archive = "nexumia-server-win.zip"
$DownloadUrl = "https://github.com/$Repo/releases/latest/download/$Archive"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "      🚀 Nexumia Server Quick Installer      " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Target directory: $InstallDir"

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
Set-Location $InstallDir

$ZipPath = Join-Path $InstallDir $Archive
Write-Host "⬇️  Downloading latest Windows server binary from GitHub..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath

Write-Host "📦 Extracting $Archive..." -ForegroundColor Yellow
Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath -Force

$ConfigPath = Join-Path $InstallDir "config.json"
if (-not (Test-Path $ConfigPath)) {
    $Token = if ($env:TOKEN) { $env:TOKEN } else { -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_}) }
    $ConfigContent = @"
{
  "port": 3000,
  "token": "$Token",
  "directories": ["./music"],
  "allowedOrigins": ["*"]
}
"@
    Set-Content -Path $ConfigPath -Value $ConfigContent
    Write-Host "🔑 Generated fresh security token in config.json: $Token" -ForegroundColor Green
}

$MusicDir = Join-Path $InstallDir "music"
if (-not (Test-Path $MusicDir)) {
    New-Item -ItemType Directory -Path $MusicDir -Force | Out-Null
}

Write-Host "✅ Installation completed successfully!" -ForegroundColor Green
Write-Host "🚀 Starting Nexumia Server now..." -ForegroundColor Cyan

$BatPath = Join-Path $InstallDir "start-server.bat"
if (Test-Path $BatPath) {
    & $BatPath
} else {
    & (Join-Path $InstallDir "nexumia-server-win.exe")
}
