import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type CardSectionProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={['border-b border-slate-100 px-5 py-4 sm:px-6', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: CardSectionProps) {
  return (
    <div className={['px-5 py-4 sm:px-6 sm:py-5', className].join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: CardSectionProps) {
  return (
    <h3 className={['text-base font-semibold text-slate-900', className].join(' ')} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }: CardSectionProps) {
  return (
    <p className={['mt-1 text-sm text-slate-500', className].join(' ')} {...props}>
      {children}
    </p>
  );
}
