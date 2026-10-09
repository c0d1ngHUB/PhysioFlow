# PhysioFlow Status

Repository documentation reviewed: 2026-10-03 (deployment not revalidated)

## Snapshot

PhysioFlow is a local-first web app for Austrian physiotherapy practice administration. It covers appointment/patient/invoice/expense workflows and runs in Markus' homelab environment.

## Current components

| Component | Status |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | Express + TypeScript |
| Database | SQLite (`better-sqlite3`) |
| Deployment | `https://physio-flow.online`, Mini local service around port `3001` |
| SMS | Optional provider key; simulated without API key |

## Hygiene notes

- Runtime DB files, `.env`, logs and backups must stay out of Git.
- Screenshots are kept as intentional UI reference artifacts.
- Public GitHub metadata should make clear that this is a private/homelab prototype, not certified medical software.

## Recommended next work

1. Keep README aligned with deployed features.
2. Review the runtime and API guidance in [README](../README.md) when configuration changes.
3. Keep the existing [CI workflow](../.github/workflows/ci.yml) on `master` passing (`npm ci`, `npm run check:react-runtime`, `npm run typecheck`, `npm run build`).
