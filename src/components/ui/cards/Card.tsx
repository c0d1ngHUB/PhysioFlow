import { ReactNode } from 'react';

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
