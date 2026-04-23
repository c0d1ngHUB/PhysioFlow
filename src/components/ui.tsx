// Reusable UI components for PhysioFlow - Medical Practice Design
import { useState, useEffect, useCallback, ReactNode } from 'react';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3',
  };
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-medical-200 border-t-primary rounded-full animate-spin`} />
    </div>
  );
}

// Loading Skeleton Card - Medical Style
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-medical-200 p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-medical-100 rounded-xl skeleton flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-medical-200 rounded skeleton w-20" />
          <div className="h-5 bg-medical-200 rounded skeleton w-32" />
        </div>
        <div className="w-10 h-10 bg-medical-100 rounded-lg skeleton flex-shrink-0" />
      </div>
    </div>
  );
}

// Stats Card Skeleton
export function SkeletonStatsCard() {
  return (
    <div className="bg-white rounded-xl border border-medical-200 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-medical-200 rounded skeleton w-24" />
          <div className="h-8 bg-medical-200 rounded skeleton w-16" />
          <div className="h-3 bg-medical-200 rounded skeleton w-20" />
        </div>
        <div className="w-12 h-12 bg-medical-100 rounded-xl skeleton flex-shrink-0" />
      </div>
    </div>
  );
}

// Table Skeleton
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl border border-medical-200 overflow-hidden">
      <div className="bg-medical-50 border-b border-medical-200 p-3">
        <div className="h-4 bg-medical-200 rounded skeleton w-32" />
      </div>
      <div className="divide-y divide-medical-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-4 bg-medical-200 rounded skeleton flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Large Card Skeleton (for Dashboard) - Medical Style
export function SkeletonCardLarge() {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 bg-medical-200 rounded skeleton w-40" />
          <div className="h-3 bg-medical-200 rounded skeleton w-56" />
        </div>
        <div className="w-10 h-10 bg-medical-100 rounded-xl skeleton" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-medical-50 rounded-xl skeleton" />
        ))}
      </div>
    </div>
  );
}

// Skeleton Row for Tables
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-medical-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-medical-200 rounded skeleton w-full" style={{ maxWidth: i === 0 ? '150px' : '100px' }} />
        </td>
      ))}
    </tr>
  );
}

// Full Page Loading State
export function PageLoader({ message = 'Laden...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <LoadingSpinner size="xl" />
      <p className="text-medical-500 text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

let toastId = 0;
const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

export function showToast(message: string, type: Toast['type'] = 'info') {
  const id = ++toastId;
  toasts = [...toasts, { id, message, type }];
  toastListeners.forEach(cb => cb(toasts));
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(cb => cb(toasts));
  }, 4000);
}

export function ToastContainer() {
  const [, setLocalToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const update = (t: Toast[]) => setLocalToasts([...t]);
    toastListeners.add(update);
    return () => { toastListeners.delete(update); };
  }, []);
  
  if (toasts.length === 0) return null;
  
  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  const styles = {
    success: 'bg-success-600 text-white',
    error: 'bg-error-600 text-white',
    warning: 'bg-warning-500 text-white',
    info: 'bg-primary-600 text-white',
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up flex items-center gap-3 min-w-[300px] ${styles[toast.type]}`}
        >
          {icons[toast.type]}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ERROR & EMPTY STATES
