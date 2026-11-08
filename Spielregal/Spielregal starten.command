#!/bin/bash
# Startet Spielregal (installiert beim ersten Mal die Abhängigkeiten)
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display dialog "Node.js fehlt. Bitte zuerst von nodejs.org installieren (LTS)." buttons {"OK"} default button 1 with title "Spielregal"'
  open "https://nodejs.org"
  exit 1
fi
if [ ! -d node_modules/electron ]; then
  echo "▸ Erster Start: lade Abhängigkeiten …"
  npm install --no-fund --no-audit || exit 1
fi
npm start
