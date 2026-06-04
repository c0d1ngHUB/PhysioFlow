# PhysioFlow 🩺

> **Status:** MVP Fertig ✅  
> **Erstellt:** 2026-03-23  
> **Letzte Änderung:** 2026-03-23

Terminmanagement für Physiotherapeuten mit SMS-Reminder und österreichkonformen Honorarnoten.

## Features

- ✅ **Terminkalender** - Tages-/Wochen-/Monatsansicht mit Drag & Drop
- ✅ **Patientenverwaltung** - Stammdaten mit Suchfunktion
- ✅ **SMS-Reminder** - Personalisierte Erinnerungen 24h vor Termin
- ✅ **Honorarnoten-Rechner** - Österreichkonform mit QR-Code für Registrierkasse
- ✅ **Dashboard** - Übersicht über Termine und offene Rechnungen
- ✅ **PDF-Export** - Honorarnoten als druckfähiges PDF

| Feature | Status |
|---------|--------|
| Terminkalender (Tag/Woche/Monat) | ✅ |
| Patientenverwaltung (CRUD) | ✅ |
| SMS-Reminder-System | ✅ (simuliert) |
| Honorarnoten mit QR-Code | ✅ |
| PDF-Export | ✅ |
| Dashboard mit Statistiken | ✅ |
| Österreichische Steuerbefreiung (§6 UStG) | ✅ |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Datenbank**: SQLite (better-sqlite3)
- **PDF-Generation**: PDFKit + QRCode

## Live Deployment

| Resource | URL |
|----------|-----|
| **Live URL** | https://physio-flow.online (LAN + WAN) |
| **Refresh/Rebuild** | `/home/m3kky/refresh_physioflow.sh` |
| **Dev Server** | http://localhost:5173 (tests before build) |

## Quick Start

### 1. Installation

```bash
cd /home/m3kky/PhysioFlow
npm install
```

### 2. Environment konfigurieren

```bash
cp .env.example .env
```

Trage anschließend `SESSION_SECRET`, `PHYSIOFLOW_PASSWORD` und optional `SMS77_API_KEY` ein.
`NODE_ENV` gehört bewusst nicht in die Projekt-`.env`, weil Vite diese Datei beim Build liest. Setze `NODE_ENV=production` nur in der Runtime-Umgebung, z.B. in `/home/h3m3s/docker/physioflow/app.env`.

### 3. Datenbank initialisieren

Die SQLite-Datenbank wird automatisch beim ersten Start erstellt unter `data/physioflow.db`.

### 4. Development Server starten

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

### 5. Öffnen

Browser: http://localhost:5173

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

## Deployment auf neuen Server

1. Projekt-Dateien kopieren
2. `npm install` ausführen
3. `.env` mit neuen API-Keys anpassen
4. `npm start` starten

Keine weitere Konfiguration nötig – SQLite ist portabel! 🐳

## Nächste Schritte (Phase 2)

- [ ] Ausgabenverwaltung
- [ ] Mahnwesen
- [ ] Gutscheine
- [ ] Kalender-Sync (iCal)
- [ ] Gruppenkalender (Multi-Therapeuten)
- [ ] Online-Terminbuchung

## Dokumentation

| Dokument | Pfad |
|----------|------|
| README | Dieses Dokument |
| Spezifikation | `SPEC.md` |
| Lastenheft | `LASTENHEFT.md` / `.pdf` |
| Technisch | Im Projekt-Ordner |

## Lizenz

Privatnutzung – © 2026
