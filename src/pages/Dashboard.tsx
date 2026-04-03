import { useState, useEffect } from 'react';
import { DashboardStats } from '../types';

type ExtendedStats = Omit<DashboardStats, 'today_details'> & {
  today_details: any[];
  unpaid_invoices_total: number;
  this_month_appointments: number;
  this_month_revenue: number;
  last_month_revenue: number;
  upcoming_this_week: any[];
  six_months_revenue: { month: string; revenue: number }[];
};

export default function Dashboard() {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [units, setUnits] = useState('10');
  const [rate, setRate] = useState('50');
  const [calculatedTotal, setCalculatedTotal] = useState(500);
  const [savedDraft, setSavedDraft] = useState(false);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // const u = parseFloat(units) || 0;
    // const r = parseFloat(rate) || 0;
    setCalculatedTotal((parseFloat(units) || 0) * (parseFloat(rate) || 0));
  }, [units, rate]);

  const handleSaveDraft = () => {
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{getGreeting()}</h1>
            <p className="text-gray-500 mt-1">
              {currentTime.toLocaleDateString('de-AT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <span className="font-semibold text-gray-700">PhysioFlow</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Heute</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{stats?.today_appointments || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Termine</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Diese Woche</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{stats?.upcoming_appointments || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Anstehend</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-lg">📆</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Offene Rechnungen</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{stats?.unpaid_invoices || 0}</p>
              <p className="text-sm text-amber-600 font-medium mt-1">
                {formatCurrency(stats?.unpaid_invoices_total || 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-lg">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Patienten</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{stats?.total_patients || 0}</p>
              <p className="text-xs text-gray-400 mt-1">Registriert</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-lg">👥</div>
          </div>
        </div>
      </div>

      {/* Revenue & Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Revenue Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Umsatz {currentTime.toLocaleDateString('de-AT', { month: 'long' })}</p>
            <span className="text-lg">💶</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats?.this_month_revenue || 0)}</p>
          <div className="mt-3 flex items-center gap-2">
            {(() => {
              const diff = (stats?.this_month_revenue || 0) - (stats?.last_month_revenue || 0);
              const pct = stats?.last_month_revenue && stats.last_month_revenue > 0
                ? Math.round((diff / stats.last_month_revenue) * 100)
                : 0;
              const isPositive = diff >= 0;
              return (
                <>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(pct)}%
                  </span>
                  <span className="text-xs text-gray-400">
                    vs. {formatCurrency(stats?.last_month_revenue || 0)} (Vormonat)
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Appointments this month */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Termine diesen Monat</p>
            <span className="text-lg">🗓️</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{stats?.this_month_appointments || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Behandlungen durchgeführt</p>
        </div>

        {/* Outstanding amount */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Ausständiger Betrag</p>
            <span className="text-lg">⏳</span>
          </div>
          <p className="text-3xl font-semibold text-amber-600">{formatCurrency(stats?.unpaid_invoices_total || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats?.unpaid_invoices || 0} unbezahlte Rechnungen</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Heutige Termine</h3>
                <p className="text-sm text-gray-500">{stats?.today_appointments || 0} Termine geplant</p>
              </div>
              <span className="text-lg">📋</span>
            </div>
          </div>
          <div className="p-5">
            {stats?.today_details && stats.today_details.length > 0 ? (
              <div className="space-y-3">
                {stats.today_details.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border-l-4 border-blue-500"
                  >
                    <div className="w-14 h-12 bg-white rounded-lg flex flex-col items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-gray-700">{apt.time_start.split(':')[0]}</span>
                      <span className="text-xs text-gray-500">{apt.time_start.split(':')[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{apt.patient_name}</p>
                      <p className="text-sm text-gray-500">{apt.treatment_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{apt.time_end}</p>
                      {apt.sms_reminder === 1 && (
                        <span className="text-xs text-emerald-600">✓ SMS</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <span className="text-4xl text-gray-300">📭</span>
                <p className="text-gray-500 font-medium mt-2">Keine Termine heute</p>
                <p className="text-gray-400 text-sm mt-1">Genießen Sie Ihren freien Tag!</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming This Week */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Diese Woche</h3>
                <p className="text-sm text-gray-500">{stats?.upcoming_this_week?.length || 0} anstehende Termine</p>
              </div>
              <span className="text-lg">📆</span>
            </div>
          </div>
          <div className="p-5">
            {stats?.upcoming_this_week && stats.upcoming_this_week.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {stats.upcoming_this_week.map((apt: any, idx: number) => {
                  const date = new Date(apt.date + 'T00:00:00');
                  const today = new Date().toISOString().slice(0, 10);
                  const isToday = apt.date === today;
                  return (
                    <div key={apt.id || idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${isToday ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                        <span>{date.toLocaleDateString('de-AT', { day: '2-digit' })}</span>
                        <span className="text-[10px] uppercase">{date.toLocaleDateString('de-AT', { weekday: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{apt.patient_name}</p>
                        <p className="text-xs text-gray-500">{apt.time_start} – {apt.time_end} · {apt.treatment_type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <span className="text-4xl text-gray-300">📭</span>
                <p className="text-gray-500 font-medium mt-2">Keine Termine diese Woche</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {stats?.six_months_revenue && stats.six_months_revenue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Umsatzübersicht</h3>
                <p className="text-sm text-gray-500">Letzte 6 Monate (bezahlte Honorarnoten)</p>
              </div>
              <span className="text-lg">📊</span>
            </div>
          </div>
          <div className="p-5">
            {(() => {
              const maxRev = Math.max(...stats.six_months_revenue.map(m => m.revenue), 1);
              return (
                <div className="flex items-end gap-3 h-40">
                  {stats.six_months_revenue.map((m, i) => {
                    const heightPct = Math.max((m.revenue / maxRev) * 100, 2);
                    const isCurrentMonth = i === stats.six_months_revenue.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: '140px' }}>
                          <div
                            className={`w-full max-w-12 rounded-t-md transition-all ${isCurrentMonth ? 'bg-blue-600' : 'bg-blue-300'}`}
                            style={{ height: `${heightPct}%` }}
                            title={formatCurrency(m.revenue)}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isCurrentMonth ? 'text-blue-700 font-bold' : 'text-gray-500'}`}>
                          {m.month}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatCurrency(m.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Invoice Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Honorarnoten-Rechner</h3>
                <p className="text-sm text-blue-100">Berechnung für eine Honorarnote</p>
              </div>
              <span className="text-lg text-white">💶</span>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Einheiten</label>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">€ / Einheit</label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-blue-700 font-medium">Gesamtbetrag:</span>
                <span className="text-3xl font-bold text-blue-900 font-mono">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>
              <p className="text-xs text-blue-400 mt-2 text-center">
                Steuerbefreit gemäß §6 Abs.1 Z 19 UStG
              </p>
            </div>

            <button
              onClick={handleSaveDraft}
              className={`w-full py-2.5 rounded-lg font-medium text-white transition-colors ${
                savedDraft ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {savedDraft ? '✓ Gespeichert!' : 'Als Entwurf speichern'}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Schnellaktionen</h3>
                <p className="text-sm text-gray-500">Häufig benötigte Funktionen</p>
              </div>
              <span className="text-lg">⚡</span>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-400 hover:bg-blue-100 transition-all font-medium text-gray-700">
                <span>📅</span>
                <span>Neuer Termin</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-400 hover:bg-blue-100 transition-all font-medium text-gray-700">
                <span>👤</span>
                <span>Neuer Patient</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-400 hover:bg-blue-100 transition-all font-medium text-gray-700">
                <span>📄</span>
                <span>Neue Rechnung</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-400 hover:bg-blue-100 transition-all font-medium text-gray-700">
                <span>📊</span>
                <span>Übersicht</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
