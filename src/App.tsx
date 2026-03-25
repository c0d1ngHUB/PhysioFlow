import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Patients from './pages/Patients';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';

type Page = 'dashboard' | 'calendar' | 'patients' | 'invoices' | 'expenses' | 'reports';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: Page; label: string; subItems?: string[] }[] = [
    { id: 'dashboard', label: 'Auswertung', subItems: [] },
    { id: 'calendar', label: 'Behandlungen', subItems: ['Kalender', 'Termin erfassen'] },
    { id: 'patients', label: 'Stammdaten', subItems: ['Patientenliste', 'Neuer Patient'] },
    { id: 'invoices', label: 'Finanzen', subItems: ['Honorarnoten', 'Zahlungsübersicht'] },
    { id: 'expenses', label: 'Ausgaben', subItems: [] },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-surface border-r border-gray-300 min-h-screen">
        {/* Logo */}
        <div className="p-5 border-b border-gray-300">
          <h1 className="text-xl font-semibold text-text-primary">PhysioFlow</h1>
          <p className="text-xs text-text-secondary mt-1">Praxisverwaltung</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setCurrentPage(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-gray-200 text-text-primary'
                    : 'text-text-secondary hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
              {item.subItems && item.subItems.length > 0 && currentPage === item.id && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {item.subItems.map((sub, idx) => (
                    <button
                      key={idx}
                      className="block w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-gray-50 rounded"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-300">
          <p className="text-xs text-text-secondary">
            v1.1 • PhysioFlow
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">PhysioFlow</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            {sidebarOpen ? 'Schließen' : 'Menü'}
          </button>
        </header>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden bg-surface border-b border-gray-300 px-3 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-sm rounded ${
                  currentPage === item.id ? 'bg-gray-200 text-text-primary' : 'hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'calendar' && <Calendar />}
          {currentPage === 'patients' && <Patients />}
          {currentPage === 'invoices' && <Invoices />}
          {currentPage === 'expenses' && <Expenses />}
        </main>
      </div>
    </div>
  );
}

export default App;
