# Deep Research: Praxissoftware für Ärzt:innen in Österreich — Anforderungen 2026+

**Stand:** 21. Juni 2026  
**Ziel:** Ableitung fachlicher, rechtlicher und technischer Anforderungen für eine österreichische Praxis-/Ordinationssoftware, insbesondere für Wahlärzt:innen und niedergelassene Ärzt:innen.

> Hinweis: Diese Recherche ist eine technische Produkt- und Compliance-Orientierung, keine Rechtsberatung. Verbindliche Umsetzung sollte mit Ärztekammer, Sozialversicherung/SVC, Steuerberatung und Datenschutzberatung validiert werden.

---

## 1. Executive Summary

Eine konkurrenzfähige Praxissoftware für Ärzt:innen in Österreich muss deutlich mehr leisten als Kalender, Kartei und Honorarnoten. Ab 2026 verschieben sich die Mindestanforderungen stark in Richtung österreichischer eHealth-Infrastruktur:

1. **e-card / GIN / e-card Webservices** werden zentral — für Kassenärzt:innen ohnehin, für viele Wahlärzt:innen spätestens ab **01.01.2026**.
2. **ELGA-Funktionen** müssen verfügbar sein: e-Medikation, e-Befund, e-Impfpass; je nach Status Basis-/Plus-Wahlpartner und technischer Möglichkeit.
3. **e-Rezept** ist im e-card-System; bei guter Integration werden Rezeptdaten im Rezeptierungsprozess einmal erfasst und im Hintergrund an e-card/ELGA übergeben.
4. **WAHonline** ist für Wahlärzt:innen mit mindestens 300 Patient:innen/Jahr seit **01.07.2024** verpflichtend für elektronische Kostenerstattungsübermittlung bezahlter Honorarnoten.
5. **Ambulante Diagnose-/Leistungscodierung** wird ab **01.07.2026** vollumfänglich relevant; lokale Patientenakte nach ÄrzteG benötigt aktuell nicht zwingend ICD-10, aber Übermittlungspflichten kommen über Doku-G/GD-VO/e-card/e-Wahlpartner.
6. **Dokumentationspflicht nach §51 ÄrzteG**: medizinische Aufzeichnungen, Auskunft/Einsicht, mindestens **10 Jahre** Aufbewahrung für niedergelassene Ärzt:innen.
7. **Registrierkassenpflicht / RKSV** betrifft Ärzt:innen ab **15.000 € Nettojahresumsatz** und **7.500 € Barumsätzen**; Belegpflicht und manipulationssichere Kasse sind praxisrelevant.
8. **DSGVO + ärztliche Verschwiegenheit + GTelG/ELGA-Protokollierung** verlangen Rollen/Rechte, Zugriffsnachweise, Verschlüsselung, Backups, Export-/Auskunftsfunktionen, Lösch-/Sperrkonzepte und Auftragsverarbeiter-Management.

**Produktchance:** Viele bestehende Systeme wirken funktionsreich, aber komplex. Ein modernes Produkt kann gewinnen, wenn es österreichische Pflichtprozesse nativ, verständlich und auditierbar abbildet: „keine doppelte Eingabe“, klare Compliance-Checklisten, sichere Cloud/Hybrid-Architektur, WAH/e-card/ELGA-ready, gute UX für Ärzt:in + Assistenz.

---

## 2. Primäre Quellenlage

