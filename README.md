# PhysioFlow 🩺

Terminmanagement für Physiotherapeuten mit SMS-Reminder und österreichkonformen Honorarnoten.

## Features

- ✅ **Terminkalender** - Tages-/Wochenansicht mit Drag & Drop
- ✅ **Patientenverwaltung** - Stammdaten mit Suchfunktion
- ✅ **SMS-Reminder** - Personalisierte Erinnerungen 24h vor Termin
- ✅ **Honorarnoten-Rechner** - Österreichkonform mit QR-Code für Registrierkasse
- ✅ **Dashboard** - Übersicht über Termine und offene Rechnungen

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Datenbank**: SQLite (better-sqlite3)
- **PDF-Generation**: PDFKit + QRCode

## Quick Start

### 1. Installation

```bash
cd /home/m3kky/PhysioFlow
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

## SMS konfigurieren (optional)

Für echte SMS-Benachrichtigungen:

1. Account bei [SMS77.de](https://www.sms77.de/) erstellen
2. API-Key in `.env` eintragen:
   ```
   SMS77_API_KEY=your_api_key_here
   ```
3. Server neustarten

**Ohne API-Key** werden SMS nur simuliert (Logs in der Konsole).

## Projekt-Struktur

```
PhysioFlow/
├── src/                    # React Frontend
│   ├── components/        # UI Komponenten
│   ├── pages/             # Seiten (Dashboard, Calendar, etc.)
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

## Lizenz

Privatnutzung – © 2026
