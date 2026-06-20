# PhysioFlow TODO

**Stand: 08.06.2026**

## 🔴 Kritische Bugs

- [x] ~~Session-Cookie über HTTP blockiert~~ → Fixed
- [x] ~~SPA-Fallback matcht /api/ Routes~~ → Fixed
- [x] ~~HSTS preload zwang HTTPS-Upgrade~~ → Fixed
- [x] ~~Umsatz-Berechnung verwendet created_at statt paid_at~~ → Fixed mit `paid_at`-Migration und Dashboard-Abfragen über Zahlungsdatum
- [x] ~~Impressum/Datenschutz-Seiten leer~~ → Fixed

## 🟡 Mittlere Bugs / Verbesserungen

- [x] ~~Singular/Plural "1 Honorarnoten"~~ → Fixed
- [x] ~~CSP upgrade-insecure-requests~~ → Fixed
- [x] ~~Backup-Dateien aufräumen~~ → Fixed; keine `*.bak`-Dateien mehr im Repo
- [x] ~~Missing DB-Indexes laut Code Review~~ → Fixed mit `appointments(status)`, `audit_logs(timestamp)`, `audit_logs(action)`
- [ ] **API-Response-Formate inkonsistent** — Manche Routes geben { data }, andere { message }, andere { data, pagination }
- [x] ~~Kein Frontend-Pagination~~ → Fixed für Patienten und Honorarnoten
- [x] ~~Voucher patient_name immer null~~ → Fixed mit Patient:innen-JOIN in Voucher-Routen
- [x] ~~npm audit: high/critical Advisories~~ → Fixed via Lockfile-Refresh; nur ein Low-Severity dev-server Advisory für Windows bleibt

## 🟢 Features (laut SPEC.md)

- [ ] **Drag and Drop für Termine** — SPEC definiert, nicht implementiert
- [ ] **Online-Terminbuchung** — TODO.md offen, kein Code vorhanden
- [ ] **SMS-Reminder automatisieren** — smsScheduler.ts existiert aber kein Cron-Job
- [ ] **.env.example aktualisieren** — Fehlt laut Code Review
- [ ] **Beleg-Foto für Ausgaben** — Low Priority in SPEC
- [ ] **Export für Steuerberater** — Low Priority in SPEC

## ✅ Erledigt (08.06.2026)

- Security Hardening: CSP/HSTS/SPA-Fallback/Timing-safe Login
- Demo-Daten: 8 Patienten, 26 Termine, 7 Honorarnoten, 9 Ausgaben, 4 Therapeuten, 3 Gutscheine
- HTTPS via Caddy funktioniert, Session-Cookies korrekt

*Letztes Update: 08.06.2026*