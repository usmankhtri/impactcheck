import React, { useState } from 'react';
import {
  FileCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  EyeOff,
} from 'lucide-react';
import { Finding } from '../../types/finding';

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
  showActions = true,
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const hasEvidence = Boolean(
    finding.evidence.beforeSnippet ||
    finding.evidence.afterSnippet ||
    finding.evidence.snippet
  );

  const formatCodeExcerpt = (raw?: string) => {
    if (!raw) return '';
    if (finding.evidence.beforeSnippet) return raw;
    return raw
      .split('\n')
      .map((l) => l.replace(/^[+-]\s?/, ''))
      .join('\n');
  };

  return (
    <article
      id={`finding-card-${finding.id}`}
      className={`p-3.5 rounded-lg border transition-all ${
        finding.isReviewed ? 'opacity-60 bg-neutral-50/50 dark:bg-neutral-900/20' : 'bg-white dark:bg-[#0e1117]'
      } ${
        isHighlighted
          ? 'border-neutral-900 dark:border-white ring-1 ring-neutral-900 dark:ring-white'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      {/* 1. What changed (Title) */}
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-xs sm:text-sm font-semibold text-neutral-950 dark:text-white leading-snug break-words">
          {finding.title}
        </h4>
        {finding.isReviewed && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            <span>Reviewed</span>
          </span>
        )}
      </div>

      {/* 2. Severity and Confidence (clean typography, no giant pills) */}
      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-500">
        <span
          className={
            finding.priority === 'HIGH'
              ? 'text-rose-600 dark:text-rose-400 font-semibold'
              : finding.priority === 'MEDIUM'
              ? 'text-amber-600 dark:text-amber-400 font-medium'
              : 'text-neutral-500'
          }
        >
          {finding.priority}
        </span>
        <span>·</span>
        <span>{finding.confidence || 'HIGH'} CONFIDENCE</span>
      </div>

      {/* 3. Why does it matter (Explanation) */}
      <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
        {finding.explanation}
      </p>

      {/* 4. Where (Location) */}
      <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-neutral-500 truncate">
        <FileCode className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <span className="truncate">
          {finding.affectedFile}
          {finding.evidence.lineNumber ? `:${finding.evidence.lineNumber}` : ''}
        </span>
      </div>

      {/* 5. What should I review? (Recommendation) */}
      {finding.suggestedAction && (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          <span className="font-semibold text-neutral-900 dark:text-neutral-200">Review: </span>
          {finding.suggestedAction}
        </div>
      )}

      {/* Expandable Evidence Snippet (if available) */}
      {showEvidence && hasEvidence && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs font-mono">
          {finding.evidence.beforeSnippet && (
            <div className="p-2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
              <span className="font-sans uppercase text-[10px] text-neutral-400 block mb-0.5">Before:</span>
              <span className="break-all">{finding.evidence.beforeSnippet}</span>
            </div>
          )}
          {finding.evidence.afterSnippet && (
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] leading-relaxed">
              <span className="font-sans uppercase text-[10px] text-neutral-400 block mb-0.5">
                {finding.evidence.beforeSnippet ? 'After:' : 'Detected code:'}
              </span>
              <span className="break-all">{formatCodeExcerpt(finding.evidence.afterSnippet)}</span>
            </div>
          )}
          {finding.evidence.snippet && !finding.evidence.beforeSnippet && !finding.evidence.afterSnippet && (
            <div>
              <span className="font-sans uppercase text-[10px] text-neutral-400 block mb-0.5">
                Code excerpt:
              </span>
              <pre className="p-2 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-[11px] overflow-x-auto">
                {formatCodeExcerpt(finding.evidence.snippet)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions Row */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {onJumpToFile && (
            <button
              type="button"
              onClick={() => onJumpToFile(finding.affectedFile)}
              className="text-neutral-900 dark:text-neutral-100 hover:underline font-medium text-[11px] cursor-pointer inline-flex items-center gap-1"
            >
              <span>View code</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {hasEvidence && (
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-[11px] cursor-pointer inline-flex items-center gap-0.5"
            >
              <span>{showEvidence ? 'Hide evidence' : 'View evidence'}</span>
              {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {onToggleReviewed && (
              <button
                type="button"
                onClick={() => onToggleReviewed(finding.id)}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
              >
                {finding.isReviewed ? 'Unmark' : 'Mark reviewed'}
              </button>
            )}
            {onDismissFinding && (
              <button
                type="button"
                onClick={() => onDismissFinding(finding.id)}
                className="text-[11px] text-neutral-400 hover:text-rose-600 cursor-pointer"
                title="Dismiss finding"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
