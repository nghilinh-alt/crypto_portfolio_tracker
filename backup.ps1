# Backs up prisma/dev.db to a folder OUTSIDE the git repo, so real portfolio
# data can never accidentally end up committed/pushed. Keeps the last 30
# backups and prunes older ones.

$backupDir = Join-Path $env:USERPROFILE "CryptoPortfolioBackups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$source = Join-Path $PSScriptRoot "prisma\dev.db"
if (-not (Test-Path $source)) {
    Write-Host "No database found at $source - nothing to back up yet."
    exit 0
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$dest = Join-Path $backupDir "dev_$timestamp.db"

Copy-Item -Path $source -Destination $dest -Force
Write-Host "Backed up database to $dest"

$backups = Get-ChildItem -Path $backupDir -Filter "dev_*.db" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 30) {
    $backups | Select-Object -Skip 30 | Remove-Item -Force
    Write-Host "Pruned old backups, keeping the most recent 30."
}
