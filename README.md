# PhysioFlow 🩺

> **Status:** MVP+ in Betrieb ✅  
> **Erstellt:** 2026-03-23  
> **Letzte Änderung:** 2026-04-09

Terminmanagement für Physiotherapeuten mit SMS-Reminder und österreichkonformen Honorarnoten.

## Features

- ✅ **Terminkalender** - Tages-/Wochen-/Monatsansicht mit Terminverwaltung
- ✅ **Patientenverwaltung** - Stammdaten, Historie, Archivierung und Versicherungsnummer
- ✅ **Behandlungsdokumentation** - Notizen, Leistungen und Folgetermin direkt am Termin
- ✅ **Honorarnoten-Rechner** - Österreichkonform mit PDF-Export
- ✅ **Dashboard** - Übersicht über Termine, Umsatz und offene Rechnungen
- ✅ **Ausgabenverwaltung** - Kategorien, Summen und Filter
- ✅ **Optionale Login-Absicherung** - per Admin-Login aktivierbar
- ✅ **Toast- & Dialog-UX** - Browser-`alert()`/`confirm()` in den Kernseiten ersetzt

| Feature | Status |
|---------|--------|
| Terminkalender (Tag/Woche/Monat) | ✅ |
| Patientenverwaltung (CRUD + Historie + Archiv) | ✅ |
| Behandlungsdokumentation | ✅ |
| SMS-Reminder-System | ✅ (simuliert) |
| Honorarnoten / PDF-Export | ✅ |
| Dashboard mit Statistiken | ✅ |
| Ausgabenverwaltung | ✅ |
| Optionale Login-Absicherung | ✅ |
| Österreichische Steuerbefreiung (§6 UStG) | ✅ |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Datenbank**: SQLite (better-sqlite3)
- **PDF-Generation**: PDFKit + QRCode

## Live Deployment

| Resource | URL / Pfad |
|----------|------------|
| **Live URL** | https://physio-flow.online |
| **API Health** | https://physio-flow.online/api/health |
| **Projekt lokal** | `/home/m3kky/Projects/Physio-Flow` |
| **Deploy-Script** | `scripts/deploy-beelink.sh` |
| **PM2 Config** | `ecosystem.config.cjs` |
| **Dev Server** | http://localhost:5173 |

## Quick Start

### 1. Installation

```bash
cd /home/m3kky/Projects/Physio-Flow
npm install
```

### 2. Datenbank initialisieren

Die SQLite-Datenbank wird automatisch beim ersten Start erstellt unter `data/physioflow.db`.

### 3. Development Server starten

```bash
npm start
```

Dies startet (via `concurrently`):
- Frontend auf http://localhost:5173 (Vite)
- Backend auf http://localhost:3001 (Express/tsx)

**Oder einzeln:**
```bash
npm run dev          # Nur Frontend
npx tsx server/index.ts  # Nur Backend
```

### 4. Öffnen

Browser: http://localhost:5173

## Datenschutz / DSGVO-Basis

PhysioFlow enthält eine erste technische DSGVO-Basis:

- **Datenschutzerklärung** als eigene Seite
- **Impressum** als eigene Seite
- Verlinkung aus Login-Ansicht und App-Footer
- Session-Cookie wird als technisch notwendiger Cookie eingeordnet und in der Datenschutzerklärung erläutert
- **Patientenarchivierung** statt nur sofortigem Löschen
- **Patientenexport (JSON)** mit Stammdaten, Terminen, Honorarnoten und Behandlungsdokumentation

**Wichtig:**
- Die eingebauten Texte sind bewusst als **technische Vorlage** gedacht
- Verantwortlicher, Kontaktdaten, Drittanbieter und rechtliche Details müssen vor Live-Betrieb vervollständigt werden
- Die technische Umsetzung ersetzt **keine juristische Prüfung**

Empfohlene nächste Datenschutz-Schritte:
- einfaches Audit-Log
- dokumentierte Auftragsverarbeiter / Drittanbieter

## Auth / Login

PhysioFlow kann offen betrieben oder per Login geschützt werden.

### Offener Modus

Wenn **kein** `PHYSIOFLOW_ADMIN_PASSWORD` gesetzt ist, läuft die App ohne Login.

### Geschützter Modus

Wenn `PHYSIOFLOW_ADMIN_PASSWORD` gesetzt ist, werden die API-Routen geschützt und das Frontend zeigt automatisch einen Login-Screen.

