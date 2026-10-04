import React from 'react';
import { FileCode, AlertTriangle, ArrowRight, Layers, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { DiffFile } from '../../types/diff';
import { Finding } from '../../types/finding';
import { ChangeMapData } from '../../utils/changeMap';

interface FileDetailsPanelProps {
  file: DiffFile;
  findings: Finding[];
  changeMap?: ChangeMapData;
  onSelectRelatedFile: (filePath: string) => void;
  onClose?: () => void;
}

export const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({
  file,
  findings,
  changeMap,
  onSelectRelatedFile,
  onClose,
}) => {
  const fileFindings = findings.filter(
    (f) => !f.isDismissed && f.affectedFile === file.newPath
  );

  // Find related edges
  const relatedEdges = changeMap?.edges.filter(
    (e) => e.source === file.id || e.target === file.id
  ) || [];

  const ext = file.newPath.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 space-y-4 text-xs shadow-xs">
      <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">
            File Overview
          </span>
          <h4 className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5 truncate max-w-xs">
            {file.newPath}
          </h4>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 font-sans">Status</div>
          <div className="font-semibold uppercase text-neutral-800 dark:text-neutral-200 mt-0.5">{file.status}</div>
        </div>
        <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 font-sans">Lines Changed</div>
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
            <span className="text-emerald-600">+{file.additions}</span> / <span className="text-rose-600">-{file.deletions}</span>
          </div>
        </div>
        <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 font-sans">Findings</div>
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">{fileFindings.length}</div>
        </div>
      </div>

      {/* Concerns for this file */}
      {fileFindings.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            Detected Review Items ({fileFindings.length})
          </div>
          <div className="space-y-1.5">
            {fileFindings.map((f) => (
              <div
                key={f.id}
                className="p-2 rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 text-[11px]"
              >
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>{f.title}</span>
                </div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-0.5 leading-snug">
                  {f.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related files in Change Map */}
      {relatedEdges.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            Connected Files in Change Map
          </div>
          <div className="space-y-1 text-[11px]">
            {relatedEdges.map((e) => {
              const otherNodeId = e.source === file.id ? e.target : e.source;
              const otherNode = changeMap?.nodes.find((n) => n.id === otherNodeId);
              if (!otherNode) return null;

              return (
                <button
                  key={e.id}
                  onClick={() => onSelectRelatedFile(otherNode.filePath)}
                  className="w-full p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-left flex items-center justify-between text-neutral-700 dark:text-neutral-300 group cursor-pointer"
                >
                  <span className="font-mono truncate">{otherNode.fileName}</span>
                  <span className="text-[10px] text-neutral-400 font-sans flex items-center gap-0.5">
                    <span>{e.label}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