// ============================================================================

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="w-16 h-16 bg-error-50 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">Fehler aufgetreten</h3>
      <p className="text-text-secondary text-center max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 transition-all shadow-md flex items-center gap-2"
        >
          <LoadingSpinner size="xs" />
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-medical-200 p-10 sm:p-16 text-center">
      <div className="w-20 h-20 bg-medical-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-8 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-600 transition-all shadow-md"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };
  
  return (
    <div className={`bg-white rounded-xl border border-medical-200 shadow-card ${hover ? 'card-hoverable cursor-pointer' : ''} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, icon, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-text-primary text-lg">{title}</h3>
          {subtitle && <p className="text-text-secondary text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================================
// BADGE COMPONENTS
// ============================================================================

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

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-4xl',
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-medical-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl ${sizes[size]} w-full max-h-[90vh] overflow-hidden animate-scale-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-medical-100 flex items-center justify-between bg-medical-50/50">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-medical-100 rounded-xl text-medical-500 hover:text-medical-700 transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  loading = false,
  disabled,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-600 hover:shadow-lg shadow-md hover:-translate-y-0.5',
    secondary: 'bg-success text-white hover:bg-success-600 hover:shadow-lg shadow-md hover:-translate-y-0.5',
    outline: 'border-2 border-medical-200 text-text-primary hover:border-medical-300 hover:bg-medical-50 hover:-translate-y-0.5',
    ghost: 'text-medical-600 hover:bg-medical-100 hover:text-medical-800 hover:-translate-y-0.5',
    danger: 'bg-error text-white hover:bg-error-600 hover:shadow-lg shadow-md hover:-translate-y-0.5',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={`font-medium rounded-xl transition-all duration-200 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="xs" />}
      {children}
    </button>
  );
}

// Icon Button
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({ icon, variant = 'default', size = 'md', className = '', ...props }: IconButtonProps) {
  const variants = {
    default: 'bg-medical-100 text-medical-700 hover:bg-medical-200',
    ghost: 'text-medical-500 hover:bg-medical-100 hover:text-medical-700',
    danger: 'text-error hover:bg-error-50',
  };
  
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };
  
  return (
    <button
      className={`rounded-xl transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}

// ============================================================================
// STATS CARD
// ============================================================================

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

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: ReactNode;
}

export function Input({ label, error, helpText, icon, className = '', ...props }: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-medical-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-10' : ''} ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-error flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </p>}
      {helpText && !error && <p className="mt-1.5 text-sm text-medical-500">{helpText}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <textarea
        className={`w-full min-h-[100px] resize-y ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <select
        className={`w-full ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

// ============================================================================
// DATA TABLE
// ============================================================================

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface TableHeadProps {
  children: ReactNode;
}

export function TableHead({ children }: TableHeadProps) {
  return (
    <thead className="bg-medical-50 border-b border-medical-200">
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody className="divide-y divide-medical-100">
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
}

export function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr 
      className={`hover:bg-medical-50/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function TableCell({ children, align = 'left', className = '' }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  return (
    <td className={`py-4 px-4 whitespace-nowrap ${alignClasses[align]} ${className}`}>
      {children}
    </td>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function TableHeader({ children, align = 'left', className = '' }: TableHeaderProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  return (
    <th className={`py-3 px-4 font-semibold text-xs uppercase tracking-wide text-medical-500 ${alignClasses[align]} ${className}`}>
      {children}
    </th>
  );
}

// ============================================================================
// AVATAR
// ============================================================================

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };
  
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return (
    <div className={`${sizes[size]} ${colors[colorIndex]} rounded-xl font-semibold flex items-center justify-center flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

// ============================================================================
// SEARCH INPUT
// ============================================================================

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export function SearchInput({ onClear, className = '', ...props }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-medical-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        className="w-full pl-11 pr-10 py-2.5"
        {...props}
      />
      {props.value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-medical-400 hover:text-medical-600 p-1 rounded-md hover:bg-medical-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TABS
// ============================================================================

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-medical-100 rounded-xl">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-medical-600 hover:text-text-primary'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? 'bg-primary-50 text-primary' : 'bg-medical-200 text-medical-600'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// DIVIDER
// ============================================================================

export function Divider({ text, className = '' }: { text?: string; className?: string }) {
  if (text) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-medical-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-medical-500">{text}</span>
        </div>
      </div>
    );
  }
  
  return <div className={`border-t border-medical-200 ${className}`} />;
}

// ============================================================================
// CONFIRM MODAL
// ============================================================================

interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = 'Bestätigung',
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'default',
}: ConfirmModalProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} size="sm">
      <div className="p-6">
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// TOOLTIP (Simple CSS-based)
// ============================================================================

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-medical-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-medical-800" />
      </div>
    </div>
  );
}