Benötigte Variablen in `.env`:

```env
PHYSIOFLOW_ADMIN_USER=admin
PHYSIOFLOW_ADMIN_PASSWORD=dein-sicheres-passwort
SESSION_SECRET=ein-langes-zufälliges-geheimnis
```

**Wichtig:**
- In Produktion kein Default-Passwort verwenden
- `SESSION_SECRET` immer individuell und lang setzen
- Das Deploy-Script blockiert absichtlich, wenn noch Platzhalter-Secrets gesetzt sind

## SMS konfigurieren (optional)

Für echte SMS-Benachrichtigungen:

1. Account bei [SMS77.de](https://www.sms77.de/) erstellen
2. API-Key in `.env` eintragen:
   ```
   SMS77_API_KEY=your_api_key_here
   ```
3. Server neustarten

**Ohne API-Key** werden SMS nur simuliert (Logs in der Konsole).

## Demo-Daten

- **5 Patienten:** Maria Schmidt, Max Müller, Anna Weber, Thomas Gruber, Lisa Huber
- **7 Termine:** Heute, morgen, übermorgen
- **4 Honorarnoten:** 2 bezahlt, 2 offen (€940 ausstehend)

## Projekt-Struktur

```
PhysioFlow/
├── src/                    # React Frontend
│   ├── components/        # UI Komponenten
│   ├── pages/             # Seiten (Dashboard, Calendar, Patients, Invoices)
│   ├── types/            # TypeScript Interfaces
│   └── lib/              # Utilities
├── server/                # Express Backend
│   ├── routes/           # API Routes
│   ├── db/               # SQLite Schema & Connection
│   └── services/         # Business Logic (SMS, PDF)
├── data/                  # SQLite Datenbank
│   └── physioflow.db
└── SPEC.md               # Vollständige Spezifikation
```

## Deployment auf Beelink / neuen Server

### Standard-Deploy

```bash
cd /home/m3kky/Projects/Physio-Flow
./scripts/deploy-beelink.sh
```

Das Script macht dabei:
1. lokalen Preflight-Check
2. lokalen Build-Test
3. Remote-App- und DB-Backup
4. `rsync` auf den Zielhost
5. `npm ci`
6. `npm rebuild better-sqlite3`
7. `npm run build`
8. PM2-Restart + HTTP-Smoke-Test

### Voraussetzungen

- SSH-Key für den Zielhost vorhanden
- `.env` lokal korrekt gepflegt
- keine Platzhalter-Secrets in `.env`
- `package-lock.json` aktuell

### Wichtige Deploy-Learnings

- `node_modules` niemals zwischen unterschiedlichen Maschinen kopieren
- native Module wie `better-sqlite3` immer **auf dem Zielsystem** rebuilden
- der Backend-Port ist in Produktion lokal gebunden; externer Zugriff läuft über Reverse Proxy / OPNsense

### Rollback

Das Deploy-Script legt pro Lauf Backup-Pfade an und zeigt sie bei Fehlern direkt an.

## Verifiziert am 2026-04-09

- `npm run build` läuft lokal erfolgreich durch
- Die verbleibenden `alert()`-/`confirm()`-Flows in `Calendar`, `Patients`, `Invoices` und `Expenses` wurden auf Toasts bzw. UI-Dialoge umgestellt
- Ein echter Browser-Smoke-Test konnte in dieser Sandbox nicht durchgeführt werden
- Ein lokaler Server-Smoke-Test über `npm run server` war in dieser Sandbox blockiert (`tsx` scheitert hier an einem IPC-Pipe-`EPERM`)

## Nächste Schritte (Phase 2)

- [ ] Mahnwesen
- [ ] Gutscheine
- [ ] Kalender-Sync (iCal)
- [ ] Gruppenkalender (Multi-Therapeuten)
- [ ] Online-Terminbuchung
- [ ] Auth-UX weiter verfeinern
- [ ] Echten Browser-Smoke-Test außerhalb der Sandbox durchführen
- [ ] Produktiven Runtime-Smoke-Test außerhalb der Sandbox durchführen

## Dokumentation

| Dokument | Pfad |
|----------|------|
| README | Dieses Dokument |
| Spezifikation | `SPEC.md` |
| Lastenheft | `LASTENHEFT.md` / `.pdf` |
| Technisch | Im Projekt-Ordner |

## Lizenz

Privatnutzung – © 2026
