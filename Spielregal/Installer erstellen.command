#!/bin/bash
# Erstellt auf diesem Mac einen Installer (DMG) und öffnet ihn.
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display dialog "Für das Erstellen wird einmalig Node.js benötigt. Bitte von nodejs.org (LTS) installieren und dieses Skript erneut starten." buttons {"OK"} default button 1 with title "Spielregal"'
  open "https://nodejs.org"
  exit 1
fi
ARCH=$([ "$(uname -m)" = "arm64" ] && echo arm || echo intel)
echo "▸ Lade Abhängigkeiten …"
npm install --no-fund --no-audit || exit 1
echo "▸ Baue Installer für Mac ($ARCH) …"
CSC_IDENTITY_AUTO_DISCOVERY=false npm run "dist:mac-$ARCH" || exit 1
DMG=$(ls -t dist/*.dmg | head -1)
echo "✓ Fertig: $DMG"
open "$DMG"
