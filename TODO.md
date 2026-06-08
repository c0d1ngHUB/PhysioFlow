# PhysioFlow TODO

**Stand: 08.06.2026**

## 🔴 Kritische Bugs

- [x] ~~Session-Cookie über HTTP blockiert~~ → Fixed
- [x] ~~SPA-Fallback matcht /api/ Routes~~ → Fixed
- [x] ~~HSTS preload zwang HTTPS-Upgrade~~ → Fixed
- [ ] **Umsatz-Berechnung verwendet created_at statt paid_at** — Dashboard zeigt "Noch kein Umsatz" für Juni obwohl Rechnungen bezahlt wurden (nur im Mai erstellt). Fehlt: paid_at-Spalte in invoices-Tabelle
- [ ] **Impressum/Datenschutz-Seiten leer** — Links vorhanden aber kein Inhalt. Rechtlich erforderlich (Österreich: ECG §5)

## 🟡 Mittlere Bugs / Verbesserungen

- [x] ~~Singular/Plural "1 Honorarnoten"~~ → Fixed
- [x] ~~CSP upgrade-insecure-requests~~ → Fixed
- [ ] **Backup-Dateien aufräumen** — patients.ts.bak und index.ts.bak im Repo
- [ ] **Missing DB-Indexes laut Code Review** — appointments(status), audit_logs(timestamp), audit_logs(action)
- [ ] **API-Response-Formate inkonsistent** — Manche Routes geben { data }, andere { message }, andere { data, pagination }
- [ ] **Kein Frontend-Pagination** — API unterstützt es, Frontend nutzt es nicht
- [ ] **Voucher patient_name immer null** — patient_id ist gesetzt aber JOIN fehlt in vouchers-Route

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