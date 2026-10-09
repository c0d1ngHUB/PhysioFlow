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
npm ci
cp .env.example .env
npm run db:migrate
# Replace the example password before creating the first account.
npx tsx server/db/seed-admin.ts admin YOUR_LOCAL_PASSWORD admin
npm start
```

Use Node.js 22 (as in [CI](.github/workflows/ci.yml)); native SQLite/bcrypt dependencies may need a compiler toolchain if prebuilt binaries are unavailable. Run commands from the repository root. The migration command creates `data/physioflow.db` and the schema before the seed command writes a bcrypt-backed admin account. The seed command also updates an existing username, so use it deliberately; it prints the resulting hash and accepts the password as a command-line argument.

`npm start` starts the development frontend and backend. Log in with the seeded username/password. Server startup also applies pending migrations; it does not create a default user.

Useful scripts:

```bash
npm run dev                  # Vite frontend
npm run server               # Express backend via tsx
npm run check:react-runtime  # React/ReactDOM production import guard
npm run typecheck            # frontend + server TypeScript checks
npm run build                # production frontend build
```

Local URLs:

```text
Frontend dev: http://localhost:5173
Backend/API:   http://localhost:3001
```

## Runtime configuration

Copy `.env.example` to `.env` and set deployment-specific values there. Never commit real secrets.

| Variable | Behavior |
|---|---|
| `PORT` | Express port, default `3001`; the Vite proxy targets port `3001` independently. |
| `SESSION_SECRET` | Required in production; replace the example with a long random secret. Development falls back to `dev-secret` if unset. |
| `PHYSIOFLOW_ORIGIN` | Exact production origin allowed by CORS/CSRF; defaults to `https://physio-flow.online`. Development uses fixed localhost/127.0.0.1 origins. |
| `SMS77_API_KEY` | Optional SMS provider key. |
| `NODE_ENV` | Set to `production` in the runtime environment, not the Vite `.env` file. |

Authentication reads bcrypt hashes from the SQLite `users` table. `PHYSIOFLOW_PASSWORD` is not read by the current server; use the admin seed script to create or update credentials.

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

For a production build, run `npm run check:react-runtime`, `npm run typecheck` and `npm run build`, then start the backend with `NODE_ENV=production npm run server`. Express serves `dist/` and `/api` on the same port. Configure `SESSION_SECRET` and `PHYSIOFLOW_ORIGIN` first; production sessions use secure cookies and require HTTPS. The server trusts one proxy hop, so match the reverse-proxy topology to that setting.

[ecosystem.config.cjs](ecosystem.config.cjs) is a host-specific PM2 example with `/home/pi/PhysioFlow` paths, not a portable installer. Adapt those paths before use. The database and SQLite session store live in `data/physioflow.db`; backup/restore must account for SQLite WAL consistency. Keep host-specific secrets, database files, runtime backups and logs outside Git.

The public deployment URL is a documented host configuration, not a live availability check.

## Validation and API flow

```bash
npm run check:react-runtime
npm run typecheck
npm run build
```

These are the existing CI checks on `master`; there is no `npm test` script. `check:react-runtime` verifies exact React/ReactDOM version alignment and imports the client and server runtime entry points in production mode. `build` checks frontend TypeScript and emits `dist/`; `typecheck` also covers the server. These checks do not establish browser or deployment acceptance.

The Vite development server proxies `/api` to Express. After login, clients keep the session cookie and send the returned CSRF token as `x-csrf-token` for mutations; a permitted `Origin` is also required. API data routes require authentication, and voucher routes require the admin role. See [server/index.ts](server/index.ts) and [server/utils/csrf.ts](server/utils/csrf.ts).

## Data hygiene policy

- Do not commit `.env`, SQLite DB files, WAL/SHM files, backups, logs or `node_modules`.
- Keep screenshots only when they are intentional UI references.
- Update this README and `docs/STATUS.md` when the deployed feature set changes.

## Documentation

| Document | Purpose |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | Current project status and hygiene notes |
| [SPEC.md](SPEC.md) | Product specification and UX goals |
| [TODO.md](TODO.md) | Open implementation/backlog notes |

## License / usage

Private prototype for Markus' environment unless relicensed explicitly.
