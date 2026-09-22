@echo off
cd /d "%~dp0"

echo Backing up database before starting...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1"
echo.

echo Starting Crypto Portfolio Manager...
echo.
echo Once it says "Ready", open http://localhost:3000 in your browser.
echo Leave this window open while you use the app - closing it stops the server.
echo Press Ctrl+C in this window to stop.
echo.

call npm run dev

pause
