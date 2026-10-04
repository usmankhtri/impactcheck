import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast]);
  const info = useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] text-neutral-900 dark:text-neutral-100 shadow-lg text-xs animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />}
              {t.type === 'info' && <Info className="h-4 w-4 text-neutral-500 shrink-0" />}
              <span className="leading-snug truncate">{t.message}</span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 shrink-0 cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
