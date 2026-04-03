# PhysioFlow - Spezifikation

## 1. Konzept & Vision

**PhysioFlow** ist eine schlanke, locally-first Web-App für Physiotherapeuten zur Terminverwaltung mit integriertem SMS-Reminder-System und österreichkonformer Honorarnoten-Erstellung. 

Die App fühlt sich an wie ein professionelles Instrument – präzise, zuverlässig und respektvoll gegenüber der Zeit des Therapeuten. Kein Overengineering, keine Ablenkungen. Was zählt: der Patient vor einem und die Klarheit über das Honorar.

## 2. Design Language

### Ästhetik
Medizinisch-professionell mit skandinavischer Wärme. Wenig ablenkende Elemente, Fokus auf Lesbarkeit und Schnelligkeit.

### Farbpalette
- **Primary**: `#2563EB` (Vertrauenswürdiges Blau)
- **Secondary**: `#059669` (Beruhigendes Grün für Erfolg/Aktion)
- **Accent**: `#F59E0B` (Warmes Amber für Highlights/Warnungen)
- **Background**: `#F8FAFC` (Sehr helles Grau)
- **Surface**: `#FFFFFF` (Reines Weiß für Karten)
- **Text Primary**: `#1E293B` (Dunkles Slate)
- **Text Secondary**: `#64748B` (Mittleres Grau)
- **Error**: `#DC2626` (Klareres Rot)

### Typografie
- **Headings**: Inter (Google Fonts), Bold/Semibold
- **Body**: Inter, Regular
- **Monospace**: JetBrains Mono (für Zahlen/Codes)
- **Fallback**: system-ui, -apple-system, sans-serif

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Border radius: 8px (Karten), 6px (Buttons), 4px (Inputs)
- Shadows: Subtle (0 1px 3px rgba(0,0,0,0.1))

### Motion Philosophy
- Schnell und zielführend: 150-200ms für UI-Feedback
- Sanfte Übergänge für Panel-Wechsel: 250ms ease-out
- Keine dekorativen Animationen – die App soll nicht ablenken

## 3. Layout & Struktur

### Seitenaufbau
```
┌─────────────────────────────────────────────────┐
│  Header: Logo + Nav (Termine | Patienten | ...)  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Main Content Area                              │
│  (je nach aktiver Ansicht)                      │
│                                                 │
├─────────────────────────────────────────────────┤
│  Footer: Status + Quick Actions                │
└─────────────────────────────────────────────────┘
```

### Views
1. **Dashboard** – Übersicht des Tages, nächste Termine, offene Noten
2. **Kalender** – Tages/Wochen/Monatsansicht der Termine
3. **Patienten** – Patientenliste mit Suchfilter
4. **Termin erstellen** – Modal/Overlay für neuen Termin
5. **Honorarnote** – Rechnungsstellung mit Vorschau

### Responsive Strategy
- Mobile-first für Kalender unterwegs
- Desktop-optimiert für den Praxisalltag
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

## 4. Features & Interactions

### 4.1 Terminverwaltung
- **Erstellen**: Klick auf freien Slot oder "+ Termin" Button
- **Felder**: Patient (Dropdown), Datum, Uhrzeit (von-bis), Behandlungsart, Notiz
- **Bearbeiten**: Klick auf Termin → Slide-out Panel
- **Löschen**: Bestätigungsdialog mit "Sind Sie sicher?"
- **Farbcodierung**: Nach Behandlungsart oder Status

### 4.2 SMS-Reminder
- **Automatisierung**: 24h vor Termin (konfigurierbar)
- **Personalisierung**: "Hallo [Vorname], wir sehen uns morgen um [Zeit] in der Praxis."
- **Manueller Versand**: Button neben jedem Termin
- **Status-Tracking**: Gesendet/Bevorstehend/Fehlgeschlagen
- **Provider**: SMS77.de (oder Twilio als Alternative)

### 4.3 Patientenverwaltung
- **Felder**: Vorname, Nachname, Telefon, E-Mail, Geburtsdatum, Notizen
- **Suche**: Live-Filter in der Patientenliste
- **Verknüpfung**: Automatisch alle Termine eines Patienten sichtbar

