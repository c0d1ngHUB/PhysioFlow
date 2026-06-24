# PhysioFlow

PhysioFlow is a lightweight, local-first practice-management web app for Austrian physiotherapy workflows. It focuses on appointments, patients, invoices/Honorarnoten, expenses and pragmatic day-to-day practice administration.

## Current status

| Area | Status |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | Node.js/Express + TypeScript |
| Database | SQLite via `better-sqlite3` |
| Deployment | Runs on Markus' Mini at `physio-flow.online` / local port `3001` |
| Scope | Homelab/private practice-software prototype, not a certified medical product |

## Features

- Appointment calendar with practice-oriented views
- Patient management and search
- Invoice/Honorarnote generation with Austrian tax context
- PDF generation and QR code support
- Expenses tracking and dashboard cards
- Optional SMS reminder integration; simulated when no provider key is configured
- Responsive UI for desktop and mobile practice workflows

## Tech stack

- React + TypeScript + Vite
- TailwindCSS
- Express + TypeScript
- SQLite (`better-sqlite3`)
- PDFKit + QRCode

## Quickstart

```bash
npm install
cp .env.example .env
npm start
```

This starts the development frontend and backend through the configured scripts.

Useful scripts:

```bash
npm run dev          # Vite frontend
npm run server       # Express backend via tsx
npm run typecheck    # frontend + server TypeScript checks
npm run build        # production frontend build
```

Local URLs:

```text
Frontend dev: http://localhost:5173
Backend/API:   http://localhost:3001
```

## Runtime configuration

Copy `.env.example` to `.env` and set deployment-specific values there. Never commit real secrets.

Common values:

```dotenv
SESSION_SECRET=change-me
PHYSIOFLOW_PASSWORD=change-me
SMS77_API_KEY=
```

Without `SMS77_API_KEY`, SMS reminders are simulated/logged only.

## Repository layout

```text
src/          React frontend, pages, components and state
server/       Express API, SQLite migrations, services
public/       Static assets, manifest, legal pages
scripts/      Maintenance/cron helpers
screenshots/  UI reference screenshots
SPEC.md       Product/specification reference
TODO.md       Open work and backlog notes
```

## Deployment notes

The current homelab deployment is served from the Mini and publicly reachable as:

```text
https://physio-flow.online
```

Keep host-specific secrets, database files, runtime backups and logs outside Git.

## Data hygiene policy

- Do not commit `.env`, SQLite DB files, WAL/SHM files, backups, logs or `node_modules`.
- Keep screenshots only when they are intentional UI references.
- Update this README and `docs/STATUS.md` when the deployed feature set changes.

## Documentation

| Document | Purpose |
|---|---|
| `docs/STATUS.md` | Current project status and hygiene notes |
| `SPEC.md` | Product specification and UX goals |
| `TODO.md` | Open implementation/backlog notes |

## License / usage

Private prototype for Markus' environment unless relicensed explicitly.
