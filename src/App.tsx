import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Patients from './pages/Patients';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './auth.tsx';
import { useNavigation, type Page } from './navigation';
import { ToastContainer } from './components/ui';

// =============================================================================
// Login Page
// =============================================================================
function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const ok = await login(username, password);
    if (!ok) {
      setError('Ungültige Anmeldedaten');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-surface rounded-xl shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <span className="text-3xl mr-2">🩺</span>
          <h1 className="text-xl font-bold text-primary">PhysioFlow</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-text-secondary mb-1">Benutzername</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            autoFocus
            disabled={submitting}
          />
          <label className="block text-sm font-medium text-text-secondary mb-1">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            disabled={submitting}
          />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main App with Sidebar
// =============================================================================
function AppContent() {
  const { authenticated, loading, logout } = useAuth();
  const { currentPage, openModal, navigateTo, setOpenModal } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!openModal) return;
  }, [currentPage, openModal]);

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

  const navItems: { id: Page; label: string; icon: string; subItems?: { label: string; action: () => void }[] }[] = [
    { id: 'dashboard', label: 'Auswertung', icon: '📊' },
    {
      id: 'calendar',
      label: 'Behandlungen',
      icon: '📅',
      subItems: [
        { label: 'Kalender', action: () => navigateTo('calendar') },
        { label: 'Termin erfassen', action: () => navigateTo('calendar', 'appointment') },
      ],
    },
    {
      id: 'patients',
      label: 'Stammdaten',
      icon: '👥',
      subItems: [
        { label: 'Patientenliste', action: () => navigateTo('patients') },
        { label: 'Neuer Patient', action: () => navigateTo('patients', 'patient') },
      ],
    },
    {
      id: 'invoices',
      label: 'Finanzen',
      icon: '💰',
      subItems: [
        { label: 'Honorarnoten', action: () => navigateTo('invoices') },
        { label: 'Zahlungsübersicht', action: () => navigateTo('invoices') },
      ],
    },
    { id: 'expenses', label: 'Ausgaben', icon: '📉' },
    { id: 'admin', label: 'Verwaltung', icon: '🧩' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-gray-200 min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🩺</span>
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
              {item.subItems && currentPage === item.id && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.subItems.map((sub) => (
                    <button
                      key={sub.label}
                      onClick={sub.action}
                      className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-gray-50 rounded"
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
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
            <span className="text-2xl mr-2">🩺</span>
            <h1 className="text-lg font-bold text-primary">PhysioFlow</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 text-sm text-text-secondary"
              title="Abmelden"
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
          <div className="md:hidden bg-surface border-b border-gray-200 px-4 py-2">
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
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
          {currentPage === 'calendar' && <Calendar initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
          {currentPage === 'patients' && <Patients initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
          {currentPage === 'invoices' && <Invoices initialModal={openModal} onModalConsumed={() => setOpenModal(null)} />}
          {currentPage === 'expenses' && <Expenses />}
          {currentPage === 'admin' && <Admin />}
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