### 4.4 Honorarnoten-Rechner
- **Eingaben**: 
  - Anzahl der Einheiten (Behandlungsminuten/Sätze)
  - Satz pro Einheit (€)
  - Leistungsbeschreibung (Freitext)
  - Patientendaten (automatisch aus Auswahl)
- **Berechnung**: Einheiten × Satz = Gesamtbetrag
- **Output**: 
  - Druckbare PDF-Vorschau
  - QR-Code für österreichische Registrierkasse (RKS-Format)
  - Rechnungsnummer (automatisch: RF-YYYYMMDD-XXX)
- **Speicherung**: Alle Noten lokal in SQLite

### 4.5 Dashboard
- Heutige Termine auf einen Blick
- Liste der unbezahlten Honorarnoten
- SMS-Versand-Status des Tages
- Schnellaktion: Neuer Termin, Neue Notiz

### 4.6 Ausgabenverwaltung
- **Erstellen**: Kategorie, Betrag, Datum, optional Beschreibung
- **Kategorien**: Miete, Strom, Heizung, Versicherung, Reinigung, Fortbildung, Material, Bürobedarf, Telefon/Internet, Steuern, Abgaben, Sonstiges
- **Filter**: Nach Kategorie filterbar
- **Statistiken**: Gesamt (alle Zeit), Dieser Monat, Anzahl Einträge
- **Bearbeiten/Löschen**: Direkt in der Tabelle
- **Beleg-Foto**: Optional (🟡 low priority)
- **Wiederkehrende Ausgaben**: ❌ (low priority)
- **Export für Steuerberater**: ❌ (low priority)

## 5. Component Inventory

### Button
- **Primary**: Blau gefüllt, weiße Schrift, Hover: dunkler
- **Secondary**: Weiß mit blauem Border, Hover: hellblau gefüllt
- **Danger**: Rot für Löschen/Abbruch
- **States**: Default, Hover, Active (scale 0.98), Disabled (opacity 0.5), Loading (Spinner)

### Input Field
- Border: 1px solid #E2E8F0
- Focus: 2px solid #2563EB, Ring-Effekt
- Error: Border + Text rot, Hilfetext darunter
- Label immer oben, Placeholder in Grau

### Card
- Weißer Hintergrund, Border-radius 8px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Padding: 16px oder 24px je nach Inhalt

### Modal/Overlay
- Backdrop: rgba(0,0,0,0.5)
- Modal: Weiß, max-width 500px, zentriert
- Animation: Fade in + Scale von 0.95 → 1

### Calendar Slot
- Freier Slot: Gestrichelter Border, Hover zeigt "+"
- Gebuchter Slot: Gefüllte Karte mit Patientennamen + Zeit
- Heute: Leichter gelber Hintergrund

### Toast Notification
- Oben rechts positioniert
- Success: Grün, Error: Rot, Info: Blau
- Auto-dismiss nach 4s, manuell schließbar

### Table (Patientenliste)
- Zebra-Striping optional
- Hover: Leichter Hintergrund
- Sortierbare Spalten mit Pfeil-Icon

## 6. Technische Architektur

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS (einfach zu anpassen)
- **State**: Zustand (leichtgewichtig)
- **Backend**: Node.js + Express
- **Datenbank**: SQLite (better-sqlite3) – portabel und serverlos
- **PDF-Generation**: PDFKit oder @react-pdf/renderer
- **QR-Code**: qrcode (npm package)
- **SMS**: SMS77.de API (einfach, günstig, deutschsprachiger Support)

### Projektstruktur
```
physioflow/
├── SPEC.md
├── README.md
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── ui/           # Basis-Komponenten (Button, Input, Card, Modal)
│   │   ├── calendar/     # Kalender-spezifisch
│   │   ├── patients/     # Patienten-Verwaltung
│   │   ├── appointments/ # Termin-spezifisch
│   │   └── invoices/     # Honorarnoten
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Patients.tsx
│   │   ├── Invoices.tsx
│   │   └── Expenses.tsx
│   ├── hooks/            # Custom Hooks
│   ├── store/            # Zustand Store
│   ├── lib/              # Utilities, API-Client
│   │   ├── db.ts         # SQLite Verbindung
│   │   ├── sms.ts        # SMS-Provider
│   │   └── qr.ts         # QR-Code Generator
│   └── types/            # TypeScript Interfaces
├── server/
│   ├── index.ts          # Express Server
│   ├── routes/
│   │   ├── patients.ts
│   │   ├── appointments.ts
│   │   ├── invoices.ts
│   │   ├── expenses.ts
│   │   └── sms.ts
│   ├── db/
│   │   └── schema.sql    # SQLite Schema
│   └── services/
│       ├── sms.ts
│       └── pdf.ts
└── data/                 # SQLite DB Datei (lokal)
    └── physioflow.db
```

