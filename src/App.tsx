import { lazy, Suspense, useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import { AuthProvider, useAuth } from './auth.tsx';
import { useNavigation, type Page } from './navigation';
import { SkeletonCardLarge, SkeletonStatsCard, ToastContainer } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';

const Calendar = lazy(() => import('./pages/Calendar'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Admin = lazy(() => import('./pages/Admin'));

function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );
}

// =============================================================================
// Login Page
// =============================================================================
function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await login(username, password);
    if (!result.success) {
      setError(result.message || 'Anmeldung nicht möglich.');
    }
    setSubmitting(false);
  };

  const isHttps = window.location.protocol === 'https:';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-xl shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-3 flex-shrink-0">
            <span className="text-white font-bold text-lg">PF</span>
          </div>
          <h1 className="text-xl font-bold text-primary">PhysioFlow</h1>
        </div>
        <form onSubmit={handleSubmit} action="/api/auth/login" method="POST">
          <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">Benutzername</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 mb-3 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}`}
            autoFocus
            autoComplete="username"
            disabled={submitting}
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">Passwort</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 pr-11 border rounded-lg focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'}`}
              autoComplete="current-password"
              disabled={submitting}
              required
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 01-4.24-4.24"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {error && <p id="login-error" className="text-red-600 text-sm mt-2 mb-3" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-text-secondary">
          {isHttps ? (
            <>
              <span role="img" aria-label="Verschlüsselt">🔒</span>
              <span>Verschlüsselte Verbindung</span>
            </>
          ) : (
            <>
              <span role="img" aria-label="Unverschlüsselt">⚠️</span>
              <span>Unverschlüsselte Verbindung</span>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-text-secondary">
          <a href="/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">Impressum</a>
          <span>·</span>
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">Datenschutz</a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main App with Sidebar
// =============================================================================
function AppContent() {
  const { authenticated, loading, logout, user } = useAuth();
  const { currentPage, openModal, navigateTo, setOpenModal } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTransitionLoading, setPageTransitionLoading] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!loading && authenticated && !isAdmin && currentPage === 'admin') {
      navigateTo('dashboard');
    }
  }, [authenticated, currentPage, isAdmin, loading, navigateTo]);

  useEffect(() => {
    if (!authenticated || loading) {
      return;
    }

    setSidebarOpen(false);
    setPageTransitionLoading(true);
    const timer = window.setTimeout(() => setPageTransitionLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, [authenticated, currentPage, loading]);

  // Scroll-Lock bei geöffneter Mobile-Sidebar
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Auswertung', icon: '📊' },
    { id: 'calendar', label: 'Behandlungen', icon: '📅' },
    { id: 'patients', label: 'Stammdaten', icon: '👥' },
    { id: 'invoices', label: 'Finanzen', icon: '💰' },
    { id: 'expenses', label: 'Ausgaben', icon: '📉' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Verwaltung', icon: '🧩' });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-gray-200 min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-white font-bold text-sm">PF</span>
            </div>
            <h1 className="text-lg font-bold text-primary">PhysioFlow</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary-100 text-blue-900 font-bold border-l-4 border-primary-600'
                    : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full py-2 px-4 text-sm text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Abmelden
          </button>
          <p className="text-xs text-text-secondary text-center mt-2">
            v1.2 • Praxis-Software
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-white font-bold text-sm">PF</span>
            </div>
            <h1 className="text-lg font-bold text-primary">PhysioFlow</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 text-sm text-text-secondary"
              title="Abmelden"
              aria-label="Abmelden"
            >
              🚪
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Navigation schließen"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-l border-gray-200 bg-surface p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mr-2 flex-shrink-0">
                    <span className="text-white font-bold text-sm">PF</span>
                  </div>
                  <h2 className="text-lg font-bold text-primary">PhysioFlow</h2>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { navigateTo(item.id); setSidebarOpen(false); }}
                    className={`block w-full text-left px-3 py-2 rounded font-medium ${
                      currentPage === item.id ? 'bg-primary-100 text-blue-900 font-bold' : 'text-text-secondary hover:bg-gray-100'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {pageTransitionLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SkeletonStatsCard />
                <SkeletonStatsCard />
                <SkeletonStatsCard />
                <SkeletonStatsCard />
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <SkeletonCardLarge />
                <SkeletonCardLarge />
              </div>
            </div>
          ) : (
            <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              {currentPage === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
              {currentPage === 'calendar' && <Calendar initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
              {currentPage === 'patients' && <Patients initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
              {currentPage === 'invoices' && <Invoices initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
              {currentPage === 'expenses' && <Expenses />}
              {currentPage === 'admin' && isAdmin && <Admin />}
            </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
