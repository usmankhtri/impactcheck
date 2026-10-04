import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileCode,
  CheckCircle2,
  EyeOff,
  Link2,
} from 'lucide-react';
import { Finding, FindingPriority } from '../../types/finding';
import { TOKENS } from './tokens';

interface FindingCardProps {
  finding: Finding;
  onToggleReviewed?: (id: string) => void;
  onDismissFinding?: (id: string) => void;
  onJumpToFile?: (filePath: string) => void;
  isHighlighted?: boolean;
  defaultExpanded?: boolean;
  showActions?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onToggleReviewed,
  onDismissFinding,
  onJumpToFile,
  isHighlighted = false,
  defaultExpanded = true,
  showActions = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getPriorityClasses = (p: FindingPriority) => {
    switch (p) {
      case 'HIGH':
        return TOKENS.status.high;
      case 'MEDIUM':
        return TOKENS.status.medium;
      case 'LOW':
        return TOKENS.status.low;
      default:
        return TOKENS.status.review;
    }
  };

  const priorityStyle = getPriorityClasses(finding.priority);

  return (
    <article
      id={`finding-card-${finding.id}`}
      className={`rounded-lg border transition-all ${priorityStyle.border} ${priorityStyle.bg} ${
        finding.isReviewed ? 'opacity-65' : ''
      } ${
        isHighlighted
          ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 shadow-sm'
          : 'shadow-2xs'
      }`}
    >
      <div className="p-3.5">
        {/* Top Badges & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Severity Badge */}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${priorityStyle.badge}`}
            >
              {finding.priority}
            </span>

            {/* Confidence Badge */}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/50">
              {finding.confidence || 'HIGH'} Conf
            </span>

            {/* Category */}
            <span className="text-[11px] font-medium text-neutral-500 capitalize">
              {finding.category}
            </span>

            {/* Reviewed Indicator */}
            {finding.isReviewed && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" />
                <span>Reviewed</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded cursor-pointer shrink-0"
            aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* 2. Finding Title */}
        <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug mt-2 break-words">
          {finding.title}
        </h4>

        {/* 3. Affected File / Location */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
          {onJumpToFile ? (
            <button
              type="button"
              onClick={() => onJumpToFile(finding.affectedFile)}
              className="hover:text-neutral-950 dark:hover:text-neutral-100 truncate flex items-center gap-1 underline underline-offset-2 cursor-pointer text-left"
              title="Jump to file in diff viewer"
            >
              <FileCode className="h-3 w-3 shrink-0 text-neutral-400" />
              <span className="truncate">{finding.affectedFile}</span>
              {finding.evidence.lineNumber && (
                <span className="shrink-0 text-neutral-500 font-semibold">:{finding.evidence.lineNumber}</span>
              )}
            </button>
          ) : (
            <span className="truncate flex items-center gap-1">
              <FileCode className="h-3 w-3 shrink-0 text-neutral-400" />
              <span className="truncate">{finding.affectedFile}</span>
              {finding.evidence.lineNumber && (
                <span className="shrink-0 text-neutral-500 font-semibold">:{finding.evidence.lineNumber}</span>
              )}
            </span>
          )}
        </div>

        {/* Expandable Body */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
            {/* 4. Evidence Section */}
            {(finding.evidence.beforeSnippet || finding.evidence.afterSnippet || finding.evidence.snippet || (finding.detectionSignals && finding.detectionSignals.length > 1)) && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
                  Evidence
                </div>

                {/* Before / After Evidence */}
                {(finding.evidence.beforeSnippet || finding.evidence.afterSnippet) && (
                  <div className="rounded-md bg-neutral-100/90 dark:bg-neutral-900/80 p-2.5 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] space-y-1.5">
                    {finding.evidence.beforeSnippet && (
                      <div className="text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                        <span className="font-semibold font-sans uppercase text-[10px] text-neutral-500 shrink-0">
                          Before:
                        </span>
                        <span className="break-all">{finding.evidence.beforeSnippet}</span>
                      </div>
                    )}
                    {finding.evidence.afterSnippet && (
                      <div className="text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                        <span className="font-semibold font-sans uppercase text-[10px] text-neutral-500 shrink-0">
                          After:
                        </span>
                        <span className="break-all">{finding.evidence.afterSnippet}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Diff Excerpt */}
                {finding.evidence.snippet && (
                  <pre className="p-2.5 rounded-md bg-[#090b0e] text-neutral-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-neutral-800 max-h-40">
                    {finding.evidence.snippet}
                  </pre>
                )}

                {/* Detection Signals */}
                {finding.detectionSignals && finding.detectionSignals.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">
                      Signals:
                    </span>
                    {finding.detectionSignals.map((sig, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300/60 dark:border-neutral-700/60"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Explanation Section */}
            <div className="space-y-1.5">
              {finding.changeType && (
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    What changed:
                  </span>{' '}
                  {finding.changeType}
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500 mb-1">
                  Why it matters
                </div>
                <p className="leading-relaxed text-neutral-800 dark:text-neutral-200">
                  {finding.explanation}
                </p>
              </div>

              {finding.limitations && (
                <div className="text-[10px] text-neutral-500 italic">
                  Note: {finding.limitations}
                </div>
              )}
            </div>

            {/* Related findings */}
            {finding.relatedFindingIds && finding.relatedFindingIds.length > 0 && (
              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5">
                <Link2 className="h-3 w-3 shrink-0" />
                <span>
                  {finding.relatedFindingIds.length} related review {finding.relatedFindingIds.length === 1 ? 'item' : 'items'} in this file
                </span>
              </div>
            )}

            {/* 6. Suggested Review Action */}
            <div className="rounded-md bg-neutral-100/80 dark:bg-neutral-800/50 p-2.5 border border-neutral-200/80 dark:border-neutral-800">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Suggested review action
              </div>
              <p className="text-neutral-900 dark:text-neutral-100 leading-relaxed font-medium">
                {finding.suggestedAction}
              </p>
            </div>

            {/* Review and Dismiss Actions */}
            {showActions && (
              <div className="flex items-center justify-between pt-1 text-[11px]">
                {onToggleReviewed && (
                  <button
                    type="button"
                    onClick={() => onToggleReviewed(finding.id)}
                    className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {finding.isReviewed ? 'Mark as unreviewed' : 'Mark as reviewed'}
                    </span>
                  </button>
                )}

                {onDismissFinding && (
                  <button
                    type="button"
                    onClick={() => onDismissFinding(finding.id)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="h-3 w-3" />
                    <span>Dismiss</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