| Bereich | Quelle | Kernaussage |
|---|---|---|
| e-card Wahlpartner | SVC/chipkarte.at: e-card Wahlpartner | Wahlärzt:innen müssen spätestens ab 01.01.2026 e-card Infrastruktur und ELGA verwenden, sofern nicht ausgenommen; Basis- und Plus-Wahlpartner-Optionen. |
| e-card Anbindung | SVC/chipkarte.at: e-card Anbindung | GIN-Zugangsnetz, GINO-Kartenleser, Varianten Single-PC/Vollintegration, Softwarehersteller/EDV-Betreuer einbinden. |
| e-card Wien | Ärztekammer Wien: e-card | e-card-System über GIN; Kassenpraxen verpflichtend, Wahlärzt:innen ab 01.01.2026; e-card dient auch als Schlüssel zu ELGA. |
| ELGA für GDA | ELGA GmbH: ELGA für Gesundheitsdiensteanbieter | e-Medikation, e-Befund, e-Impfpass für GDA; e-Medikationsliste 18 Monate; Impfungen eintragen/nachtragen. |
| ELGA Technik | ELGA: Technischer Aufbau | Verteilte ELGA mit zentraler Patienten-/GDA-Identifikation, Berechtigungssteuerung, IHE/XCA-Bereiche; e-Medikation als zentrale Datenbank. |
| e-Rezept | Gesundheitsportal + SVC | e-Rezept ersetzt Papier-Kassenrezept; Privatrezepte elektronisch; Rezept wird im e-card-System gespeichert; gute Integration übernimmt Daten in e-Medikation. |
| WAHonline | ÖGK/SVS/Ärztekammer Wien | Bezahlte Wahlarzt-Honorarnoten mit Zustimmung elektronisch an SV; Pflicht seit 01.07.2024 ab 300 Patient:innen/Jahr. |
| Dokumentation | §51 ÄrzteG / Ärztekammer Kärnten | Ärztliche Dokumentations-/Auskunftspflicht; mindestens 10 Jahre Aufbewahrung bei niedergelassenen Ärzt:innen. |
| Registrierkasse | WKO + Ärztekammer NÖ | Registrierkassenpflicht für Ärzt:innen ab 15.000 € Jahresumsatz und 7.500 € Barumsatz; Belegpflicht und RKSV-Anforderungen. |
| Diagnosecodierung | GÖG + Ärztekammer NÖ | Vollumfängliche Pflicht zur Übermittlung von Diagnose-/Leistungscodes ab 01.07.2026; ICD-10 im extramuralen ambulanten Bereich. |

---

## 3. Österreich-spezifische Muss-Anforderungen

### 3.1 Patientenverwaltung & Stammdaten

**Muss:**

- Patient:innen-Stammdaten: Name, Geburtsdatum, SVNR, Adresse, Kontakt, Geschlecht, Versicherungsträger, ggf. Privatversicherung.
- Dublettenprüfung, insbesondere bei SVNR/Name/Geburtsdatum.
- DSGVO-konforme Einwilligungs-/Informationsverwaltung:
  - Datenschutzinformation erhalten,
  - Zustimmung für WAHonline-Übermittlung,
  - optional Kommunikationskanäle SMS/E-Mail,
  - ELGA Opt-out/Status nur im Prozess berücksichtigen, nicht unzulässig lokal behaupten.
- Änderungsprotokoll für sensible Stammdaten.

**Österreich-Fokus:** SVNR und e-card-Konsultations-/Identitätsprüfung sind keine Nice-to-have-Felder, sondern Prozessanker.

---

### 3.2 Ärztliche Kartei / Dokumentationspflicht nach §51 ÄrzteG

Nach §51 ÄrzteG müssen Ärzt:innen Aufzeichnungen über jede zur Beratung/Behandlung übernommene Person führen und Auskunft/Einsicht ermöglichen. Niedergelassene Ärzt:innen müssen Unterlagen mindestens **10 Jahre** aufbewahren.

**Software-Anforderungen:**

- Chronologische Patientenakte mit:
  - Anamnese,
  - Befund,
  - Diagnose/Freitext und künftig codierte Diagnosen,
  - Therapie/Leistung,
  - Verordnungen,
  - Aufklärung/Einwilligungen,
  - Arztbriefe/Befunde/Dokumente,
  - Notizen und Anhänge.
- Unveränderlichkeits-/Audit-Konzept:
  - nachträgliche Änderungen versionieren,
  - Autor:in, Zeitstempel, Änderungshistorie,
  - keine stille Überschreibung medizinischer Einträge.
- Export für Patient:innen-Auskunft nach DSGVO/ÄrzteG:
  - PDF/ZIP-Export pro Patient:in,
  - maschinenlesbarer Export perspektivisch sinnvoll.
