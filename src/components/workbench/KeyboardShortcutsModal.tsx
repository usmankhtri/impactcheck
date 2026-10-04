import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Keyboard Escape and body scroll lock
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: '?', description: 'Open keyboard shortcuts dialog' },
    { key: 'j / ↓', description: 'Jump to next review finding' },
    { key: 'k / ↑', description: 'Jump to previous review finding' },
    { key: 'f', description: 'Focus file search input' },
    { key: 'u', description: 'Switch to unified diff mode' },
    { key: 's', description: 'Switch to split side-by-side diff mode' },
    { key: 'i', description: 'Open project import modal' },
    { key: 'e', description: 'Open export report modal' },
    { key: 'Esc', description: 'Close modals / dialogs' },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl p-4 sm:p-5 space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1">
              <span className="text-neutral-600 dark:text-neutral-400">{s.description}</span>
              <kbd className="px-2 py-0.5 rounded font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded hover:bg-neutral-800"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
