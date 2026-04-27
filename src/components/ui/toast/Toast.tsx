import { useState, useEffect } from 'react';

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
