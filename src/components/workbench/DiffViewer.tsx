import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCode2,
  ChevronUp,
  Eye,
  EyeOff,
  Keyboard,
  Columns,
  Rows,
  Database,
  FileJson,
  FileText,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  WrapText,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DiffFile, DiffHunk, DiffLine } from '../../types/diff';
import { Finding } from '../../types/finding';

interface DiffViewerProps {
  files: DiffFile[];
  selectedFileId: string | null;
  mode: 'unified' | 'split';
  findings: Finding[];
  selectedFindingId?: string | null;
  onSelectFinding: (finding: Finding) => void;
  onOpenShortcuts?: () => void;
  onToggleDiffMode?: (mode: 'unified' | 'split') => void;
  onToggleReviewedFinding?: (findingId: string) => void;
  onDismissFinding?: (findingId: string) => void;
}

// Helper to get specialized file type icon
function getFileIcon(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.sql') || lower.includes('migration') || lower.includes('schema')) {
    return <Database className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />;
  }
  if (
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.toml')
  ) {
    return <FileJson className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
  }
  if (lower.endsWith('.md') || lower.endsWith('.txt')) {
    return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
  }
  return <FileCode2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400 shrink-0" />;
}

// Split path into directory and filename for readable breadcrumbs
function formatPath(filePath: string) {
  const parts = filePath.split('/');
  if (parts.length === 1) {
    return { dir: '', name: parts[0] };
  }
  const name = parts.pop()!;
  return { dir: parts.join('/') + '/', name };
}

