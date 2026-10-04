import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { DiffFile, FileStatus } from '../../types/diff';
import { Finding } from '../../types/finding';

interface FileTreeProps {
  files: DiffFile[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  findings: Finding[];
  searchQuery: string;
  monorepoWorkspaces?: string[];
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  findings,
  searchQuery,
  monorepoWorkspaces = [],
}) => {
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'has_findings' | 'high_only'>('all');
  const [sortBy, setSortBy] = useState<'path' | 'additions' | 'deletions' | 'findings'>('path');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter pipeline
  const filteredFiles = files.filter((f) => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.newPath.toLowerCase().includes(q) && !f.oldPath.toLowerCase().includes(q)) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;

    // Workspace filter
    if (selectedWorkspace !== 'all' && !f.newPath.startsWith(selectedWorkspace)) return false;

    // Severity filter
    const fileFindings = findings.filter((find) => !find.isDismissed && find.affectedFile === f.newPath);
    if (severityFilter === 'has_findings' && fileFindings.length === 0) return false;
    if (severityFilter === 'high_only' && !fileFindings.some((find) => find.priority === 'HIGH')) return false;

    return true;
  });

  // Sort pipeline
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'additions') return b.additions - a.additions;
    if (sortBy === 'deletions') return b.deletions - a.deletions;
    if (sortBy === 'findings') {
      const aFind = findings.filter((f) => !f.isDismissed && f.affectedFile === a.newPath).length;
      const bFind = findings.filter((f) => !f.isDismissed && f.affectedFile === b.newPath).length;
      return bFind - aFind;
    }
    return a.newPath.localeCompare(b.newPath);
  });

  const getStatusBadge = (status: FileStatus, isBinary: boolean, isLockfile: boolean) => {
    if (isBinary) {
      return (
        <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
          BIN
        </span>
      );
    }
    if (isLockfile) {
      return (
        <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
          LOCK
        </span>
      );
    }
    switch (status) {
      case 'added':
        return (
          <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded font-semibold">
            A
          </span>
        );
      case 'deleted':
        return (
          <span className="text-[10px] font-mono px-1 py-0.2 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 rounded font-semibold">
            D
          </span>
        );
      case 'renamed':
        return (
          <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 rounded font-semibold">
            R
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 rounded font-semibold">
            M
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] border-r border-neutral-200 dark:border-neutral-800 select-none">
      {/* Panel Top Title */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[11px]">
          Files ({sortedFiles.length}/{files.length})
        </span>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
            showFilters || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
          title="Filter and sort files"
        >
          <Filter className="h-3 w-3" />
          <span>Filter</span>
        </button>
      </div>

      {/* Expandable Filters & Sort Bar */}
      {showFilters && (
        <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111419] space-y-2 text-[11px]">
          {/* Status filter */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-neutral-500">Status:</span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['all', 'modified', 'added', 'deleted', 'renamed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-1.5 py-0.5 rounded capitalize ${
                    statusFilter === s
                      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Severity filter */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-neutral-500">Findings:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-1.5 py-0.5 rounded ${
                  severityFilter === 'all'
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSeverityFilter('has_findings')}
                className={`px-1.5 py-0.5 rounded ${
                  severityFilter === 'has_findings'
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                Has Findings
              </button>
              <button
                onClick={() => setSeverityFilter('high_only')}
                className={`px-1.5 py-0.5 rounded ${
                  severityFilter === 'high_only'
                    ? 'bg-rose-600 text-white font-medium'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                High
              </button>
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-neutral-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 text-[11px] text-neutral-800 dark:text-neutral-200"
            >
              <option value="path">File Path (A-Z)</option>
              <option value="findings">Findings Count</option>
              <option value="additions">Most Additions</option>
              <option value="deletions">Most Deletions</option>
            </select>
          </div>

          {/* Monorepo Workspace selector if present */}
          {monorepoWorkspaces.length > 0 && (
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
              <span className="text-neutral-500">Package:</span>
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 text-[11px] text-neutral-800 dark:text-neutral-200 max-w-[130px] truncate"
              >
                <option value="all">All Workspaces</option>
                {monorepoWorkspaces.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40">
        {sortedFiles.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-400">
            No files match filter criteria
          </div>
        ) : (
          sortedFiles.map((file) => {
            const isSelected = selectedFileId === file.id;
            const fileFindings = findings.filter(
              (f) => !f.isDismissed && f.affectedFile === file.newPath
            );
            const highFindings = fileFindings.filter((f) => f.priority === 'HIGH').length;

            const pathParts = file.newPath.split('/');
            const fileName = pathParts.pop();
            const dirPath = pathParts.join('/');

            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`w-full text-left p-2.5 transition-colors flex items-start gap-2 group cursor-pointer border-l-2 ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 border-neutral-900 dark:border-neutral-100'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 border-transparent'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {getStatusBadge(file.status, file.isBinary, file.isLockfile)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium truncate text-neutral-900 dark:text-neutral-200">
                      {fileName}
                    </span>
                    {fileFindings.length > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 flex items-center gap-0.5 ${
                          highFindings > 0
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                        }`}
                        title={`${fileFindings.length} review findings in this file`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        <span>{fileFindings.length}</span>
                      </span>
                    )}
                  </div>

                  {dirPath && (
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                      {dirPath}/
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500">
                    <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
