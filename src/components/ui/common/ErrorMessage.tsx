import { LoadingSpinner } from '../loading';

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
