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

  const navItems: { id: Page; label: string; icon: string; subItems?: string[] }[] = [
    { id: 'dashboard', label: 'Auswertung', icon: '📊' },
    { id: 'calendar', label: 'Behandlungen', icon: '📅', subItems: ['Kalender', 'Termin erfassen'] },
    { id: 'patients', label: 'Stammdaten', icon: '👥', subItems: ['Patientenliste', 'Neuer Patient'] },
    { id: 'invoices', label: 'Finanzen', icon: '💰', subItems: ['Honorarnoten', 'Zahlungsübersicht'] },
    { id: 'expenses', label: 'Ausgaben', icon: '📉' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-gray-200 min-h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🩺</span>
            <h1 className="text-lg font-bold text-primary">PhysioFlow</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setCurrentPage(item.id)}
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
                  {item.subItems.map((sub, idx) => (
                    <button
                      key={idx}
                      className="block w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-gray-50 rounded"
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
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-text-secondary text-center">
            v1.1 • Praxis-Software
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
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            ☰
          </button>
        </header>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden bg-surface border-b border-gray-200 px-4 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
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
