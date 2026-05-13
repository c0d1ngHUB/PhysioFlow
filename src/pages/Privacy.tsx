import { FileLock, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

type PrivacyProps = {
  authEnabled?: boolean;
};

export default function Privacy({ authEnabled = false }: PrivacyProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Datenschutzerklärung"
        description="Informationsübersicht zur Verarbeitung personenbezogener Daten in PhysioFlow."
        icon={<ShieldCheck className="h-6 w-6" />}
        badge={<Badge variant="info">DSGVO</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Verantwortlicher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Bitte ergänzen: Name der Praxis / verantwortlichen Person, Anschrift, E-Mail-Adresse und gegebenenfalls
            Telefonnummer.
          </p>
          <p>
            Diese Vorlage dient als technische Platzhalter-Seite und sollte vor produktiver Nutzung rechtlich geprüft
            und mit den echten Praxisdaten vervollständigt werden.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Zweck der Verarbeitung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>PhysioFlow verarbeitet personenbezogene Daten zur Organisation und Verwaltung physiotherapeutischer Leistungen.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Verwaltung von Patientenstammdaten</li>
            <li>Terminplanung und Behandlungsdokumentation</li>
            <li>Erstellung und Verwaltung von Honorarnoten</li>
            <li>Ausgaben- und Praxisorganisation</li>
            <li>optionale Benachrichtigungen, z. B. per SMS</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Kategorien verarbeiteter Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <ul className="list-disc space-y-1 pl-5">
            <li>Stammdaten wie Name, Telefonnummer, E-Mail-Adresse, Adresse und Geburtsdatum</li>
            <li>Organisationsdaten wie Termine, Rechnungen, Zahlungsstatus und interne Notizen</li>
            <li>Behandlungsbezogene Dokumentation, soweit sie in PhysioFlow erfasst wird</li>
            <li>technische Sitzungsdaten zur Zugriffssicherung</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Rechtsgrundlagen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Die Verarbeitung erfolgt – je nach Einzelfall – insbesondere auf Basis von Vertragserfüllung,
            gesetzlichen Aufbewahrungspflichten, berechtigten Interessen sowie gegebenenfalls einer Einwilligung.
          </p>
          <p>
            Die konkrete rechtliche Bewertung sollte für den realen Betrieb mit einer fachkundigen juristischen Prüfung
            abgestimmt werden.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Empfänger und eingesetzte Dienste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>Je nach Konfiguration können Daten an technisch notwendige Dienstleister übermittelt werden, z. B.:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hosting- / Server-Infrastruktur</li>
            <li>Reverse Proxy / Firewall / Infrastrukturkomponenten</li>
            <li>SMS-Dienstleister wie SMS77, sofern SMS-Versand aktiv genutzt wird</li>
          </ul>
          <p>
            Vor produktiver Nutzung sollten sämtliche Drittanbieter, Auftragsverarbeiter und Speicherorte vollständig
            dokumentiert werden.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Zugriffsschutz und Cookies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            PhysioFlow verwendet einen technisch notwendigen Sitzungscookie zur Anmeldung und Zugriffssicherung.
            {authEnabled
              ? ' Der geschützte Modus ist aktuell aktiv.'
              : ' Der geschützte Modus kann optional aktiviert werden.'}
          </p>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <FileLock className="mt-0.5 h-4 w-4" />
              <p>
                Sofern ausschließlich technisch notwendige Cookies eingesetzt werden und kein Tracking aktiv ist, ist
                in vielen Fällen kein klassischer Consent-Banner erforderlich. Diese Einschätzung sollte im Zweifel
                rechtlich geprüft werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Speicherdauer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Zweck sowie für
            gesetzliche Aufbewahrungsfristen erforderlich ist.
          </p>
          <p>
            Für den produktiven Einsatz empfiehlt sich ein dokumentiertes Archivierungs- und Löschkonzept.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Betroffenenrechte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>Betroffene Personen haben im Rahmen der gesetzlichen Vorgaben insbesondere Rechte auf:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Auskunft</li>
            <li>Berichtigung</li>
            <li>Löschung</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerspruch</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Technischer Hinweis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Diese Seite ist bewusst als praxisnahe technische Vorlage eingebunden. Sie ersetzt keine individuelle
            Rechtsberatung und sollte vor Live-Betrieb final geprüft und ergänzt werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
