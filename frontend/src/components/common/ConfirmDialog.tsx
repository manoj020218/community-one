import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../../utils/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shared "are you sure" dialog for delete/disable actions across Residents, Towers, Floors, Flats. */
export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Delete', danger = true, isPending, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <div className={cn('flex items-start gap-3 p-3 rounded-xl', danger ? 'bg-red-50' : 'bg-amber-50')}>
          <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', danger ? 'text-red-500' : 'text-amber-500')} />
          <div className={cn('text-sm', danger ? 'text-red-700' : 'text-amber-700')}>{message}</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors', danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600', 'disabled:opacity-60')}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Working...</> : confirmLabel}
          </button>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