- Aufbewahrung & Ordinationsschließung:
  - Mandanten-/Praxisexport,
  - Nachfolgerübergabe mit Einwilligungsstatus,
  - Archivmodus für 10-Jahres-Frist.

---

### 3.3 Termine, Warteliste, Ressourcen

**Standard, aber wichtig:**

- Kalender für Ärzt:innen, Räume, Geräte.
- Online-Terminbuchung optional, aber Marktstandard.
- Wartelisten und kurzfristige Slots.
- SMS/E-Mail-Erinnerungen mit DSGVO-konformer Einwilligung.
- Wiederkehrende Termine, Terminserien, Absagen/No-show.
- Verknüpfung Termin → Kartei → Leistung → Honorarnote.

**UX-Chance:** Für kleine Wahlarztordinationen muss der Flow extrem kurz sein: Patient auswählen → Termin → Leistung/Honorarnote → WAH/e-card/e-Rezept falls nötig.

---

### 3.4 e-card / GIN / Wahlpartner-Anbindung

Ab 01.01.2026 sind viele Wahlärzt:innen verpflichtet, e-card-Infrastruktur und ELGA zu verwenden; Ausnahmen bestehen u.a. bei weniger als 300 verschiedenen Patient:innen/Jahr und bestimmten Tätigkeiten. Kassenärzt:innen nutzen e-card ohnehin.

**Technische Anforderungen:**

- Unterstützung für GIN/GINO/e-card-Infrastruktur bzw. klare Integrationsstrategie:
  - lokale Praxisinstallation/Bridge-Agent,
  - Web-App + lokaler Connector,
  - oder Nutzung e-card Web-Oberfläche als Übergang.
- Workflows:
  - e-card stecken / digitale e-card / e-Berechtigung perspektivisch,
  - Patient:innenidentität prüfen,
  - e-card Gültigkeit prüfen,
  - Konsultation/Kontakt buchen,
  - Status/Fehler anzeigen,
  - Offline-/Fallback-Prozess dokumentieren.
- Rollen je nach e-card-Variante:
  - **Basis-Wahlpartner:** gesetzliche Mindestanforderungen, Zugriff auf ELGA-Services e-Medikation/e-Befund/e-Impfpass und WAHonline.
  - **Plus-Wahlpartner:** zusätzlich e-card Services wie e-Rezept, ABS, eAUM, später e-Zuweisung.

**Produktentscheidung:** Für eine moderne Web-App ist ein lokaler Connector fast unvermeidbar, weil Kartenleser/GIN typischerweise in der Ordination stehen. Architektur: Cloud/Web-Frontend + lokaler „Practice Connector“ für e-card/GDA-Hardware.

---

### 3.5 ELGA: e-Medikation, e-Befund, e-Impfpass

ELGA-GDA erhalten Zugriff auf ELGA-Daten im Behandlungskontext. Laut Ärztekammer Wien besteht nach e-card-Kontakt Zugriff auf e-Medikation/e-Befund typischerweise 90 Tage, e-Impfpass 28 Tage; Patient:innen können Zugriff teils verlängern. e-card/e-Berechtigung dient als Schlüssel.

#### e-Medikation

- Anzeige e-Medikationsliste.
- Medikationsprüfung / Wechselwirkungen über Arzneimitteldatenbank oder Partnerdienst.
- Rezeptierungsprozess mit optionalem Eintrag in e-Medikation.
- Situatives Opt-out berücksichtigen.
- Speicherdauer der Liste: 18 Monate laut Gesundheitsportal/ELGA.

#### e-Befund

- Abruf von Labor-/Radiologiebefunden und Entlassungsbriefen.
- Darstellung nach Datum, Quelle, Typ.
- Import/Verlinkung in lokaler Kartei.
- Achtung: Hochladen eigener Arztbriefe durch Ordinationen ist je nach ELGA-Stand/Anwendungsfall nicht überall vorgesehen; fachlich prüfen.

#### e-Impfpass

- Impfungen abfragen, eintragen, ändern, stornieren.
- Kein allgemeines ELGA-Opt-out wie bei anderen ELGA-Komponenten laut Ärztekammer NÖ-Kontext.
- Impfstoffkatalog, Chargen, Datum, impfende Person, Nachtragslogik.

