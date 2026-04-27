import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-medical-100 text-medical-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    info: 'bg-primary-50 text-primary-700',
    neutral: 'bg-medical-100 text-medical-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

// Status Badge with dot
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
  children: ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = {
    active: { dot: 'bg-success-500', bg: 'bg-success-50', text: 'text-success-700' },
    inactive: { dot: 'bg-medical-400', bg: 'bg-medical-100', text: 'text-medical-600' },
    pending: { dot: 'bg-warning-500', bg: 'bg-warning-50', text: 'text-warning-700' },
    completed: { dot: 'bg-primary-500', bg: 'bg-primary-50', text: 'text-primary-700' },
    cancelled: { dot: 'bg-error-500', bg: 'bg-error-50', text: 'text-error-700' },
  };

  const style = styles[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {children}
    </span>
  );
}
