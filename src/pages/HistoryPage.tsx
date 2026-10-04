import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  History,
  Trash2,
  Edit2,
  Check,
  ArrowRight,
  FileCode,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { EmptyState } from '../components/design-system/EmptyState';
import { ConfirmDialog } from '../components/design-system/ConfirmDialog';
import { useToast } from '../components/design-system/ToastContext';
import {
  getHistory,
  deleteHistoryEntry,
  renameHistoryEntry,
  clearAllHistory,
  HistoryEntry,
} from '../services/historyService';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, info } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleOpen = (entry: HistoryEntry) => {
    // Navigate to workbench with entry
    navigate('/app');
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
    success('Analysis renamed');
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidateId) return;
    const updated = deleteHistoryEntry(deleteCandidateId);
    setHistory(updated);
    setDeleteCandidateId(null);
    info('Analysis removed from local history');
  };

  const handleConfirmClearAll = () => {
    clearAllHistory();
    setHistory([]);
    setShowClearConfirm(false);
    info('All local history cleared');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Analysis history
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Reopen recent analyses stored on this device.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Content */}
        {history.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={History}
              title="No analyses yet."
              description="Your recent analyses will appear here. All history remains strictly local in your browser storage."
              action={{
                label: 'Analyze changes',
                onClick: () => navigate('/app'),
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0 space-y-1.5 flex-1">
                  {editingId === entry.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-xs text-neutral-900 dark:text-neutral-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(entry.id)}
                        className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        title="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                        {entry.name}
                      </span>
                      <button
                        onClick={() => handleStartRename(entry)}
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                        title="Rename analysis"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 font-mono">
                    <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{entry.totalFiles} files changed</span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">+{entry.totalAdditions}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{entry.totalDeletions}</span>
                    <span>·</span>
                    <span>{entry.findingsCount} findings</span>
                    {entry.highPriorityCount > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        ({entry.highPriorityCount} high)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpen(entry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => setDeleteCandidateId(entry.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete entry"
                    aria-label="Delete analysis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Single Entry Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCandidateId}
        title="Delete this analysis?"
        message="This analysis snapshot will be removed from your browser's local history. This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidateId(null)}
      />

      {/* Clear All Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear entire analysis history?"
        message="All saved analysis snapshots stored in this browser will be permanently deleted."
        confirmLabel="Clear All"
        isDestructive={true}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />

      <Footer />
    </div>
  );
};