---

### 3.6 e-Rezept, e-Privatrezept, ABS, eAUM

Das e-Rezept wird im e-card-System gespeichert und ersetzt Papierprozesse weitgehend. Gute Integration bedeutet: Rezept wie gewohnt erfassen; im Hintergrund werden e-card-System und — sofern kein Opt-out und Software unterstützt — ELGA/e-Medikation bedient.

**Anforderungen:**

- Arzneimittelstamm für Österreich:
  - Packungsgrößen,
  - Kassenpreise,
  - Rezeptpflicht,
  - Bewilligungspflicht/Chefarztpflicht,
  - Suchtgift-/Sonderfälle.
- e-Rezept erstellen, ändern/stornieren nach zulässigem Prozess.
- e-Privatrezept-Modul.
- Ausdruck/e-Rezept-Code nur auf Wunsch.
- ABS-Anträge digital stellen, Status verfolgen, nach Freigabe Rezept erstellen.
- eAUM/Arbeitsunfähigkeitsmeldung für Plus-/Kassen-Kontexte.
- Applikationsmittel als eigene Verordnungsposition, wenn fachlich notwendig.

---

### 3.7 WAHonline / elektronische Honorarnotenübermittlung

Seit 01.07.2024 sind Wahlärzt:innen mit mindestens 300 Patient:innen/Jahr verpflichtet, Anträge auf Kostenerstattung elektronisch zu übermitteln. WAHonline übermittelt **bezahlte** Honorarnoten mit Zustimmung der Patient:innen; offene Honorarnoten dürfen nicht eingereicht werden.

**Anforderungen:**

- Honorarnote mit Pflichtdaten und bezahltem Status.
- Zustimmung Patient:in zur Übermittlung erfassen.
- Nur bezahlte Honorarnoten senden.
- WAHonline-Format erzeugen — eine PDF allein genügt laut Ärztekammer Wien nicht.
- Übermittlung über ELDA, DaMe, medicalnet oder Befundkommunikationssysteme, je nach Integrationsweg.
- Status/Rückmeldung/Fehler speichern.
- Versicherungsträger-spezifische Regeln und Honorarordnungspositionen abbilden.
- Patient:innen unter 300/Jahr: freiwillig nutzbar, aber nicht zwingend.

---

### 3.8 Abrechnung, Honorarnoten, Registrierkasse/RKSV

Ärzt:innen können registrierkassenpflichtig sein, insbesondere Wahlärzt:innen und Zusatzleistungen. Laut Ärztekammer NÖ gilt die Pflicht ab **15.000 € Nettojahresumsatz** und **7.500 € Barumsatz**.

**Anforderungen:**

- Honorarnoten-/Rechnungsmodul:
  - fortlaufende Nummernkreise,
  - Leistungspositionen,
  - Zahlungsstatus,
  - Mahnwesen,
  - Storno/Gutschrift,
  - PDF mit Praxisdaten, Patient:in, Leistung, Datum, Betrag.
- Steuerlogik:
  - ärztliche Heilbehandlungen i.d.R. USt-befreit nach §6 Abs.1 Z 19 UStG,
  - nicht-medizinische/sonstige Leistungen differenzieren können.
- Registrierkasse/RKSV:
  - Bareinnahmen erfassen,
  - Belegpflicht erfüllen,
  - fortlaufende Belegnummer,
  - Kassenidentifikationsnummer,
  - Datum/Uhrzeit,
  - Betrag nach Steuersätzen,
  - maschinenlesbarer Code/signierte Belege,
  - Monats-/Jahresbelege, Startbeleg, DEP/Datenerfassungsprotokoll,
  - FinanzOnline/Signaturkomponente über zertifizierten Anbieter oder Integration.

**Empfehlung:** Nicht selbst RKSV-Signatur neu bauen, sondern zertifizierte Registrierkassen-/Signaturkomponente integrieren.

---

### 3.9 Ambulante Diagnose- und Leistungscodierung ab 2026

