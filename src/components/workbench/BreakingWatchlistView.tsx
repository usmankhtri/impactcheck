import React from 'react';
import { AlertOctagon, FileCode, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';
import { BreakingChangeItem } from '../../utils/breakingWatchlist';

interface BreakingWatchlistViewProps {
  watchlist: BreakingChangeItem[];
  onSelectFile: (filePath: string) => void;
}

export const BreakingWatchlistView: React.FC<BreakingWatchlistViewProps> = ({
  watchlist,
  onSelectFile,
}) => {
  if (watchlist.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-500">
        <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 stroke-1" />
        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
          No obvious breaking change signals detected
        </div>
        <p className="mt-1 max-w-sm text-neutral-400">
          No removed public exports, destructive database statements, or route contract breaks were flagged in this changeset.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] overflow-y-auto p-4 space-y-4">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-rose-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Breaking Change Watchlist ({watchlist.length})
          </h3>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
          Surfaces modifications that commonly break consumers, dependent modules, or downstream deployment stages.
        </p>
      </div>

      <div className="space-y-3">
        {watchlist.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 p-3.5 space-y-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    Potential Breaking Change
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400">
                    {item.category}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                  {item.title}
                </h4>
              </div>

              <button
                onClick={() => onSelectFile(item.affectedFile)}
                className="text-[11px] font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 underline underline-offset-2 shrink-0 cursor-pointer"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Jump to file</span>
              </button>
            </div>

            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {item.description}
            </p>

            {item.snippet && (
              <pre className="p-2 rounded bg-neutral-950 text-neutral-200 font-mono text-[11px] overflow-x-auto border border-neutral-800">
                {item.snippet}
              </pre>
            )}

            <div className="rounded bg-white/70 dark:bg-neutral-900/60 p-2.5 border border-neutral-200 dark:border-neutral-800/80 text-[11px]">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Remediation:
              </span>{' '}
              <span className="text-neutral-600 dark:text-neutral-400">{item.remediation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
