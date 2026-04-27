import { ReactNode } from 'react';
import { LoadingSpinner } from '../loading';

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