GÖG beschreibt ab 01.01.2026 eine bundeseinheitliche Verpflichtung zur Übermittlung ICD-10-codierter Diagnosen im extramuralen ambulanten Bereich; aufgrund Pilotphase ist die vollumfängliche Datenübermittlung ab **01.07.2026** verpflichtend. Ärztekammer NÖ betont, dass lokale §51-Patientenakte aktuell nicht zwingend Diagnosecodierung benötigt, die Codierung aber für Meldung/Übermittlung nach Doku-G/GD-VO relevant wird.

**Anforderungen:**

- ICD-10-Suche mit Synonymen und Fachfavoriten.
- Diagnosearten/Status: Verdacht, gesichert, Ausschluss etc., falls österreichische Vorgaben es verlangen.
- Leistungsdokumentation / HONO-ID / Leistungskatalog integrieren.
- Übermittlung über e-card/e-Wahlpartner-Schnittstelle vorbereiten.
- Pilot-/Fehlerstatus anzeigen.
- Trennung zwischen lokaler medizinischer Diagnosebeschreibung und übermitteltem Code.
- Datenschutz-Folgenabschätzung berücksichtigen.

---

## 4. Datenschutz, Sicherheit, Betrieb

### 4.1 DSGVO und Gesundheitsdaten

Gesundheitsdaten sind besondere Kategorien personenbezogener Daten. Anforderungen:

- Rechtsgrundlagen/Informationspflichten dokumentieren.
- Rollen-/Rechtekonzept:
  - Ärzt:in,
  - Assistenz,
  - Admin,
  - Abrechnung,
  - Nur-Lesen/Vertretung.
- Mandantenfähigkeit für Gruppenpraxis/PVZ/mehrere Standorte.
- Zugriff auf Patientenakten protokollieren.
- Technische und organisatorische Maßnahmen:
  - Verschlüsselung ruhend und transportiert,
  - MFA,
  - Passwortrichtlinien,
  - Session-Timeout,
  - IP-/Geräteverwaltung optional,
  - Backup/Restore-Tests,
  - Notfallzugriff („break glass“) protokolliert.
- Auftragsverarbeiter-Verträge bei Cloud, SMS, E-Mail, Hosting, Support.
- Export/Auskunft nach Art. 15 DSGVO.
- Löschung/Sperrung vs. ärztliche Aufbewahrungspflicht sauber behandeln.

### 4.2 GTelG/ELGA-nahe Anforderungen

- Nur berechtigte GDA/Nutzer:innen.
- Zugriff nur im Behandlungskontext.
- Patient:innen-Opt-out beachten.
- Zugriffshistorie/Protokollierung.
- GDA-Identifikation und Berechtigungssteuerung nicht lokal „faken“, sondern über offizielle Infrastruktur.

### 4.3 Cloud vs. lokal

**Cloud-App allein reicht nicht**, wenn Kartenleser/GIN/e-card-Hardware lokal benötigt werden. Beste Architektur:

```text
Browser/Web-App
   ↕ HTTPS
Cloud/API oder Praxisserver
   ↕ sicherer lokaler Kanal
Local Connector in Ordination
   ↕ GIN/GINO/Kartenleser/e-card Services
SVC/e-card/ELGA-Infrastruktur
```

Der Local Connector muss:

- automatisch starten,
- Updates sicher beziehen,
- lokale Hardware erkennen,
- keine Gesundheitsdaten unnötig dauerhaft speichern,
- Fehler verständlich melden,
- Audit-Logs liefern.

---

## 5. Marktbild / Wettbewerber-Signale

Aus öffentlich sichtbaren Anbieterinformationen ergeben sich typische Features:

