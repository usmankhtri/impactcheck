import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  // Keyboard Escape and body scroll lock
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl p-4 sm:p-5 space-y-4 my-auto"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-md ${
                isDestructive
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          id="confirm-dialog-desc"
          className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
        >
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
