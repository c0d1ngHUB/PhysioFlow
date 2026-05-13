import { Suspense, lazy, type FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  DoorOpen,
  FileLock,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Receipt,
  X,
} from 'lucide-react';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Card, CardContent } from './components/ui/Card';
import { ToastContainer } from './components/ui';
import { apiFetch, AUTH_REQUIRED_EVENT } from './lib/api';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Patients = lazy(() => import('./pages/Patients'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Imprint = lazy(() => import('./pages/Imprint'));

type Page = 'dashboard' | 'calendar' | 'patients' | 'invoices' | 'expenses' | 'reports' | 'privacy' | 'imprint';

type QuickAction = 'newAppointment' | 'newPatient' | 'newInvoice' | 'overview' | null;

type NavSubItem = {
  label: string;
  action?: Exclude<QuickAction, null>;
};

type NavItem = {
  id: Exclude<Page, 'privacy' | 'imprint' | 'reports'>;
  label: string;
  icon: typeof LayoutDashboard;
  subItems?: NavSubItem[];
};

type SessionResponse = {
  success: boolean;
  data?: {
    authEnabled: boolean;
    authenticated: boolean;
    username: string | null;
  };
  error?: string;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Auswertung', icon: LayoutDashboard },
  { id: 'calendar', label: 'Behandlungen', icon: CalendarDays, subItems: [{ label: 'Kalender' }, { label: 'Termin erfassen', action: 'newAppointment' }] },
  { id: 'patients', label: 'Stammdaten', icon: CircleUserRound, subItems: [{ label: 'Patientenliste' }, { label: 'Neuer Patient', action: 'newPatient' }] },
  { id: 'invoices', label: 'Finanzen', icon: Receipt, subItems: [{ label: 'Honorarnoten' }, { label: 'Zahlungsübersicht' }] },
  { id: 'expenses', label: 'Ausgaben', icon: ClipboardList },
];

function LegalLinks({ onNavigate }: { onNavigate: (page: 'privacy' | 'imprint') => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
      <button
        onClick={() => onNavigate('privacy')}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"
      >
        <FileLock className="h-4 w-4" />
        Datenschutz
      </button>
      <button
        onClick={() => onNavigate('imprint')}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"
      >
        <Building2 className="h-4 w-4" />
        Impressum
      </button>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const isLegalPage = currentPage === 'privacy' || currentPage === 'imprint';

  const loadSession = async () => {
    setAuthLoading(true);
    try {
      const res = await apiFetch('/api/auth/session');
      const payload = (await res.json()) as SessionResponse;
      const enabled = Boolean(payload.data?.authEnabled);
      const authenticated = Boolean(payload.data?.authenticated);
      const sessionUser = payload.data?.username ?? null;

      setAuthEnabled(enabled);
      setUsername(enabled && authenticated ? sessionUser : enabled ? null : 'open-access');
      setLoginError('');
    } catch {
      setLoginError('Sitzungsstatus konnte nicht geladen werden.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    const handleAuthRequired = () => {
      setAuthEnabled(true);
      setUsername(null);
      setLoginPassword('');
      setLoginError('Sitzung abgelaufen. Bitte erneut anmelden.');
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  const handleQuickAction = (action: Exclude<QuickAction, null>) => {
    if (action === 'overview') {
      setCurrentPage('dashboard');
      setQuickAction(null);
      return;
    }

    if (action === 'newAppointment') setCurrentPage('calendar');
    if (action === 'newPatient') setCurrentPage('patients');
    if (action === 'newInvoice') setCurrentPage('invoices');
    setQuickAction(action);
  };

  const clearQuickAction = () => setQuickAction(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError('');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const payload = (await res.json()) as SessionResponse;
      if (!res.ok || !payload.success) {
        setLoginError(payload.error || 'Login fehlgeschlagen');
        return;
      }

      setLoginPassword('');
      setCurrentPage('dashboard');
      await loadSession();
    } catch {
      setLoginError('Login fehlgeschlagen.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUsername(null);
      setQuickAction(null);
      setCurrentPage('dashboard');
      await loadSession();
    }
  };

  const renderLegalPage = () => (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">PhysioFlow</h1>
              <p className="text-sm text-slate-500">Rechtliche Informationen</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(authEnabled && username ? 'dashboard' : 'dashboard')}
          >
            {authEnabled && username ? 'Zur App' : 'Zur Startansicht'}
          </Button>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardContent className="text-sm text-slate-500">Seite wird geladen…</CardContent>
            </Card>
          }
        >
          {currentPage === 'privacy' && <Privacy authEnabled={authEnabled} />}
          {currentPage === 'imprint' && <Imprint />}
        </Suspense>

        <div className="mt-8 border-t border-slate-200 pt-5">
          <LegalLinks onNavigate={setCurrentPage} />
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <HeartPulse className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">PhysioFlow</h1>
            <p className="mt-2 text-sm text-slate-500">Sitzung wird geladen…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLegalPage) {
    return renderLegalPage();
  }

  if (authEnabled && !username) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardContent className="p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileText className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900">PhysioFlow Login</h1>
                <p className="mt-2 text-sm text-slate-500">Bitte mit dem Praxis-Admin-Konto anmelden.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Benutzername</label>
                  <input
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Passwort</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    autoComplete="current-password"
                  />
                </div>

                {loginError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loginBusy || !loginUsername || !loginPassword}
                  className="w-full"
                >
                  {loginBusy ? 'Anmeldung läuft…' : 'Einloggen'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="border-t border-slate-200 pt-4">
            <LegalLinks onNavigate={setCurrentPage} />
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = authEnabled ? `Angemeldet als ${username}` : 'Offener Modus aktiv';

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden min-h-screen w-72 flex-col border-r border-slate-200 bg-white/95 md:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">PhysioFlow</h1>
              <p className="text-sm text-slate-500">Praxis-Software</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'border border-blue-100 bg-blue-50 text-blue-900 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-blue-200 bg-white text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                </button>

                {item.subItems && isActive && (
                  <div className="space-y-1 pl-14">
                    {item.subItems.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => {
                          setCurrentPage(item.id);
                          if (sub.action) handleQuickAction(sub.action);
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                <CircleUserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">Praxisstatus</p>
                <p className="mt-1 text-sm text-slate-500">{statusLabel}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Badge variant={authEnabled ? 'info' : 'neutral'}>
                    {authEnabled ? 'Authentifiziert' : 'Open Access'}
                  </Badge>
                  <span className="text-xs text-slate-400">v1.2</span>
                </div>
              </div>
            </div>
            {authEnabled && (
              <Button
                variant="outline"
                icon={<DoorOpen className="h-4 w-4" />}
                onClick={handleLogout}
                className="mt-4 w-full"
              >
                Abmelden
              </Button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">PhysioFlow</h1>
                <p className="text-xs text-slate-500">Praxis-Software</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen((open) => !open)}
              icon={sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              aria-label="Navigation umschalten"
            />
          </div>
          {sidebarOpen && (
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setSidebarOpen(false);
                      }}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                        isActive
                          ? 'border border-blue-100 bg-blue-50 text-blue-900'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-200 pt-2">
                  <LegalLinks
                    onNavigate={(page) => {
                      setSidebarOpen(false);
                      setCurrentPage(page);
                    }}
                  />
                </div>
                {authEnabled && (
                  <Button
                    variant="outline"
                    icon={<DoorOpen className="h-4 w-4" />}
                    onClick={() => {
                      setSidebarOpen(false);
                      handleLogout();
                    }}
                    className="w-full justify-start"
                  >
                    Abmelden
                  </Button>
                )}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Suspense
            fallback={
              <Card>
                <CardContent className="text-sm text-slate-500">Ansicht wird geladen…</CardContent>
              </Card>
            }
          >
            {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} onQuickAction={handleQuickAction} />}
            {currentPage === 'calendar' && <Calendar openCreateModal={quickAction === 'newAppointment'} onCreateModalOpened={clearQuickAction} />}
            {currentPage === 'patients' && <Patients openCreateModal={quickAction === 'newPatient'} onCreateModalOpened={clearQuickAction} />}
            {currentPage === 'invoices' && <Invoices openCreateModal={quickAction === 'newInvoice'} onCreateModalOpened={clearQuickAction} />}
            {currentPage === 'expenses' && <Expenses />}
          </Suspense>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 md:px-8">
          <div className="flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
            <p className="text-sm text-slate-400">PhysioFlow • Datenschutzfreundliche Praxissoftware</p>
            <LegalLinks onNavigate={setCurrentPage} />
          </div>
        </footer>
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