// Helper for file status badge
function getStatusBadge(status: DiffFile['status']) {
  switch (status) {
    case 'added':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          Added
        </span>
      );
    case 'deleted':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          Deleted
        </span>
      );
    case 'renamed':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
          Renamed
        </span>
      );
    case 'detected':
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          Detected
        </span>
      );
    case 'modified':
    default:
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          Modified
        </span>
      );
  }
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  files,
  selectedFileId,
  mode,
  findings,
  selectedFindingId,
  onSelectFinding,
  onOpenShortcuts,
  onToggleDiffMode,
  onToggleReviewedFinding,
  onDismissFinding,
}) => {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);
  const [showOnlyChangedLines, setShowOnlyChangedLines] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [currentFindingIdx, setCurrentFindingIdx] = useState<number>(-1);
  const [expandedFindingsInDiff, setExpandedFindingsInDiff] = useState<Record<string, boolean>>({});
  const [dismissSplitWarning, setDismissSplitWarning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const collapseAllFiles = () => {
    const all: Record<string, boolean> = {};
    files.forEach((f) => {
      all[f.id] = true;
    });
    setCollapsedFiles(all);
  };

  const expandAllFiles = () => {
    setCollapsedFiles({});
  };

  const allCollapsed = useMemo(() => {
    return files.length > 0 && files.every((f) => collapsedFiles[f.id]);
  }, [files, collapsedFiles]);

  const copyFileDiff = (file: DiffFile) => {
    let text = `diff --git a/${file.oldPath} b/${file.newPath}\n`;
    for (const h of file.hunks) {
      text += `${h.header}\n`;
      for (const l of h.lines) {
        const prefix = l.type === 'add' ? '+' : l.type === 'delete' ? '-' : ' ';
        text += `${prefix}${l.content}\n`;
      }
    }
    navigator.clipboard.writeText(text);
    setCopiedFileId(file.id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  const copyFilePath = (filePath: string, fileId: string) => {
    navigator.clipboard.writeText(filePath);
    setCopiedPathId(fileId);
    setTimeout(() => setCopiedPathId(null), 2000);
  };

  const activeFindings = useMemo(() => {
    return findings.filter((f) => !f.isDismissed);
  }, [findings]);

  // Sync current finding index when selectedFindingId changes externally
  useEffect(() => {
    if (selectedFindingId) {
      const idx = activeFindings.findIndex((f) => f.id === selectedFindingId);
      if (idx !== -1) {
        setCurrentFindingIdx(idx);
        setExpandedFindingsInDiff((prev) => ({ ...prev, [selectedFindingId]: true }));
      }
    }
  }, [selectedFindingId, activeFindings]);

  const scrollToFindingLine = (finding: Finding) => {
    const targetFile = files.find(
      (f) => f.newPath === finding.affectedFile || f.oldPath === finding.affectedFile
    );
    if (targetFile && collapsedFiles[targetFile.id]) {
      setCollapsedFiles((prev) => ({ ...prev, [targetFile.id]: false }));
    }

    setExpandedFindingsInDiff((prev) => ({ ...prev, [finding.id]: true }));

    setTimeout(() => {
      const el = document.getElementById(`finding-target-${finding.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  const jumpToNextFinding = () => {
    if (activeFindings.length === 0) return;
    const nextIdx = (currentFindingIdx + 1) % activeFindings.length;
    setCurrentFindingIdx(nextIdx);
    const targetFinding = activeFindings[nextIdx];
    onSelectFinding(targetFinding);
    scrollToFindingLine(targetFinding);
  };

  const jumpToPrevFinding = () => {
    if (activeFindings.length === 0) return;
    const prevIdx = (currentFindingIdx - 1 + activeFindings.length) % activeFindings.length;
    setCurrentFindingIdx(prevIdx);
    const targetFinding = activeFindings[prevIdx];
    onSelectFinding(targetFinding);
    scrollToFindingLine(targetFinding);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToNextFinding();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToPrevFinding();
      } else if (e.key === '?') {
        e.preventDefault();
        if (onOpenShortcuts) onOpenShortcuts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFindings, currentFindingIdx]);

  const displayFiles = selectedFileId
    ? files.filter((f) => f.id === selectedFileId)
    : files;

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 dark:text-neutral-600 select-none">
        <FileCode2 className="h-12 w-12 mb-3 stroke-1" />
        <p className="text-sm font-medium">No diff files to display</p>
        <p className="text-xs text-neutral-500 mt-1">Import a project or paste a patch to start review.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col h-full bg-neutral-100/60 dark:bg-[#090b0e] overflow-hidden min-w-0"
    >
      {/* Diff Controls Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e1116] text-xs shrink-0 shadow-2xs">
        {/* Left: Finding Counter and Navigator */}
        <div className="flex items-center gap-2">
          {activeFindings.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-850 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-750">
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono font-medium">
                Finding{' '}
                <span className="text-neutral-900 dark:text-neutral-100 font-bold">
                  {currentFindingIdx >= 0 ? currentFindingIdx + 1 : 1}
                </span>{' '}
                of {activeFindings.length}
              </span>
              <div className="flex items-center gap-0.5 ml-1 border-l border-neutral-200 dark:border-neutral-700 pl-1">
                <button
                  onClick={jumpToPrevFinding}
                  className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Previous finding (k / ↑)"
                  aria-label="Previous finding"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={jumpToNextFinding}
                  className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Next finding (j / ↓)"
                  aria-label="Next finding"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500 font-mono font-medium">
              {files.length} changed {files.length === 1 ? 'file' : 'files'}
            </div>
          )}

          {/* Quick toggle: Collapse / Expand all */}
          <button
            onClick={allCollapsed ? expandAllFiles : collapseAllFiles}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-850 rounded transition-colors cursor-pointer"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>

        {/* Right: View Options */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
          {/* Diff Mode Toggle (Unified / Split) */}
          {onToggleDiffMode && (
            <div className="flex items-center p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-850">
              <button
                onClick={() => onToggleDiffMode('unified')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  mode === 'unified'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Unified diff view (u)"
              >
                <Rows className="h-3 w-3" />
                <span className="hidden xs:inline">Unified</span>
              </button>
              <button
                onClick={() => onToggleDiffMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  mode === 'split'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="Split side-by-side view (s)"
              >
                <Columns className="h-3 w-3" />
                <span className="hidden xs:inline">Split</span>
              </button>
            </div>
          )}

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
              wrapLines
                ? 'bg-neutral-200/80 dark:bg-neutral-750 border-neutral-300 dark:border-neutral-650 text-neutral-900 dark:text-white font-medium'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Toggle word wrap for long code lines"
          >
            <WrapText className="h-3 w-3" />
            <span className="hidden md:inline">Wrap</span>
          </button>

          {/* Toggle Changed Lines Only */}
          <button
            onClick={() => setShowOnlyChangedLines(!showOnlyChangedLines)}
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
              showOnlyChangedLines
                ? 'bg-neutral-200/80 dark:bg-neutral-750 border-neutral-300 dark:border-neutral-650 text-neutral-900 dark:text-white font-medium'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Toggle unchanged context lines"
          >
            {showOnlyChangedLines ? (
              <>
                <EyeOff className="h-3 w-3" />
                <span>Changed only</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                <span>All lines</span>
              </>
            )}
          </button>

          {/* Keyboard Shortcuts Prompt */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Split View Warning on Small Screens */}
      {mode === 'split' && !dismissSplitWarning && (
        <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Side-by-side view is wide. Unified view is recommended for mobile.</span>
          </div>
          <div className="flex items-center gap-2">
            {onToggleDiffMode && (
              <button
                onClick={() => onToggleDiffMode('unified')}
                className="font-bold underline cursor-pointer hover:text-amber-950 dark:hover:text-amber-100"
              >
                Switch
              </button>
            )}
            <button
              onClick={() => setDismissSplitWarning(true)}
              className="text-amber-600 hover:text-amber-900 dark:hover:text-amber-200 text-xs px-1 cursor-pointer"
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Files Diff Viewport */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
        {displayFiles.map((file) => {
          const isCollapsed = !!collapsedFiles[file.id];
          const fileFindings = findings.filter(
            (f) => !f.isDismissed && (f.affectedFile === file.newPath || f.affectedFile === file.oldPath)
          );

          const { dir, name } = formatPath(file.newPath);

          return (
            <div
              key={file.id}
              id={`file-viewer-${file.id}`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e1116] overflow-hidden shadow-xs min-w-0 transition-shadow hover:shadow-sm"
            >
              {/* Sticky File Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/98 dark:bg-[#13161c]/98 backdrop-blur-sm select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <button
                    onClick={() => toggleCollapse(file.id)}
                    className="p-1 -ml-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-750 transition-colors cursor-pointer shrink-0"
                    aria-label={isCollapsed ? 'Expand file' : 'Collapse file'}
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {getFileIcon(file.newPath)}

                  {/* Clean Breadcrumb Path */}
                  <div className="font-mono text-xs truncate min-w-0 flex-1" title={file.newPath}>
                    {dir && <span className="text-neutral-400 dark:text-neutral-500">{dir}</span>}
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{name}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">{getStatusBadge(file.status)}</div>

                  {/* Renamed badge */}
                  {file.status === 'renamed' && (
                    <span
                      className="text-[10px] text-neutral-500 hidden lg:inline truncate max-w-[200px]"
                      title={`Renamed from ${file.oldPath}`}
                    >
                      (from {file.oldPath})
                    </span>
                  )}

                  {/* File findings badge with jump action */}
                  {fileFindings.length > 0 && (
                    <button
                      onClick={() => {
                        if (isCollapsed) toggleCollapse(file.id);
                        onSelectFinding(fileFindings[0]);
                        scrollToFindingLine(fileFindings[0]);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/30 shrink-0 hover:bg-amber-500/25 transition-colors cursor-pointer"
                      title="Click to jump to findings in this file"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>{fileFindings.length}</span>
                    </button>
                  )}
                </div>

                {/* Right: Stats & Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{file.additions}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      -{file.deletions}
                    </span>
                  </div>

                  {/* Copy Path */}
                  <button
                    onClick={() => copyFilePath(file.newPath, file.id)}
                    className="hidden sm:flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-750 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
                    title="Copy relative file path"
                  >
                    {copiedPathId === file.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-neutral-400" />
                    )}
                    <span className="hidden md:inline">Path</span>
                  </button>

                  {/* Copy File Diff */}
                  <button
                    onClick={() => copyFileDiff(file)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-750 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                    title="Copy diff patch for this file"
                  >
                    {copiedFileId === file.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="hidden xs:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-neutral-400" />
                        <span className="hidden xs:inline">Diff</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* File Diff Content */}
              {!isCollapsed && (
                <div className="text-xs font-mono min-w-0">
                  {file.isBinary ? (
                    <div className="p-6 text-center text-neutral-500 text-xs italic bg-neutral-50/40 dark:bg-neutral-900/20">
                      Binary file differed. Contents cannot be inspected in text diff mode.
                    </div>
                  ) : file.hunks.length === 0 ? (
                    <div className="p-4 text-center text-neutral-500 text-xs bg-neutral-50/40 dark:bg-neutral-900/20">
                      File mode, metadata, or permission change only. No line diffs.
                    </div>
                  ) : mode === 'unified' ? (
                    <UnifiedView
                      file={file}
                      hunks={file.hunks}
                      fileFindings={fileFindings}
                      selectedFindingId={selectedFindingId}
                      expandedFindingsInDiff={expandedFindingsInDiff}
                      onToggleFindingCallout={(fId) =>
                        setExpandedFindingsInDiff((prev) => ({ ...prev, [fId]: !prev[fId] }))
                      }
                      onSelectFinding={onSelectFinding}
                      onlyChanged={showOnlyChangedLines}
                      wrapLines={wrapLines}
                      onToggleReviewedFinding={onToggleReviewedFinding}
                      onDismissFinding={onDismissFinding}
                    />
                  ) : (
                    <SplitView
                      file={file}
                      hunks={file.hunks}
                      fileFindings={fileFindings}
                      selectedFindingId={selectedFindingId}
                      expandedFindingsInDiff={expandedFindingsInDiff}
                      onToggleFindingCallout={(fId) =>
                        setExpandedFindingsInDiff((prev) => ({ ...prev, [fId]: !prev[fId] }))
                      }
                      onSelectFinding={onSelectFinding}
                      onlyChanged={showOnlyChangedLines}
                      wrapLines={wrapLines}
                      onToggleReviewedFinding={onToggleReviewedFinding}
                      onDismissFinding={onDismissFinding}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// UNIFIED DIFF VIEW COMPONENT
// ==========================================
const UnifiedView: React.FC<{
  file: DiffFile;
  hunks: DiffHunk[];
  fileFindings: Finding[];
  selectedFindingId?: string | null;
  expandedFindingsInDiff: Record<string, boolean>;
  onToggleFindingCallout: (id: string) => void;
  onSelectFinding: (finding: Finding) => void;
  onlyChanged?: boolean;
  wrapLines?: boolean;
  onToggleReviewedFinding?: (findingId: string) => void;
  onDismissFinding?: (findingId: string) => void;
}> = ({
  file,
  hunks,
  fileFindings,
  selectedFindingId,
  expandedFindingsInDiff,
  onToggleFindingCallout,
  onSelectFinding,
  onlyChanged,
  wrapLines,
  onToggleReviewedFinding,
  onDismissFinding,
}) => {
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-900/80 min-w-0">
      {hunks.map((hunk, hIdx) => {
        const displayedLines = onlyChanged
          ? hunk.lines.filter((l) => l.type === 'add' || l.type === 'delete')
          : hunk.lines;

        if (displayedLines.length === 0) return null;

        return (
          <div key={hIdx} className="min-w-0">
            {/* Sticky Hunk Header */}
            <div className="sticky top-[42px] z-10 bg-indigo-50/70 dark:bg-[#141824]/95 backdrop-blur-sm px-4 py-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-mono select-none border-y border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-between">
              <span className="font-semibold tracking-tight">{hunk.header}</span>
              <span className="text-[10px] text-indigo-500/70 dark:text-indigo-400/60 hidden sm:inline">
                Hunk {hIdx + 1} of {hunks.length}
              </span>
            </div>

            <div className="w-full overflow-x-auto min-w-0">
              <table className="w-full border-collapse font-mono text-[12px] sm:text-[12.5px] leading-5">
                <tbody>
                  {displayedLines.map((line, lIdx) => {
                    const isAdd = line.type === 'add';
                    const isDel = line.type === 'delete';

                    const targetLineNumber = line.newLineNumber || line.oldLineNumber;
                    const lineFinding = fileFindings.find(
                      (f) => f.evidence.lineNumber === targetLineNumber
                    );

                    const isFindingSelected = Boolean(lineFinding && lineFinding.id === selectedFindingId);
                    const isCalloutOpen = Boolean(
                      lineFinding && (expandedFindingsInDiff[lineFinding.id] || isFindingSelected)
                    );

                    return (
                      <React.Fragment key={lIdx}>
                        <tr
                          id={lineFinding ? `finding-target-${lineFinding.id}` : undefined}
                          className={`group transition-colors ${
                            isFindingSelected
                              ? 'bg-amber-500/20 dark:bg-amber-500/25 border-l-4 border-amber-500 font-medium'
                              : isAdd
                              ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] border-l-3 border-emerald-500 text-neutral-900 dark:text-emerald-100'
                              : isDel
                              ? 'bg-rose-500/[0.08] dark:bg-rose-500/[0.14] border-l-3 border-rose-500 text-neutral-900 dark:text-rose-100'
                              : 'border-l-3 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/40 text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          {/* Finding Indicator Gutter */}
                          <td className="w-6 px-1 text-center select-none shrink-0 align-top py-0.5 bg-neutral-50/80 dark:bg-[#0c0e14] border-r border-neutral-200/60 dark:border-neutral-800">
                            {lineFinding && (
                              <button
                                onClick={() => {
                                  onSelectFinding(lineFinding);
                                  onToggleFindingCallout(lineFinding.id);
                                }}
                                className={`p-0.5 transition-transform hover:scale-110 cursor-pointer ${
                                  lineFinding.priority === 'HIGH'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400'
                                }`}
                                title={`Finding: ${lineFinding.title} (Click to toggle details)`}
                                aria-label="Toggle finding callout"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>

                          {/* Old line number */}
                          <td className="w-10 sm:w-12 px-1.5 sm:px-2 py-0.5 text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none border-r border-neutral-200/60 dark:border-neutral-800 tabular-nums shrink-0 align-top bg-neutral-50/80 dark:bg-[#0c0e14]">
                            {line.oldLineNumber !== undefined ? line.oldLineNumber : ''}
                          </td>

                          {/* New line number */}
                          <td className="w-10 sm:w-12 px-1.5 sm:px-2 py-0.5 text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none border-r border-neutral-200/60 dark:border-neutral-800 tabular-nums shrink-0 align-top bg-neutral-50/80 dark:bg-[#0c0e14]">
                            {line.newLineNumber !== undefined ? line.newLineNumber : ''}
                          </td>

                          {/* Operation prefix (+ / -) */}
                          <td
                            className={`w-5 text-center select-none font-bold text-xs shrink-0 align-top py-0.5 ${
                              isAdd
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                : isDel
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                                : 'text-neutral-300 dark:text-neutral-700'
                            }`}
                          >
                            {isAdd ? '+' : isDel ? '-' : ' '}
                          </td>

                          {/* Code Content */}
                          <td
                            className={`px-3 py-0.5 min-w-0 select-text ${
                              wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                            }`}
                          >
                            {line.content || '\u00A0'}
                          </td>
                        </tr>

                        {/* Inline Finding Callout Ribbon */}
                        {lineFinding && isCalloutOpen && (
                          <InlineFindingCard
                            finding={lineFinding}
                            isSelected={isFindingSelected}
                            onSelectFinding={onSelectFinding}
                            onToggleReviewed={onToggleReviewedFinding}
                            onDismiss={onDismissFinding}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// SPLIT DIFF VIEW COMPONENT (Side-by-Side)
// ==========================================
const SplitView: React.FC<{
  file: DiffFile;
  hunks: DiffHunk[];
  fileFindings: Finding[];
  selectedFindingId?: string | null;
  expandedFindingsInDiff: Record<string, boolean>;
  onToggleFindingCallout: (id: string) => void;
  onSelectFinding: (finding: Finding) => void;
  onlyChanged?: boolean;
  wrapLines?: boolean;
  onToggleReviewedFinding?: (findingId: string) => void;
  onDismissFinding?: (findingId: string) => void;
}> = ({
  file,
  hunks,
  fileFindings,
  selectedFindingId,
  expandedFindingsInDiff,
  onToggleFindingCallout,
  onSelectFinding,
  onlyChanged,
  wrapLines,
  onToggleReviewedFinding,
  onDismissFinding,
}) => {
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-900/80 min-w-0">
      {/* Column Headers for Split Diff */}
      <div className="sticky top-[42px] z-15 flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/98 dark:bg-[#11141a]/98 text-[11px] font-mono text-neutral-500 select-none">
        <div className="w-1/2 px-4 py-1 border-r border-neutral-200 dark:border-neutral-800 font-semibold flex items-center justify-between">
          <span>Previous Revision</span>
          <span className="text-[10px] text-neutral-400 font-normal truncate max-w-[200px]">
            {file.oldPath}
          </span>
        </div>
        <div className="w-1/2 px-4 py-1 font-semibold flex items-center justify-between">
          <span>New Revision</span>
          <span className="text-[10px] text-neutral-400 font-normal truncate max-w-[200px]">
            {file.newPath}
          </span>
        </div>
      </div>

      {hunks.map((hunk, hIdx) => {
        const leftLines: (DiffLine | null)[] = [];
        const rightLines: (DiffLine | null)[] = [];

        let i = 0;
        while (i < hunk.lines.length) {
          const line = hunk.lines[i];
          if (line.type === 'context') {
            if (!onlyChanged) {
              leftLines.push(line);
              rightLines.push(line);
            }
            i++;
          } else if (line.type === 'delete') {
            if (i + 1 < hunk.lines.length && hunk.lines[i + 1].type === 'add') {
              leftLines.push(line);
              rightLines.push(hunk.lines[i + 1]);
              i += 2;
            } else {
              leftLines.push(line);
              rightLines.push(null);
              i++;
            }
          } else if (line.type === 'add') {
            leftLines.push(null);
            rightLines.push(line);
            i++;
          }
        }

        if (leftLines.length === 0) return null;

        return (
          <div key={hIdx} className="min-w-0">
            {/* Hunk Sub-header */}
            <div className="bg-indigo-50/70 dark:bg-[#141824]/90 px-4 py-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-mono select-none border-b border-indigo-200/50 dark:border-indigo-900/40">
              <span className="font-semibold">{hunk.header}</span>
            </div>

            {/* Minimum width wrapper ensures table columns never crush on small screens */}
            <div className="w-full overflow-x-auto min-w-0">
              <table className="w-full min-w-[680px] border-collapse table-fixed font-mono text-[12px] sm:text-[12.5px] leading-5">
                <tbody>
                  {leftLines.map((left, idx) => {
                    const right = rightLines[idx];
                    const leftFinding =
                      left?.oldLineNumber &&
                      fileFindings.find((f) => f.evidence.lineNumber === left.oldLineNumber);
                    const rightFinding =
                      right?.newLineNumber &&
                      fileFindings.find((f) => f.evidence.lineNumber === right.newLineNumber);

                    const targetFinding = rightFinding || leftFinding;
                    const isFindingSelected = Boolean(
                      targetFinding && targetFinding.id === selectedFindingId
                    );
                    const isCalloutOpen = Boolean(
                      targetFinding && (expandedFindingsInDiff[targetFinding.id] || isFindingSelected)
                    );

                    const targetId = rightFinding
                      ? `finding-target-${rightFinding.id}`
                      : leftFinding
                      ? `finding-target-${leftFinding.id}`
                      : undefined;

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          id={targetId}
                          className={`divide-x divide-neutral-200 dark:divide-neutral-800/80 transition-colors ${
                            isFindingSelected ? 'ring-1 ring-inset ring-amber-500/50' : ''
                          }`}
                        >
                          {/* Left Column (Old Revision) */}
                          <td
                            className={`w-1/2 align-top overflow-hidden p-0 ${
                              left?.type === 'delete'
                                ? 'bg-rose-500/[0.08] dark:bg-rose-500/[0.14] border-l-3 border-rose-500 text-neutral-900 dark:text-rose-100'
                                : !left
                                ? 'bg-neutral-100/60 dark:bg-neutral-900/30'
                                : 'border-l-3 border-transparent text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/30'
                            }`}
                          >
                            <div className="flex items-start min-w-0">
                              <span className="w-6 py-0.5 text-center select-none shrink-0 bg-neutral-50/80 dark:bg-[#0c0e14] border-r border-neutral-200/60 dark:border-neutral-800">
                                {leftFinding && (
                                  <button
                                    onClick={() => {
                                      onSelectFinding(leftFinding);
                                      onToggleFindingCallout(leftFinding.id);
                                    }}
                                    className="text-amber-500 hover:text-amber-600 p-0.5 cursor-pointer"
                                    title={`Finding: ${leftFinding.title}`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                              <span className="w-10 sm:w-12 px-1.5 sm:px-2 py-0.5 text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none border-r border-neutral-200/60 dark:border-neutral-800 tabular-nums shrink-0 bg-neutral-50/80 dark:bg-[#0c0e14]">
                                {left?.oldLineNumber ?? ''}
                              </span>
                              <span className="w-5 text-center select-none font-bold text-xs shrink-0 py-0.5 text-rose-600 dark:text-rose-400">
                                {left?.type === 'delete' ? '-' : ' '}
                              </span>
                              <span
                                className={`px-2 py-0.5 flex-1 min-w-0 select-text ${
                                  wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                }`}
                              >
                                {left ? left.content || '\u00A0' : '\u00A0'}
                              </span>
                            </div>
                          </td>

                          {/* Right Column (New Revision) */}
                          <td
                            className={`w-1/2 align-top overflow-hidden p-0 ${
                              right?.type === 'add'
                                ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] border-l-3 border-emerald-500 text-neutral-900 dark:text-emerald-100'
                                : !right
                                ? 'bg-neutral-100/60 dark:bg-neutral-900/30'
                                : 'border-l-3 border-transparent text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/30'
                            }`}
                          >
                            <div className="flex items-start min-w-0">
                              <span className="w-6 py-0.5 text-center select-none shrink-0 bg-neutral-50/80 dark:bg-[#0c0e14] border-r border-neutral-200/60 dark:border-neutral-800">
                                {rightFinding && (
                                  <button
                                    onClick={() => {
                                      onSelectFinding(rightFinding);
                                      onToggleFindingCallout(rightFinding.id);
                                    }}
                                    className="text-amber-500 hover:text-amber-600 p-0.5 cursor-pointer"
                                    title={`Finding: ${rightFinding.title}`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                              <span className="w-10 sm:w-12 px-1.5 sm:px-2 py-0.5 text-right text-[11px] text-neutral-400 dark:text-neutral-500 select-none border-r border-neutral-200/60 dark:border-neutral-800 tabular-nums shrink-0 bg-neutral-50/80 dark:bg-[#0c0e14]">
                                {right?.newLineNumber ?? ''}
                              </span>
                              <span className="w-5 text-center select-none font-bold text-xs shrink-0 py-0.5 text-emerald-600 dark:text-emerald-400">
                                {right?.type === 'add' ? '+' : ' '}
                              </span>
                              <span
                                className={`px-2 py-0.5 flex-1 min-w-0 select-text ${
                                  wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                                }`}
                              >
                                {right ? right.content || '\u00A0' : '\u00A0'}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Finding Callout Ribbon for Split View */}
                        {targetFinding && isCalloutOpen && (
                          <InlineFindingCard
                            finding={targetFinding}
                            isSelected={isFindingSelected}
                            onSelectFinding={onSelectFinding}
                            onToggleReviewed={onToggleReviewedFinding}
                            onDismiss={onDismissFinding}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ==========================================
// INLINE FINDING ANNOTATION CARD
// ==========================================
const InlineFindingCard: React.FC<{
  finding: Finding;
  isSelected?: boolean;
  onSelectFinding: (finding: Finding) => void;
  onToggleReviewed?: (findingId: string) => void;
  onDismiss?: (findingId: string) => void;
}> = ({ finding, isSelected, onSelectFinding, onToggleReviewed, onDismiss }) => {
  const isHigh = finding.priority === 'HIGH';
  const isMed = finding.priority === 'MEDIUM';

  return (
    <tr
      className={`border-y transition-all ${
        isSelected
          ? 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500 ring-1 ring-inset ring-amber-500'
          : isHigh
          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
          : isMed
          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60'
          : 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-900/60'
      }`}
    >
      <td colSpan={10} className="p-3 sm:p-4 pl-4 sm:pl-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  isHigh
                    ? 'bg-rose-600 text-white'
                    : isMed
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-600 text-white'
                }`}
              >
                {finding.priority} PRIORITY
              </span>

              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                {finding.category}
              </span>

              <span className="text-[10px] text-neutral-500 font-mono">
                Confidence: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{finding.confidence}</span>
              </span>

              {finding.isReviewed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Reviewed
                </span>
              )}
            </div>

            {/* Title */}
            <div className="text-xs sm:text-sm font-bold text-neutral-950 dark:text-neutral-50">
              {finding.title}
            </div>

            {/* Explanation */}
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-4xl">
              {finding.explanation}
            </p>

            {/* Detection Signals */}
            {finding.evidence.detectionSignals && finding.evidence.detectionSignals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-neutral-500">Signals:</span>
                {finding.evidence.detectionSignals.map((sig, sIdx) => (
                  <span
                    key={sIdx}
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300/60 dark:border-neutral-700"
                  >
                    {sig}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-1">
            <button
              onClick={() => onSelectFinding(finding)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs"
            >
              <span>Full Details</span>
              <ArrowRight className="h-3 w-3" />
            </button>

            {onToggleReviewed && (
              <button
                onClick={() => onToggleReviewed(finding.id)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 px-2 py-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>{finding.isReviewed ? 'Mark Unreviewed' : 'Mark Reviewed'}</span>
              </button>
            )}

            {onDismiss && (
              <button
                onClick={() => onDismiss(finding.id)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};