| Anbieter/Signal | Sichtbare Positionierung |
|---|---|
| Latido | All-in-One, e-card & e-Rezept, Wahlärzt:innen-2026-Fokus, Preis ab ca. 99 €/Monat + Module. |
| tomedo Österreich | e-card, ELGA, e-Rezept, e-Befund, e-Impfpass, Online-Terminbuchung, Video, Abrechnung; stark funktionsgetrieben. |
| docsy | Browserbasierte Software für Wahlärzte: Patientenverwaltung, Termine, Finanzverwaltung, Registrierkasse, WAHonline, e-card, ELGA, Geräteintegration. |
| ganyMED | Klassische breite Ordinationssoftware: Patientenverwaltung, Kartei, Medikamente, Labor, Abrechnung, e-card, ELGA, Formulare, Termine, Buchhaltung. |
| Offisy/ACETO/CGM u.a. | Starker Fokus auf Wahlärzt:innen-Pflichten 2024/2026: WAHonline, e-card, ELGA, e-Rezept, ICD/Leistungsdokumentation. |

**Implikation:** Der Markt verkauft nicht mehr nur Praxisverwaltung, sondern „Regulatorik ohne Stress“. Wer 2026 nicht e-card/ELGA/WAH/ICD-ready glaubhaft zeigt, verliert.

---

## 6. Empfohlenes Anforderungsmodell für ein neues Produkt

### Phase 1 — Sichere Praxisbasis

- Patient:innenverwaltung
- Kartei mit versionierten Einträgen
- Kalender + Warteliste
- Honorarnoten + Mahnwesen
- Zahlungsstatus
- Registrierkassenintegration oder Export zu RKSV-Anbieter
- Dokumentenablage
- Rollen/Rechte + Auditlog
- DSGVO-Auskunftsexport
- Backup/Restore

### Phase 2 — Österreichische Abrechnung & Wahlärzt:innen

- WAHonline-Format und Übermittlungspartner
- Zustimmung und „nur bezahlt“-Prüfung
- Versicherungs-/Kassenlogik
- Leistungskatalog/HONO-ID vorbereiten
- ICD-10-Diagnosecodierung mit Favoriten
- Finanzexport Steuerberatung

### Phase 3 — e-card / ELGA Connector

- Local Connector für GIN/GINO/e-card
- e-card Konsultations-/Identitätsprüfung
- Basis-Wahlpartner-Workflows
- ELGA: e-Medikation, e-Befund, e-Impfpass
- Opt-out/Behandlungskontext/Zugriffsfrist sauber anzeigen

### Phase 4 — Plus-/Kassenfeatures

- e-Rezept/e-Privatrezept
- Arzneimittelstamm
- ABS
- eAUM
- e-Zuweisung/eKOS-Nachfolge
- tiefere Krankenkassenabrechnung

---

## 7. Konkrete Requirements als Backlog

### P0 — Ohne das ist eine österreichische Arztsoftware nicht ernsthaft marktfähig

- [ ] Patientenakte gemäß §51 ÄrzteG, 10-Jahres-Archivstrategie.
- [ ] Rollen/Rechte/Auditlog für Gesundheitsdaten.
- [ ] Honorarnoten mit Nummernkreis, Zahlungsstatus, PDF, Mahnwesen.
- [ ] Datenschutz-/Auskunftsexport pro Patient:in.
- [ ] WAHonline-Readiness: bezahlte Honorarnoten, Zustimmung, Format, Übermittlung.
- [ ] ICD-10-/Leistungscodierung vorbereiten für 01.07.2026.
- [ ] e-card/ELGA-Strategie dokumentiert: Weboberfläche, Partnerintegration oder eigener Connector.

### P1 — Differenzierung und 2026-Pflichtabdeckung

- [ ] Local Connector für e-card/Gin.
- [ ] e-Medikation lesen/schreiben im Rezeptprozess.
- [ ] e-Befund-Abruf und Import in Kartei.
- [ ] e-Impfpass abfragen/eintragen/ändern/stornieren.
- [ ] e-Rezept/e-Privatrezept.
- [ ] ABS/eAUM.
- [ ] Registrierkassen-/RKSV-Integration.

### P2 — Produktvorteile

- [ ] KI-gestützte Arztbrief-/Befundzusammenfassung lokal oder streng datenschutzkonform.
- [ ] Sprach-zu-Kartei mit medizinischem Vokabular.
- [ ] Patientenportal für Dokumente, Termine, Zahlungen.
- [ ] Automatische Compliance-Checks: „Diese Honorarnote darf noch nicht an WAHonline, weil nicht bezahlt/keine Zustimmung“.
- [ ] Guided Setup für Wahlärzt:innen: „Bin ich ausgenommen? Basis oder Plus?“.
- [ ] Geräte-/Laborintegration.

