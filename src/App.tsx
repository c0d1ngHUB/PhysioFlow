import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Patients from './pages/Patients';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
// Auth removed for dev/internal use
import { useNavigation, type Page } from './navigation';
import { ToastContainer } from './components/ui';

// Auth Provider removed — no login required for dev/internal use

// Login Page removed

// =============================================================================
// Main App with Sidebar
// =============================================================================
function AppContent() {
  // Auth removed — always show app
  const { currentPage, openModal, navigateTo, setOpenModal } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Clear openModal when page changes (unless it was set by navigateTo)
  useEffect(() => {
    if (!openModal) return;
    // Modal is handled by the page component via the store
  }, [currentPage, openModal]);

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
            {/* logout removed */}
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
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;