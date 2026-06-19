import { type ReactNode, useEffect, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  HeartPulse,
  Inbox,
  Receipt,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { apiFetch } from '../lib/api';
import { DashboardStats } from '../types';

type ExtendedStats = Omit<DashboardStats, 'today_details'> & {
  today_details: Array<{
    id: number;
    patient_name: string;
    treatment_type: string;
    time_start: string;
    time_end: string;
    sms_reminder: number;
  }>;
  unpaid_invoices_total: number;
  this_month_appointments: number;
  this_month_revenue: number;
  last_month_revenue: number;
  upcoming_this_week: Array<{
    id?: number;
    date: string;
    patient_name: string;
    treatment_type: string;
    time_start: string;
    time_end: string;
  }>;
  six_months_revenue: { month: string; revenue: number }[];
};

type DashboardProps = {
  onNavigate?: (page: 'dashboard' | 'calendar' | 'patients' | 'invoices' | 'expenses') => void;
  onQuickAction?: (action: 'newAppointment' | 'newPatient' | 'newInvoice' | 'overview') => void;
};

type StatCardProps = {
  title: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
};

const statToneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-700',
};

function StatCard({ detail, icon, title, tone = 'blue', value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{detail}</p>
        </div>
        <div className={['flex h-11 w-11 items-center justify-center rounded-xl', statToneClasses[tone]].join(' ')}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard({ onNavigate, onQuickAction }: DashboardProps) {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());


  useEffect(() => {
    fetchStats();


    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/dashboard');
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


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };


  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={getGreeting()}
        description={currentTime.toLocaleDateString('de-AT', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
        icon={<HeartPulse className="h-6 w-6" />}
        badge={<Badge variant="info">Dashboard</Badge>}
        actions={
          <Button
            variant="secondary"
            icon={<CalendarDays className="h-4 w-4" />}
            onClick={() => (onQuickAction ? onQuickAction('newAppointment') : onNavigate?.('calendar'))}
          >
            Neuer Termin
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Heute"
          value={stats?.today_appointments || 0}
          detail="Termine geplant"
          icon={<CalendarDays className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          title="Diese Woche"
          value={stats?.upcoming_appointments || 0}
          detail="Anstehende Behandlungen"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Offene Rechnungen"
          value={stats?.unpaid_invoices || 0}
          detail={formatCurrency(stats?.unpaid_invoices_total || 0)}
          icon={<Receipt className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Patienten"
          value={stats?.total_patients || 0}
          detail="Registriert"
          icon={<Users className="h-5 w-5" />}
          tone="slate"
        />
      </div>



      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Heutige Termine</CardTitle>
            <CardDescription>{stats?.today_appointments || 0} Termine geplant</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.today_details && stats.today_details.length > 0 ? (
              <div className="space-y-3">
                {stats.today_details.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex h-12 w-14 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                      <span className="text-sm font-semibold">{apt.time_start.split(':')[0]}</span>
                      <span className="text-xs text-slate-500">{apt.time_start.split(':')[1]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{apt.patient_name}</p>
                      <p className="text-sm text-slate-500">{apt.treatment_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{apt.time_end}</p>
                      {apt.sms_reminder === 1 && <Badge variant="success">SMS aktiv</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Inbox className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-600">Keine Termine heute</p>
                <p className="mt-1 text-sm text-slate-400">Genießen Sie Ihren freien Tag.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diese Woche</CardTitle>
            <CardDescription>{stats?.upcoming_this_week?.length || 0} anstehende Termine</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.upcoming_this_week && stats.upcoming_this_week.length > 0 ? (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {stats.upcoming_this_week.map((apt, idx) => {
                  const date = new Date(`${apt.date}T00:00:00`);
                  const today = new Date().toISOString().slice(0, 10);
                  const isToday = apt.date === today;

                  return (
                    <div key={apt.id || idx} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                      <div
                        className={[
                          'flex h-11 w-11 flex-col items-center justify-center rounded-xl text-xs font-semibold',
                          isToday ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700',
                        ].join(' ')}
                      >
                        <span>{date.toLocaleDateString('de-AT', { day: '2-digit' })}</span>
                        <span className="text-[10px] uppercase">
                          {date.toLocaleDateString('de-AT', { weekday: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{apt.patient_name}</p>
                        <p className="text-xs text-slate-500">
                          {apt.time_start} - {apt.time_end} · {apt.treatment_type}
                        </p>
                      </div>
                      {isToday && <Badge variant="info">Heute</Badge>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Inbox className="h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium text-slate-600">Keine Termine diese Woche</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.six_months_revenue && stats.six_months_revenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Umsatzübersicht</CardTitle>
            <CardDescription>Letzte 6 Monate, basierend auf bezahlten Honorarnoten</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxRev = Math.max(...stats.six_months_revenue.map((month) => month.revenue), 1);

              return (
                <div className="flex h-48 items-end gap-3">
                  {stats.six_months_revenue.map((month, index) => {
                    const heightPct = Math.max((month.revenue / maxRev) * 100, 6);
                    const isCurrentMonth = index === stats.six_months_revenue.length - 1;

                    return (
                      <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-36 w-full items-end justify-center">
                          <div
                            className={[
                              'w-full max-w-12 rounded-t-xl transition-all',
                              isCurrentMonth ? 'bg-slate-900' : 'bg-blue-200',
                            ].join(' ')}
                            style={{ height: `${heightPct}%` }}
                            title={formatCurrency(month.revenue)}
                          />
                        </div>
                        <span className={['text-xs font-medium', isCurrentMonth ? 'text-slate-900' : 'text-slate-500'].join(' ')}>
                          {month.month}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatCurrency(month.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}


    </div>
  );
}

export default Dashboard;
