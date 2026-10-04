import React, { useState } from 'react';
import { History, X, Trash2, Edit2, Check, ArrowRight, Clock, FileCode } from 'lucide-react';
import {
  HistoryEntry,
  getHistory,
  deleteHistoryEntry,
  renameHistoryEntry,
  clearAllHistory,
} from '../../services/historyService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadEntry: (entry: HistoryEntry) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadEntry,
}) => {
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleDelete = (id: string) => {
    const updated = deleteHistoryEntry(id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    clearAllHistory();
    setHistory([]);
  };

  const handleStartRename = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
  };

  const handleSaveRename = (id: string) => {
    if (!editName.trim()) return;
    const updated = renameHistoryEntry(id, editName.trim());
    setHistory(updated);
    setEditingId(null);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl p-4 sm:p-6 space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Local Analysis History ({history.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Clear all history
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Recent analyses are preserved locally in browser storage. Clearing browser cache resets this list.
        </p>

        <div className="max-h-80 overflow-y-auto space-y-2.5">
          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No recent analyses stored yet.
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#14171d] flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  {editingId === entry.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(entry.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {entry.name}
                      </span>
                      <button
                        onClick={() => handleStartRename(entry)}
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 mt-1 font-mono">
                    <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{entry.totalFiles} files</span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">+{entry.totalAdditions}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{entry.totalDeletions}</span>
                    <span>·</span>
                    <span>{entry.findingsCount} findings</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onLoadEntry(entry);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
