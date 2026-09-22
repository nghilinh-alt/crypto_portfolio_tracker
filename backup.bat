@echo off
cd /d "%~dp0"
echo Backing up prisma\dev.db to %%USERPROFILE%%\CryptoPortfolioBackups ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1"
pause
