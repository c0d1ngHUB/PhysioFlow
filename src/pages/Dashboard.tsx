import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { DashboardStats } from '../types';
import type { Page } from '../navigation';
import { apiFetch } from '../utils/api.js';

type ExtendedStats = Omit<DashboardStats, 'today_details'> & {
  today_details: Array<{ id: number; time_start: string; time_end: string; patient_name: string; treatment_type: string; sms_reminder: number }>;
  unpaid_invoices_total: number;
  this_month_appointments: number;
  this_month_revenue: number;
  last_month_revenue: number;
  upcoming_this_week: Array<{ id: number; date: string; time_start: string; patient_name: string; treatment_type: string }>;
  six_months_revenue: { month: string; revenue: number }[];
};

interface DashboardProps {
  onNavigate: (page: Page, modal?: string | null) => void;
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[140px] flex-col items-start justify-between rounded-xl border border-red-200 bg-red-50 p-5">
      <div>
        <p className="text-sm font-semibold text-red-800">Daten konnten nicht geladen werden</p>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </div>
      <button onClick={onRetry} className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
        Erneut laden
      </button>
    </div>
  );
}

function StatCard({ label, value, hint, accent = 'blue' }: { label: string; value: string | number | ReactNode; hint: string; accent?: 'blue' | 'emerald' | 'amber' | 'purple' }) {
  const accentClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
  }[accent];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-1.5 w-14 rounded-full border ${accentClasses}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    setError('');
    try {
      const today = new Date();
      const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const res = await apiFetch(`/api/dashboard?date=${selectedDate}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setLoading(false);
        return;
      }
      setStats(null);
      setError(data.error || 'Das Dashboard ist derzeit nicht erreichbar.');
    } catch {
      setStats(null);
      setError('Das Dashboard konnte nicht geladen werden. Bitte versuchen Sie es erneut.');
    }
    setLoading(false);
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

  const todaysNextAppointment = stats?.today_details?.[0];
  const openInvoiceCount = stats?.unpaid_invoices || 0;
  const openInvoiceAmount = stats?.unpaid_invoices_total || 0;
  const revenueDiff = (stats?.this_month_revenue || 0) - (stats?.last_month_revenue || 0);
  const revenuePct = stats?.last_month_revenue && stats.last_month_revenue > 0
    ? Math.round((revenueDiff / stats.last_month_revenue) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Auswertung</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">{getGreeting()}, Markus</h1>
            <p className="mt-2 text-slate-500">
              {currentTime.toLocaleDateString('de-AT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => onNavigate('calendar', 'appointment')} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              + Termin
            </button>
            <button onClick={() => onNavigate('invoices', 'invoice')} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100">
              + Honorarnote
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <WidgetError message={error} onRetry={fetchStats} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Heute</p>
                  <p className="mt-3 text-4xl font-semibold text-slate-950">{stats?.today_appointments || 0}</p>
                  <p className="mt-1 text-sm text-slate-600">{stats?.today_appointments === 1 ? 'Termin geplant' : 'Termine geplant'}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-sm">
                  {currentTime.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {todaysNextAppointment ? (
                <div className="mt-6 rounded-xl border border-blue-100 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nächster Termin</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{todaysNextAppointment.patient_name}</p>
                      <p className="text-sm text-slate-500">{todaysNextAppointment.treatment_type}</p>
                    </div>
                    <p className="rounded-lg bg-blue-50 px-3 py-2 font-mono text-sm font-semibold text-blue-700">
                      {todaysNextAppointment.time_start}–{todaysNextAppointment.time_end}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-blue-100 bg-white p-4">
                  <p className="font-medium text-slate-800">Keine Termine geplant</p>
                  <p className="mt-1 text-sm text-slate-500">Der Tag ist frei — oder bereit für neue Behandlungen.</p>
                  <button onClick={() => onNavigate('calendar', 'appointment')} className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-900">
                    + Termin erstellen
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Finanzen</p>
                  <p className="mt-3 text-4xl font-semibold text-slate-950">{openInvoiceCount ? formatCurrency(openInvoiceAmount) : 'Alles bezahlt'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {openInvoiceCount ? `${openInvoiceCount} offene ${openInvoiceCount === 1 ? 'Honorarnote' : 'Honorarnoten'}` : 'Keine offenen Honorarnoten'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-amber-700 shadow-sm">Offen</div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button onClick={() => onNavigate('invoices')} className="rounded-xl border border-amber-100 bg-white px-4 py-3 text-left text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-50">
                  Zu Finanzen →
                </button>
                <button onClick={() => onNavigate('invoices', 'invoice')} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-left text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50">
                  + Honorarnote
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Diese Woche" value={stats?.upcoming_appointments || 0} hint={stats?.upcoming_appointments ? 'anstehende Termine' : 'keine Termine diese Woche'} accent="blue" />
            <StatCard label="Patient:innen" value={stats?.total_patients || 0} hint="registriert" accent="purple" />
            <StatCard label={`Umsatz ${currentTime.toLocaleDateString('de-AT', { month: 'long' })}`} value={stats?.this_month_revenue ? formatCurrency(stats.this_month_revenue) : '0 €'} hint={`${revenueDiff >= 0 ? '+' : '−'}${formatCurrency(Math.abs(revenueDiff))} / ${Math.abs(revenuePct)}% vs. Vormonat`} accent="emerald" />
            <StatCard label="Monat" value={stats?.this_month_appointments || 0} hint={stats?.this_month_appointments ? 'Behandlungen durchgeführt' : 'noch keine Behandlungen'} accent="blue" />
          </div>

          {stats?.six_months_revenue && stats.six_months_revenue.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">Umsatzentwicklung</h3>
                    <p className="text-sm text-slate-500">Letzte 6 Monate · bezahlte Honorarnoten</p>
                  </div>
                  <span className="text-sm font-medium text-slate-500">{formatCurrency(stats.this_month_revenue || 0)} aktuell</span>
                </div>
              </div>
              <div className="p-6 overflow-x-auto">
                {(() => {
                  const maxRev = Math.max(...stats.six_months_revenue.map(m => m.revenue), 1);
                  return (
                    <div className="flex min-w-[360px] items-end gap-4 h-44">
                      {stats.six_months_revenue.map((m, i) => {
                        const heightPct = Math.max((m.revenue / maxRev) * 100, 3);
                        const isCurrentMonth = i === stats.six_months_revenue.length - 1;
                        return (
                          <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                            <div className="flex h-32 w-full items-end justify-center rounded-xl bg-slate-50 px-2">
                              <div
                                className={`w-full max-w-12 rounded-t-lg ${isCurrentMonth ? 'bg-blue-600' : 'bg-blue-200'}`}
                                style={{ height: `${heightPct}%` }}
                                title={formatCurrency(m.revenue)}
                              />
                            </div>
                            <span className={`text-xs font-medium ${isCurrentMonth ? 'text-blue-700' : 'text-slate-500'}`}>{m.month}</span>
                            <span className="text-[11px] text-slate-500">{formatCurrency(m.revenue)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="font-semibold text-slate-950">Heutige Termine</h3>
                <p className="text-sm text-slate-500">{stats?.today_appointments || 0} Termine geplant</p>
              </div>
              <div className="p-5">
                {stats?.today_details && stats.today_details.length > 0 ? (
                  <div className="space-y-3">
                    {stats.today_details.map((apt) => (
                      <div key={apt.id} className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <div className="flex h-12 w-14 flex-col items-center justify-center rounded-lg bg-white font-mono shadow-sm">
                          <span className="text-sm font-bold text-slate-800">{apt.time_start.split(':')[0]}</span>
                          <span className="text-xs text-slate-500">{apt.time_start.split(':')[1]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-950">{apt.patient_name}</p>
                          <p className="truncate text-sm text-slate-500">{apt.treatment_type}</p>
                        </div>
                        {apt.sms_reminder === 1 && <span className="text-xs font-medium text-emerald-600">SMS</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <p className="font-medium text-slate-700">Keine Termine heute</p>
                    <button onClick={() => onNavigate('calendar', 'appointment')} className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-900">+ Termin erstellen</button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="font-semibold text-slate-950">Nächste Termine</h3>
                <p className="text-sm text-slate-500">{stats?.upcoming_this_week?.length || 0} anstehende Termine diese Woche</p>
              </div>
              <div className="p-5">
                {stats?.upcoming_this_week && stats.upcoming_this_week.length > 0 ? (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {stats.upcoming_this_week.map((apt) => {
                      const date = new Date(apt.date + 'T00:00:00');
                      return (
                        <div key={apt.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50">
                          <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                            <span>{date.toLocaleDateString('de-AT', { day: '2-digit' })}</span>
                            <span className="text-[10px] uppercase">{date.toLocaleDateString('de-AT', { weekday: 'short' })}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-950">{apt.patient_name}</p>
                            <p className="truncate text-xs text-slate-500">{apt.time_start} · {apt.treatment_type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <p className="font-medium text-slate-700">Keine Termine diese Woche</p>
                    <p className="mt-1 text-sm text-slate-500">Der Kalender ist aktuell frei.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
