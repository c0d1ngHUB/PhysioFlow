import { Building2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export default function Imprint() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Impressum"
        description="Pflichtangaben für den Anbieter dieser Anwendung."
        icon={<Building2 className="h-6 w-6" />}
        badge={<Badge variant="neutral">Rechtstext</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Anbieterangaben</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>Bitte ergänzen:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Name der Praxis / Anbieter</li>
            <li>Vertretungsberechtigte Person</li>
            <li>Vollständige Anschrift</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer</li>
            <li>gegebenenfalls Firmenbuchnummer / UID / Kammerzugehörigkeit</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Haftungshinweis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Diese Impressumsseite ist als technische Vorlage eingebunden und muss vor produktiver Veröffentlichung mit
            den tatsächlichen Pflichtangaben ergänzt werden.
          </p>
          <p>
            Für rechtlich verbindliche Inhalte sollte eine fachkundige Prüfung erfolgen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