---

## 8. Risiken und offene Punkte

| Risiko | Bedeutung | Empfehlung |
|---|---|---|
| Offizielle Schnittstellen/Zertifizierung | e-card/ELGA-Anbindung ist nicht nur HTTP-API, sondern Infrastruktur, Verträge, Zertifizierung/Herstellerregeln. | Früh mit SVC/Softwarehersteller-Programm klären. |
| Wahlärzt:innen-Ausnahmen | <300 Patient:innen/Jahr und Sondertätigkeiten ändern Pflichtumfang. | Onboarding-Fragebogen + klare Hinweise. |
| ICD/Leistungscodierung 2026 | Details/Übermittlungswege noch praxisrelevant im Fluss. | Feature-Flag/Pilotmodus bauen. |
| RKSV | Fehlerhafte Kasse ist steuerlich riskant. | Zertifizierten Anbieter integrieren. |
| Cloud-Datenschutz | Gesundheitsdaten + Cloud erfordern sehr saubere AVV/TOM/Hosting-Entscheidung. | EU/AT-Hosting, Verschlüsselung, Mandantentrennung, Pen-Test. |
| ELGA-Opt-out/Zugriffsfristen | Falsche Anzeige kann Datenschutzverletzung werden. | Status nur aus offizieller Infrastruktur ableiten. |

---

## 9. Quellen

- SVC/chipkarte.at — e-card Wahlpartner: https://www.chipkarte.at/cdscontent/?contentid=10007.904487&portal=ecardportal
- SVC/chipkarte.at — e-card Anbindung: https://www.chipkarte.at/cdscontent/?contentid=10007.896860&portal=ecardportal
- SVC/chipkarte.at — e-Rezept: https://www.chipkarte.at/cdscontent/?contentid=10007.865475&portal=ecardportal
- Ärztekammer Wien — e-card: https://www.aekwien.at/e-card
- Ärztekammer NÖ — e-card für Wahlärzt:innen: https://www.arztnoe.at/e-card-wahlaerzte
- ELGA — ELGA für GDA: https://www.elga.gv.at/gda/elga-fuer-gda/
- ELGA — technischer Aufbau: https://www.elga.gv.at/technischer-hintergrund/technischer-aufbau-im-ueberblick/
- Gesundheitsportal — e-Rezept: https://www.gesundheit.gv.at/news/aktuelles/aktuell-2023/e-rezept.html
- Gesundheitsportal — e-Medikation: https://www.gesundheit.gv.at/gesundheitsleistungen/elga/e-medikation.html
- ÖGK — e-Impfpass: https://www.oegk.at/cdscontent/?contentid=10007.882492
- ÖGK — WAHonline/WAZAonline: https://www.oegk.at/cdscontent/?contentid=10007.880165&portal=oegkvpportal
- SVS — WAHonline Informationen: https://www.svs.at/cdscontent/?contentid=10007.864256&portal=svsportal
- Ärztekammer Wien — Honorarnotenübermittlung Wahlärzt:innen: https://www.aekwien.at/wahlarzt-honorarnotenuebermittlung
- Ärztekammer Kärnten — Ärztliche Dokumentation: https://www.aekktn.at/rechtliches/arztundrecht/aufklaerungspflicht/dokumentation
- §51 ÄrzteG — Dokumentationspflicht: https://www.jusline.at/gesetz/aerzteg/paragraf/51
- WKO — Registrierkassenpflicht: https://www.wko.at/steuern/kassenpflicht
- Ärztekammer NÖ — Registrierkassenpflicht: https://www.arztnoe.at/fuer-aerzte/news-details/registrierkassenpflicht
- GÖG — Ambulante Diagnosencodierung: https://goeg.at/ambulante_diagnosencodierung
- Ärztekammer NÖ — Diagnosecodierung: https://www.arztnoe.at/diagnosecodierung

