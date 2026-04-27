import { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: { value: number; positive: boolean };
}

export function StatsCard({
  label,
  value,
  subtext,
  icon,
  color = 'primary',
  trend
}: StatsCardProps) {
  const colors = {
    primary: { bg: 'bg-primary-50', icon: 'text-primary', border: 'border-primary-100' },
    success: { bg: 'bg-success-50', icon: 'text-success', border: 'border-success-100' },
    warning: { bg: 'bg-warning-50', icon: 'text-warning', border: 'border-warning-100' },
    error: { bg: 'bg-error-50', icon: 'text-error', border: 'border-error-100' },
    info: { bg: 'bg-medical-50', icon: 'text-medical-600', border: 'border-medical-200' },
  };

  const c = colors[color];

  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 card-hoverable shadow-card`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-medical-500 font-medium mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-text-primary">{value}</p>
          {subtext && <p className={`text-sm mt-1 ${c.icon}`}>{subtext}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${trend.positive ? 'text-success' : 'text-error'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.positive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center text-2xl ${c.icon} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
