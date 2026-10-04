import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { ReviewChecklistItem } from '../../types/checklist';

interface ReviewChecklistProps {
  items: ReviewChecklistItem[];
  onToggleItem: (id: string) => void;
  onAddItem: (title: string, category: string) => void;
  onDeleteItem: (id: string) => void;
}

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Manual');

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 100;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddItem(newTitle.trim(), newCategory);
    setNewTitle('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] border-l border-neutral-200 dark:border-neutral-800">
      {/* Header with progress */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[11px]">
            Review Checklist
          </span>
          <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
            {completedCount}/{items.length} completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Checklist is empty.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-3 p-2.5 rounded border transition-colors ${
                item.completed
                  ? 'border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/30 text-neutral-400 dark:text-neutral-500'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <button
                onClick={() => onToggleItem(item.id)}
                className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer group"
              >
                <div className="mt-0.5 shrink-0 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-medium leading-relaxed ${
                      item.completed ? 'line-through' : ''
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Area: {item.category}
                  </div>
                </div>
              </button>

              {item.isCustom && (
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="text-neutral-400 hover:text-rose-500 p-1 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Custom Item */}
      <form onSubmit={handleAdd} className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <input
          type="text"
          placeholder="Add custom check item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 h-8 px-2.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="h-8 px-3 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 cursor-pointer flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>
      </form>
    </div>
  );
};
