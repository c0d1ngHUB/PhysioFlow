import { ReactNode } from 'react';

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
