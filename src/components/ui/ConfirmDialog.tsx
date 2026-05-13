import type { ReactNode } from 'react';
import { Button } from './Button';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmDialog({
  busy = false,
  cancelLabel = 'Abbrechen',
  confirmLabel = 'Bestätigen',
  confirmVariant = 'primary',
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        <div className="px-6 py-5 text-sm leading-6 text-slate-600">{description}</div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? 'Bitte warten…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
