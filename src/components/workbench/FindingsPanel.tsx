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
}) => {
  const [selectedPriority, setSelectedPriority] = useState<FindingPriority | 'all'>('all');

  const activeFindings = findings.filter((f) => !f.isDismissed);

  const filteredFindings = activeFindings.filter((f) => {
    if (selectedPriority !== 'all' && f.priority !== selectedPriority) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] border-l border-neutral-200 dark:border-neutral-800">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
            Findings ({filteredFindings.length})
          </h3>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 text-[11px]">
          {(['all', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => {
            const count =
              p === 'all'
                ? activeFindings.length
                : activeFindings.filter((f) => f.priority === p).length;

            if (p !== 'all' && count === 0) return null;

            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  selectedPriority === p
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {p === 'all' ? 'All' : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredFindings.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No findings match filter"
            description="Adjust your priority filter to view other review items."
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
              showActions={true}
            />
          ))
        )}
      </div>
    </div>
  );
};
