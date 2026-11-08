# Spielregal

Desktop-App für deine Videospiel- und Konsolensammlung. Läuft auf **macOS (Intel und Apple-Chip)** und **Windows**.

## Starten

1. **Node.js LTS** installieren: <https://nodejs.org> (der Installer funktioniert auch auf Intel-Macs).
2. Diesen Ordner entpacken.
3. **Mac:** `Spielregal starten.command` per Rechtsklick → *Öffnen*.
   **Windows:** `Spielregal starten.bat` doppelklicken.

Beim ersten Start werden die Abhängigkeiten geladen (ca. 1–2 Minuten). Danach öffnet sich die App direkt.

Per Terminal geht es auch: `npm install`, danach `npm start`.

## Installer (DMG / EXE)

**Weg A – automatisch über GitHub (kein Node.js auf deinem Rechner nötig)**
Den Ordner in ein GitHub-Repository hochladen, der Ordner `.github` muss dabei mit. Der Workflow `Installer bauen` erstellt bei jedem Push nach ca. 10 Minuten unter **Releases**:
- `Spielregal-0.1.0-Mac-x64.dmg` für Intel-Macs
- `Spielregal-0.1.0-Mac-arm64.dmg` für Macs mit Apple-Chip
- `Spielregal-Setup-0.1.0.exe` für Windows

**Weg B – auf dem eigenen Rechner**
Node.js LTS installieren, dann `Installer erstellen.command` (Mac) bzw. `Installer erstellen.bat` (Windows) starten. Der fertige Installer öffnet sich danach von selbst.

**Installieren**
- **Mac:** DMG öffnen, Spielregal auf *Programme* ziehen.
- **Windows:** Setup ausführen, es legt Startmenü- und Desktop-Verknüpfungen an.

**Erster Start einer nicht signierten App**
- **Mac:** Rechtsklick → *Öffnen*. Unter macOS 15 stattdessen: *Systemeinstellungen → Datenschutz & Sicherheit → Trotzdem öffnen*.
- **Windows:** Bei SmartScreen auf *Weitere Informationen → Trotzdem ausführen* klicken.

Systemvoraussetzung: macOS 11 oder neuer bzw. Windows 10/11.

## Funktionen

- **Bibliothek:** Spiele inkl. Limited/Collector's Editions, Steelbooks und Bundles. Felder für Cover, Plattform, Publisher, Entwickler, Jahr, Genre, Reihe, USK (in Originalfarben), Zustand (Sealed, CIB, OVP, Lose, Digital, Beschädigt), Barcode, Kaufpreis und Kaufdatum.
- **Spielstand:** Status Ungespielt, Am Spielen, Pausiert, Erledigt oder Abgebrochen, dazu Fortschritt in Prozent und Spielzeit.
- **Ansichten:** Raster oder Liste. Sortieren und Gruppieren nach Plattform, Hersteller, Publisher, Entwickler, Genre, Reihe, Jahr, Status oder Zustand. Plattform-Filter in der Seitenleiste, Suche über alle Felder.
- **Konsolen:** Wartungsprotokoll (Ausblasen, Isopropyl, Lüfter, Wärmeleitpaste/Pads, Kontakte, Reparatur) mit Erinnerungsintervall. Fällige Wartungen werden markiert.
- **Inventar & QR-Etiketten:** Inventarnummern werden automatisch vergeben, z. B. `SP-0001` und `KO-0001`. Etiketten im Format 60 × 30 mm mit QR-Code (`spielregal://item/SP-0001?id=…`) lassen sich drucken oder als PDF speichern, wahlweise einzeln oder als A4-Bogen 3 × 8.
- **Wunschliste:** Priorität, Erscheinungsdatum, Zielpreis und Shop-Link. Mit *Gekauft* übernimmst du einen Eintrag samt Inventarnummer in die Sammlung.
- **Online-Daten (IGDB):** Beim Anlegen von Spielen, Konsolen und Wünschen erscheinen Vorschläge schon beim Tippen. Ein Klick übernimmt Cover, Publisher, Entwickler, Jahr, Genre, Reihe und USK. Bereits ausgefüllte Felder bleiben unverändert. Für vorhandene Spiele gibt es „Infos online ergänzen“ in der rechten Leiste.
- **Release-Kalender:** Kommende Spiele, DLCs und Editionen für die gewählten Plattformen, plus eigene Termine aus der Wunschliste. Mit einem Klick landet ein Eintrag samt Cover auf der Wunschliste.
- **Übersicht:** Kennzahlen, aktuelle Spiele, Wartungsstatus, kommende Termine und Verteilung nach Plattform.
- **Sicherung:** Export und Import als JSON inklusive Cover (Einstellungen → Daten).

**Tastenkürzel:** ⌘/Strg+N neuer Eintrag · ⌘/Strg+F Suche · ⌘/Strg+1–6 Ansichten · Entf löschen · ⌘/Strg+Enter im Dialog sichern

**Daten** liegen hier:
- Mac: `~/Library/Application Support/Spielregal`
- Windows: `%APPDATA%\Spielregal`

Bei jedem Speichern bleibt die vorherige Version als `.bak` erhalten.

## Online-Daten einrichten (einmalig)

1. Auf <https://dev.twitch.tv/console/apps> mit einem Twitch-Konto anmelden. Die Zwei-Faktor-Authentifizierung muss dort aktiv sein.
2. *Register Your Application* klicken und eintragen:
   - Name: frei wählbar, aber eindeutig
   - OAuth Redirect URL: `http://localhost`
   - Kategorie: *Application Integration*
   - Client-Typ: *Confidential*
3. Unter *Manage* die Client-ID kopieren und mit *New Secret* ein Secret erzeugen.
4. In Spielregal unter *Einstellungen → Online-Daten* beides eintragen und *Speichern & testen* klicken.

Die Zugangsdaten liegen nur lokal (`igdb.json` im Datenordner) und sind nicht Teil der Sicherung.

## Nächste Etappe

- Marktwert der Sammlung über die PriceCharting-API (kostenpflichtig)
- Barcode-Scan
