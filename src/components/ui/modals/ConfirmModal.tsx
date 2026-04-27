import { Button } from '../common';
import { Modal } from './Modal';

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
