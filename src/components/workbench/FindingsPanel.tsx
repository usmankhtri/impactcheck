import React, { useState } from 'react';
import { Finding, FindingCategory, FindingPriority } from '../../types/finding';
import { FindingCard } from '../design-system/FindingCard';
import { EmptyState } from '../design-system/EmptyState';
import { AlertCircle } from 'lucide-react';

interface FindingsPanelProps {
  findings: Finding[];
  onToggleReviewed: (id: string) => void;
  onDismissFinding: (id: string) => void;
  onJumpToFile: (filePath: string) => void;
  selectedFindingId?: string | null;
  totalSignals?: number;
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({
  findings,
  onToggleReviewed,
  onDismissFinding,
  onJumpToFile,
  selectedFindingId,
  totalSignals,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<FindingPriority | 'all'>('all');

  const activeFindings = findings.filter((f) => !f.isDismissed);

  const filteredFindings = activeFindings.filter((f) => {
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (selectedPriority !== 'all' && f.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] border-l border-neutral-200 dark:border-neutral-800">
      {/* Panel Header & Filters */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[11px]">
              Unique Findings ({filteredFindings.length})
            </span>
            {totalSignals !== undefined && totalSignals > activeFindings.length && (
              <span className="text-[10px] text-neutral-400 font-mono ml-1.5">
                ({totalSignals} signals)
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            {activeFindings.filter((f) => f.isReviewed).length} reviewed
          </span>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] py-0.5">
          {(['all', 'HIGH', 'MEDIUM', 'REVIEW', 'LOW'] as const).map((p) => {
            const count =
              p === 'all'
                ? activeFindings.length
                : activeFindings.filter((f) => f.priority === p).length;

            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer shrink-0 ${
                  selectedPriority === p
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {p} ({count})
              </button>
            );
          })}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] py-0.5">
          {(
            [
              'all',
              'api',
              'authorization',
              'authentication',
              'database',
              'dependencies',
              'configuration',
              'tests',
            ] as const
          ).map((c) => {
            const count =
              c === 'all'
                ? activeFindings.length
                : activeFindings.filter((f) => f.category === c).length;

            if (c !== 'all' && count === 0) return null;

            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2 py-0.5 rounded text-xs capitalize transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === c
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredFindings.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No findings match filter"
            description="Adjust your priority or category filters to view other review items."
          />
        ) : (
          filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onToggleReviewed={onToggleReviewed}
              onDismissFinding={onDismissFinding}
              onJumpToFile={onJumpToFile}
              isHighlighted={selectedFindingId === finding.id}
              defaultExpanded={true}
              showActions={true}
            />
          ))
        )}
      </div>
    </div>
  );
};
