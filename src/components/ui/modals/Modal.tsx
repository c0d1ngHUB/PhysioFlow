import { useEffect, useCallback, ReactNode } from 'react';

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
