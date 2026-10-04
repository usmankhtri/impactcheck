import React from 'react';
import { Layers } from 'lucide-react';

interface LoadingStateProps {
  stepText: string;
  subText?: string;
  progressPercent?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  stepText = 'Analyzing changes...',
  subText = 'Running local deterministic heuristics across files and dependencies',
  progressPercent,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto my-auto animate-in fade-in duration-200">
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 mb-4 shadow-2xs">
        <Layers className="h-5 w-5 stroke-[1.5] motion-safe:animate-pulse" />
      </div>

      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
        {stepText}
      </h4>

      {subText && (
        <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-relaxed">
          {subText}
        </p>
      )}

      {progressPercent !== undefined && (
        <div className="w-48 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
};
