@echo off
REM Startet Spielregal (installiert beim ersten Mal die Abhaengigkeiten)
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte zuerst von https://nodejs.org installieren ^(LTS^).
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules\electron (
  echo Erster Start: lade Abhaengigkeiten ...
  call npm install --no-fund --no-audit
  if errorlevel 1 ( pause & exit /b 1 )
)
call npm start