### Datenmodell (SQLite)

**patients**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-Increment |
| first_name | TEXT | Vorname |
| last_name | TEXT | Nachname |
| phone | TEXT | Telefonnummer |
| email | TEXT | E-Mail |
| birthdate | TEXT | Geburtsdatum (YYYY-MM-DD) |
| notes | TEXT | Notizen |
| created_at | TEXT | Timestamp |

**appointments**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-Increment |
| patient_id | INTEGER FK | Verweis auf Patient |
| date | TEXT | Datum (YYYY-MM-DD) |
| time_start | TEXT | Startzeit (HH:MM) |
| time_end | TEXT | Endzeit (HH:MM) |
| treatment_type | TEXT | Behandlungsart |
| notes | TEXT | Notizen |
| sms_reminder | INTEGER | 0=kein SMS, 1=SMS gesendet, 2=geplant |
| created_at | TEXT | Timestamp |

**invoices**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-Increment |
| invoice_number | TEXT | RF-YYYYMMDD-XXX |
| patient_id | INTEGER FK | Verweis auf Patient |
| appointment_id | INTEGER FK | Zugehöriger Termin |
| units | REAL | Anzahl Einheiten |
| rate_per_unit | REAL | Satz pro Einheit (€) |
| total | REAL | Gesamtbetrag |
| description | TEXT | Leistungsbeschreibung |
| created_at | TEXT | Timestamp |
| paid | INTEGER | 0=offen, 1=bezahlt |

**expenses**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-Increment |
| category | TEXT | Kategorie (Miete, Strom, ...) |
| description | TEXT | Optionale Beschreibung |
| amount | REAL | Betrag in € |
| date | TEXT | Datum (YYYY-MM-DD) |
| receipt_path | TEXT | Pfad zum Beleg-Foto (optional) |
| created_at | TEXT | Timestamp |

### API Endpoints

**Patients**
- `GET /api/patients` – Alle Patienten
- `POST /api/patients` – Neuer Patient
- `PUT /api/patients/:id` – Patient aktualisieren
- `DELETE /api/patients/:id` – Patient löschen

**Appointments**
- `GET /api/appointments` – Alle Termine (Filter: date, patient_id)
- `POST /api/appointments` – Neuer Termin
- `PUT /api/appointments/:id` – Termin aktualisieren
- `DELETE /api/appointments/:id` – Termin löschen

**Invoices**
- `GET /api/invoices` – Alle Honorarnoten
- `POST /api/invoices` – Neue Notiz erstellen
- `GET /api/invoices/:id/pdf` – PDF generieren
- `PUT /api/invoices/:id/paid` – Als bezahlt markieren

**SMS**
- `POST /api/sms/send` – SMS senden
- `POST /api/sms/schedule` – Erinnerung planen

**Expenses (Ausgaben)**
- `GET /api/expenses` – Alle Ausgaben (Filter: category, from, to, limit)
- `POST /api/expenses` – Neue Ausgabe
- `PUT /api/expenses/:id` – Ausgabe aktualisieren
- `DELETE /api/expenses/:id` – Ausgabe löschen
- `GET /api/expenses/categories` – Alle Kategorien

## 8. Deinstallation & Umzug

Das Projekt ist vollständig lokal in `/data/physioflow.db` gespeichert. 

**Umzug auf neuen Server:**
1. Projekt-Dateien kopieren
2. `npm install` ausführen
3. SQLite-DB in denselben Pfad kopieren
4. `.env` mit neuen API-Keys anpassen
5. Fertig – keine weitere Konfiguration nötig

**Alternative: Docker**
```bash
docker build -t physioflow .
docker run -p 3000:3000 -v ./data:/app/data physioflow
```
