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
- **Physisch / Digital:** Jedes Spiel ist physisch (mit Zustand, Inventar-Nr. und Etikett) oder digital (mit Store, z. B. PlayStation Store, Steam, Game Pass). In der Bibliothek lässt sich danach filtern.
- **Zubehör & Extras:** Controller, Headsets, VR, amiibo, Figuren, Steelbooks, Artbooks, Soundtracks, Merch. Jeweils mit Zustand, Wert, Inventar-Nr. (`ZB-0001`), Etikett und optionaler Verknüpfung zu einem Spiel.
- **Checklisten:** Eigene Punkte oder Vorlagen pro Spiel, auf Wunsch mit „Fortschritt aus Liste“. Trophäen und Erfolge lassen sich als Checkliste übernehmen. Mit „Von Webseite“ wird eine Liste von einer Guide- oder Wiki-Seite importiert (Überschriften werden Gruppen, Listen und Tabellenzeilen werden Punkte), alternativ aus eingefügtem Text.
- **Guides für 100 %:** Direktlinks zu PowerPyx, PSNProfiles bzw. TrueAchievements, Exophase, YouTube und einer Sammelobjekt-Suche.
- **PlayStation & Xbox:** Trophäen bzw. Erfolge, Fortschritt, Spielzeit und „zuletzt gespielt“ werden automatisch dem passenden Spiel zugeordnet – beim Start (höchstens alle 6 Stunden), beim Anlegen eines Spiels und über „Jetzt abgleichen“. Titel aus dem Konto, die noch fehlen, landen automatisch in der Bibliothek (abschaltbar unter Einstellungen → Konten). Eine falsche Zuordnung löst du per Rechtsklick → „Trophäen-Verknüpfung lösen“.
- **Detailansicht:** Die Bereiche (Details, Spielstand, Trophäen, Checkliste, Wert, Guides, Notizen, Etikett) lassen sich am Griff verschieben und einklappen – getrennt für Spiele, Konsolen und Zubehör. Zurücksetzen unter Einstellungen → Allgemein.
- **Erscheinungsdatum:** Das genaue Datum wird gespeichert; Karten und Listen zeigen nur das Jahr, die Detailansicht das ganze Datum.
- **Sammlungswert:** Aktueller Wert pro Eintrag, manuell oder über „Wert über eBay schätzen“. Die Übersicht zeigt den Gesamtwert und den Vergleich zum Kaufpreis.
- **Preisvergleich:** Links zu idealo, Amazon, eBay (inkl. verkaufter Angebote), Kleinanzeigen und PriceCharting, optional mit eigenem Partner-Tag.
- **Übersicht:** Kennzahlen, Sammlungswert, aktuelle Spiele, Wartungsstatus, kommende Termine und Verteilung nach Plattform.
- **Sicherung:** Export und Import als JSON inklusive Cover (Einstellungen → Daten).

**Tastenkürzel:** ⌘/Strg+N neuer Eintrag · ⌘/Strg+F Suche · ⌘/Strg+1–7 Ansichten · Entf löschen · ⌘/Strg+Enter im Dialog sichern

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

## Konten & Preise einrichten (optional)

Alles findest du unter *Einstellungen*. Zu jedem Reiter gibt es dort eine Kurzanleitung.

- **PlayStation (Reiter „Konten“):**
  1. Auf playstation.com anmelden.
  2. Im selben Browser `https://ca.account.sony.com/api/v1/ssocookie` öffnen.
  3. Den 64-stelligen `npsso`-Code kopieren und eintragen.
  - Die Schnittstelle ist inoffiziell, die Verbindung hält etwa 2 Monate.
- **Xbox (Reiter „Konten“):** Auf xbl.io mit dem Microsoft-Konto anmelden, dort einen API-Schlüssel erstellen und eintragen. Kostenlos, bis zu 150 Abrufe pro Stunde.
- **Nintendo:** Es gibt keine Trophäen und keine Schnittstelle. Den Fortschritt pflegst du über Checklisten.
- **eBay (Reiter „Preise“):** Auf developer.ebay.com registrieren und ein Production-Keyset anlegen. App ID und Cert ID eintragen.

Alle Zugangsdaten liegen nur lokal im Datenordner (`psn.json`, `xbox.json`, `ebay.json`, `igdb.json`) und sind nicht Teil der Sicherung.

## Geplant

- Barcode-Scan
- Handy-App (QR-Etiketten scannen)
- How-to-Guides und Community-Bereich (zurückgestellt)
