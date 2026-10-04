import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Download,
  Columns,
  Rows,
  Trash2,
  Search,
  Network,
  AlertOctagon,
  TestTube2,
  VolumeX,
  History,
  Settings,
  Keyboard,
  Upload,
  MoreVertical,
  X,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { ParsedDiff } from '../../types/diff';
import { FindingsSummary } from '../../types/finding';

export type MainWorkspaceView = 'diff' | 'changemap' | 'breaking' | 'tests' | 'noise';

interface SummaryBarProps {
  parsedDiff: ParsedDiff | null;
  summary: FindingsSummary | null;
  diffMode: 'unified' | 'split';
  onToggleDiffMode: (mode: 'unified' | 'split') => void;
  onClear: () => void;
  onOpenExportModal: () => void;
  onOpenDiffInput: () => void;
  onOpenHistoryModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShortcutsModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: MainWorkspaceView;
  onSelectView: (view: MainWorkspaceView) => void;
  breakingCount?: number;
  testIssuesCount?: number;
  showLeftSidebar?: boolean;
  onToggleLeftSidebar?: () => void;
  showRightSidebar?: boolean;
  onToggleRightSidebar?: () => void;
}

export const SummaryBar: React.FC<SummaryBarProps> = ({
  parsedDiff,
  summary,
  diffMode,
  onToggleDiffMode,
  onClear,
  onOpenExportModal,
  onOpenDiffInput,
  onOpenHistoryModal,
  onOpenSettingsModal,
  onOpenShortcutsModal,
  searchQuery,
  onSearchChange,
  activeView,
  onSelectView,
  breakingCount = 0,
  testIssuesCount = 0,
  showLeftSidebar = true,
  onToggleLeftSidebar,
  showRightSidebar = true,
  onToggleRightSidebar,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mobileMenuOpen]);

  if (!parsedDiff) return null;

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] shrink-0 z-30 select-none">
      {/* Primary Toolbar Row */}
      <div className="px-3 sm:px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Top/Left Section: Sidebar Toggles & Metrics */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 text-xs min-w-0">
            {/* Left Sidebar Toggle (Desktop / Tablet) */}
            {onToggleLeftSidebar && (
              <button
                onClick={onToggleLeftSidebar}
                className={`hidden lg:flex items-center justify-center h-7 w-7 rounded-md border transition-colors cursor-pointer ${
                  showLeftSidebar
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
                title={showLeftSidebar ? 'Collapse file tree' : 'Expand file tree'}
                aria-label="Toggle file tree sidebar"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </button>
            )}

            {/* File count */}
            <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100 shrink-0">
              <FileText className="h-3.5 w-3.5 text-neutral-500" />
              <span>
                {parsedDiff.totalFiles} {parsedDiff.totalFiles === 1 ? 'file' : 'files'}
              </span>
            </div>

            {/* Line delta counters */}
            <div className="flex items-center gap-1 font-mono text-[11px] tabular-nums shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                +{parsedDiff.totalAdditions}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                -{parsedDiff.totalDeletions}
              </span>
            </div>

            {/* Findings summary count */}
            {summary && (
              <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-neutral-200 dark:border-neutral-800">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {summary.total}
                </span>
                <span className="hidden xs:inline text-neutral-500">findings</span>
                {summary.byPriority.HIGH > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] hidden sm:inline">
                    ({summary.byPriority.HIGH} high)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Mobile Right Quick Action Icons (visible only below md) */}
          <div className="flex md:hidden items-center gap-1">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`p-1.5 rounded-md border text-neutral-600 dark:text-neutral-300 ${
                mobileSearchOpen || searchQuery
                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600'
                  : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Search"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Diff Mode Toggle on Mobile */}
            {activeView === 'diff' && (
              <button
                onClick={() => onToggleDiffMode(diffMode === 'unified' ? 'split' : 'unified')}
                className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title={`Switch to ${diffMode === 'unified' ? 'split' : 'unified'} mode`}
                aria-label="Toggle diff mode"
              >
                {diffMode === 'unified' ? <Columns className="h-4 w-4" /> : <Rows className="h-4 w-4" />}
              </button>
            )}

            {/* Add/Change Button */}
            <button
              onClick={onOpenDiffInput}
              className="p-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800"
              title="Add or Change Project"
              aria-label="Add project"
            >
              <Upload className="h-4 w-4" />
            </button>

            {/* Overflow Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12151c] shadow-lg py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      onOpenExportModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Export Report</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenHistoryModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Recent History</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenSettingsModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenShortcutsModal();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    <Keyboard className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Shortcuts</span>
                  </button>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <button
                    onClick={() => {
                      onClear();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Reset Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher Tabs (Middle) */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => onSelectView('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              activeView === 'diff'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Diff</span>
          </button>

          <button
            onClick={() => onSelectView('changemap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              activeView === 'changemap'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Change Map</span>
          </button>

          <button
            onClick={() => onSelectView('breaking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              activeView === 'breaking'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>Breaking</span>
            {breakingCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold ml-0.5">
                {breakingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              activeView === 'tests'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <TestTube2 className="h-3.5 w-3.5 text-amber-500" />
            <span>Test Impact</span>
            {testIssuesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold ml-0.5">
                {testIssuesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('noise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
              activeView === 'noise'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <VolumeX className="h-3.5 w-3.5" />
            <span>Noise</span>
          </button>
        </div>

        {/* Desktop Controls (visible on md+) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Unified / Split Toggle */}
          {activeView === 'diff' && (
            <div className="flex items-center p-0.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-xs">
              <button
                onClick={() => onToggleDiffMode('unified')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  diffMode === 'unified'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
                title="Unified diff view (u)"
              >
                <Rows className="h-3 w-3" />
                <span>Unified</span>
              </button>
              <button
                onClick={() => onToggleDiffMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  diffMode === 'split'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
                title="Split side-by-side view (s)"
              >
                <Columns className="h-3 w-3" />
                <span>Split</span>
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter files or text..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-36 lg:w-44 pl-8 pr-2.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-500 transition-colors"
            />
          </div>

          {/* Export Report */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs"
            title="Export Report (e)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Export</span>
          </button>

          {/* Add / Change Project */}
          <button
            onClick={onOpenDiffInput}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-2xs"
            title="Add Project or Changes (i)"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Add / Change</span>
          </button>

          {/* History */}
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center justify-center h-8 w-8 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Recent Analyses"
            aria-label="Recent Analyses"
          >
            <History className="h-3.5 w-3.5" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center justify-center h-8 w-8 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          {/* Right Sidebar Toggle (Desktop / Tablet) */}
          {onToggleRightSidebar && (
            <button
              onClick={onToggleRightSidebar}
              className={`hidden lg:flex items-center justify-center h-8 w-8 rounded-md border transition-colors cursor-pointer ${
                showRightSidebar
                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
              title={showRightSidebar ? 'Collapse findings panel' : 'Expand findings panel'}
              aria-label="Toggle findings sidebar"
            >
              <PanelRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Reset / Clear */}
          <button
            onClick={onClear}
            className="flex items-center justify-center h-8 w-8 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Clear and reset workspace"
            aria-label="Clear workspace"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Search Expandable Drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              autoFocus
              placeholder="Filter files or text..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0c0e12] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
