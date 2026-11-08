@echo off
REM Erstellt auf diesem PC den Windows-Installer
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org installieren ^(LTS^).
  start https://nodejs.org
  pause
  exit /b 1
)
call npm install --no-fund --no-audit
if errorlevel 1 ( pause & exit /b 1 )
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist:win
if errorlevel 1 ( pause & exit /b 1 )
explorer dist
