import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  FolderOpen,
  ArrowRight,
  Upload,
  AlertTriangle,
  FileText,
  Layers,
  Network,
  AlertOctagon,
  TestTube2,
  VolumeX,
  History,
  GitCompare,
  Archive,
  CheckSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ParsedDiff, DiffFile } from '../../types/diff';
import { Finding, FindingsSummary } from '../../types/finding';
import { DependencyChange } from '../../types/dependency';
import { ReviewChecklistItem } from '../../types/checklist';
import { parseGitDiff } from '../../parser/diffParser';
import { runAnalysis } from '../../rules';
import { generateChecklistFromFindings } from '../../services/checklistGenerator';
import { buildReportObject } from '../../services/reportExporter';
import { saveHistoryEntry, HistoryEntry } from '../../services/historyService';
import { buildChangeMap, ChangeMapData } from '../../utils/changeMap';
import { extractBreakingWatchlist, BreakingChangeItem } from '../../utils/breakingWatchlist';
import { SummaryBar, MainWorkspaceView } from './SummaryBar';
import { FileTree } from './FileTree';
import { DiffViewer } from './DiffViewer';
import { FindingsPanel } from './FindingsPanel';
import { ReviewChecklist } from './ReviewChecklist';
import { DependencyInspector } from './DependencyInspector';
import { ProjectImportModal } from './ProjectImportModal';
import { ExportModal } from './ExportModal';
import { ChangeMapView } from './ChangeMapView';
import { BreakingWatchlistView } from './BreakingWatchlistView';
import { TestImpactView } from './TestImpactView';
import { ChangeNoiseView } from './ChangeNoiseView';
import { ProjectOverview } from './ProjectOverview';
import { FileDetailsPanel } from './FileDetailsPanel';
import { HistoryModal } from './HistoryModal';
import { SettingsModal } from './SettingsModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { BeforeAfterWorkspace } from './BeforeAfterWorkspace';
import { getSettings, saveSettings } from '../../services/settingsService';
import { EXAMPLES } from '../../examples';

export type MobileTab = 'diff' | 'files' | 'findings' | 'checklist' | 'overview';

export const DiffWorkbench: React.FC = () => {
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
  const [projectName, setProjectName] = useState<string>('Current Changeset');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<FindingsSummary | null>(null);
  const [dependencies, setDependencies] = useState<DependencyChange[]>([]);
  const [checklist, setChecklist] = useState<ReviewChecklistItem[]>([]);

  // Navigation & selection
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);

  // Views & Tabs
  const [activeView, setActiveView] = useState<MainWorkspaceView>('diff');
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>(() => getSettings().diffMode);
  const [activeRightTab, setActiveRightTab] = useState<'findings' | 'checklist' | 'dependencies' | 'overview'>('findings');
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('diff');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth >= 1280);

  const handleToggleDiffMode = (mode: 'unified' | 'split') => {
    setDiffMode(mode);
    saveSettings({ diffMode: mode });
  };

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Derived signature analyses
  const [changeMap, setChangeMap] = useState<ChangeMapData>({ nodes: [], edges: [], layers: {} });
  const [breakingWatchlist, setBreakingWatchlist] = useState<BreakingChangeItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Execute or Load Analysis
  const handleCompleteAnalysis = async (
    parsed: ParsedDiff,
    rawDiffText?: string,
    inferredProjectName?: string
  ) => {
    setIsAnalyzing(true);
    const startTime = performance.now();

    try {
      const analysis = runAnalysis(parsed);
      const initialChecklist = generateChecklistFromFindings(analysis.findings);
      const map = buildChangeMap(parsed.files, analysis.findings);
      const watchlist = extractBreakingWatchlist(parsed.files, analysis.findings);
      const name = inferredProjectName || parsed.files[0]?.newPath.split('/')[0] || 'Project Changes';

      const elapsed = performance.now() - startTime;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }

      setParsedDiff(parsed);
      setProjectName(name);
      setFindings(analysis.findings);
      setSummary(analysis.summary);
      setDependencies(analysis.dependencies);
      setChecklist(initialChecklist);
      setChangeMap(map);
      setBreakingWatchlist(watchlist);
      setSelectedFileId(parsed.files[0]?.id || null);
      setSelectedFindingId(null);
      setActiveView('diff');
      setActiveMobileTab('diff');

      // Save to local history
      saveHistoryEntry({
        name,
        totalFiles: parsed.totalFiles,
        totalAdditions: parsed.totalAdditions,
        totalDeletions: parsed.totalDeletions,
        findingsCount: analysis.findings.length,
        highPriorityCount: analysis.summary.byPriority.HIGH,
        diffText: rawDiffText,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setParsedDiff(null);
    setProjectName('Current Changeset');
    setFindings([]);
    setSummary(null);
    setDependencies([]);
    setChecklist([]);
    setSelectedFileId(null);
    setSelectedFindingId(null);
    setSearchQuery('');
    setActiveView('diff');
    setActiveMobileTab('diff');
  };

  const handleToggleReviewed = (findingId: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, isReviewed: !f.isReviewed } : f))
    );
  };

  const handleDismissFinding = (findingId: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, isDismissed: true } : f))
    );
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i))
    );
  };

  const handleAddChecklistItem = (title: string, category: string) => {
    const newItem: ReviewChecklistItem = {
      id: `custom-chk-${Date.now()}`,
      category,
      title,
      completed: false,
      isCustom: true,
    };
    setChecklist((prev) => [...prev, newItem]);
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleJumpToFile = (filePath: string) => {
    if (!parsedDiff) return;
    const targetFile = parsedDiff.files.find((f) => f.newPath === filePath || f.oldPath === filePath);
    if (targetFile) {
      setSelectedFileId(targetFile.id);
      setActiveView('diff');
      setActiveMobileTab('diff');
      setTimeout(() => {
        const el = document.getElementById(`file-viewer-${targetFile.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const handleSelectFindingFromDiff = (finding: Finding) => {
    setSelectedFindingId(finding.id);
    setActiveRightTab('findings');
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    if (entry.diffText) {
      const parsed = parseGitDiff(entry.diffText);
      handleCompleteAnalysis(parsed, entry.diffText, entry.name);
    }
  };

  // Recompute summary when findings change (e.g. reviewed or dismissed)
  useEffect(() => {
    if (!parsedDiff) return;
    const active = findings.filter((f) => !f.isDismissed);
    const byPriority = { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEW: 0 };
    const byCategory: any = {
      api: 0,
      authorization: 0,
      authentication: 0,
      dependencies: 0,
      configuration: 0,
      database: 0,
      frontend: 0,
      backend: 0,
      tests: 0,
      security: 0,
      other: 0,
    };

    for (const f of active) {
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    setSummary({
      total: active.length,
      totalSignals: summary?.totalSignals || active.length,
      byPriority,
      byCategory,
      reviewedCount: active.filter((f) => f.isReviewed).length,
    });
  }, [findings, parsedDiff]);

  const reportObject =
    parsedDiff && summary
      ? buildReportObject(parsedDiff, findings, summary, dependencies, checklist)
      : null;

  const selectedFile = parsedDiff?.files.find((f) => f.id === selectedFileId) || null;

  return (
    <div className="flex flex-col h-full max-h-full sm:h-[calc(100dvh-3.5rem)] bg-white dark:bg-[#0b0d10] overflow-hidden text-neutral-900 dark:text-neutral-100">
      {/* Top Analysis Toolbar */}
      {parsedDiff && (
        <SummaryBar
          parsedDiff={parsedDiff}
          summary={summary}
          diffMode={diffMode}
          onToggleDiffMode={handleToggleDiffMode}
          onClear={handleClear}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenDiffInput={() => setParsedDiff(null)}
          onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            setActiveMobileTab('diff');
          }}
          breakingCount={breakingWatchlist.length}
          testIssuesCount={findings.filter((f) => f.category === 'tests').length}
          showLeftSidebar={showLeftSidebar}
          onToggleLeftSidebar={() => setShowLeftSidebar((v) => !v)}
          showRightSidebar={showRightSidebar}
          onToggleRightSidebar={() => setShowRightSidebar((v) => !v)}
        />
      )}

      {/* Main Workspace Area */}
      {!parsedDiff ? (
        <BeforeAfterWorkspace onAnalyze={handleCompleteAnalysis} />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile & Tablet View Selector Bar (visible below lg breakpoint) */}
          <div className="lg:hidden flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0c0e12] px-2 py-1.5 text-xs overflow-x-auto gap-1 shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveMobileTab('diff')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeMobileTab === 'diff'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Diff View</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('files')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeMobileTab === 'files'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Files</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                {parsedDiff.totalFiles}
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab('findings')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeMobileTab === 'findings'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Findings</span>
              {summary && summary.total > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  {summary.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMobileTab('checklist')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeMobileTab === 'checklist'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Checklist</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                {checklist.filter((i) => i.completed).length}/{checklist.length}
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab('overview')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeMobileTab === 'overview'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>Overview</span>
            </button>
          </div>

          {/* Main Content Area: Responsive on mobile vs 3-panel on desktop */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: Files Navigation (lg+ if showLeftSidebar, or mobile tab === 'files') */}
            <div
              className={`shrink-0 h-full border-r border-neutral-200 dark:border-neutral-800 ${
                activeMobileTab === 'files'
                  ? 'block w-full lg:hidden'
                  : showLeftSidebar
                  ? 'hidden lg:block w-60 xl:w-64 2xl:w-72'
                  : 'hidden'
              }`}
            >
              <FileTree
                files={parsedDiff.files}
                selectedFileId={selectedFileId}
                onSelectFile={(id) => {
                  setSelectedFileId(id);
                  const file = parsedDiff.files.find((f) => f.id === id);
                  if (file) handleJumpToFile(file.newPath);
                  setActiveMobileTab('diff');
                }}
                findings={findings}
                searchQuery={searchQuery}
              />
            </div>

            {/* Center Panel: Primary Viewport (Diff, Change Map, Breaking, Tests, Noise) */}
            <div
              className={`flex-1 flex-col h-full overflow-hidden min-w-0 ${
                activeMobileTab === 'diff' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {activeView === 'diff' && (
                <DiffViewer
                  files={parsedDiff.files}
                  selectedFileId={selectedFileId}
                  mode={diffMode}
                  findings={findings}
                  selectedFindingId={selectedFindingId}
                  onSelectFinding={(f) => {
                    handleSelectFindingFromDiff(f);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setActiveMobileTab('findings');
                    }
                  }}
                  onToggleDiffMode={handleToggleDiffMode}
                  onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
                  onToggleReviewedFinding={handleToggleReviewed}
                  onDismissFinding={handleDismissFinding}
                />
              )}

              {activeView === 'changemap' && (
                <ChangeMapView
                  changeMap={changeMap}
                  onSelectFile={(p) => {
                    handleJumpToFile(p);
                    setActiveMobileTab('diff');
                  }}
                />
              )}

              {activeView === 'breaking' && (
                <BreakingWatchlistView
                  watchlist={breakingWatchlist}
                  onSelectFile={(p) => {
                    handleJumpToFile(p);
                    setActiveMobileTab('diff');
                  }}
                />
              )}

              {activeView === 'tests' && (
                <TestImpactView
                  files={parsedDiff.files}
                  findings={findings}
                  onSelectFile={(p) => {
                    handleJumpToFile(p);
                    setActiveMobileTab('diff');
                  }}
                />
              )}

              {activeView === 'noise' && (
                <ChangeNoiseView
                  files={parsedDiff.files}
                  onSelectFile={(p) => {
                    handleJumpToFile(p);
                    setActiveMobileTab('diff');
                  }}
                />
              )}
            </div>

            {/* Mobile / Tablet Panels for Findings, Checklist, and Overview */}
            {activeMobileTab === 'findings' && (
              <div className="lg:hidden flex-1 h-full overflow-hidden">
                <FindingsPanel
                  findings={findings}
                  onToggleReviewed={handleToggleReviewed}
                  onDismissFinding={handleDismissFinding}
                  onJumpToFile={(p) => {
                    handleJumpToFile(p);
                    setActiveMobileTab('diff');
                  }}
                  selectedFindingId={selectedFindingId}
                  totalSignals={summary?.totalSignals}
                />
              </div>
            )}

            {activeMobileTab === 'checklist' && (
              <div className="lg:hidden flex-1 h-full overflow-hidden">
                <ReviewChecklist
                  items={checklist}
                  onToggleItem={handleToggleChecklistItem}
                  onAddItem={handleAddChecklistItem}
                  onDeleteItem={handleDeleteChecklistItem}
                />
              </div>
            )}

            {activeMobileTab === 'overview' && summary && (
              <div className="lg:hidden flex-1 h-full overflow-y-auto p-4 space-y-4">
                <ProjectOverview
                  parsedDiff={parsedDiff}
                  summary={summary}
                  findings={findings}
                  dependencies={dependencies}
                  projectName={projectName}
                />
              </div>
            )}

            {/* Desktop / Large Tablet Right Panel: Findings, Overview, Checklist, Dependencies */}
            <div
              className={`shrink-0 h-full flex-col border-l border-neutral-200 dark:border-neutral-800 ${
                showRightSidebar ? 'hidden lg:flex w-[340px] xl:w-[380px] 2xl:w-[440px]' : 'hidden'
              }`}
            >
              {/* Right Panel Header Tabs */}
              <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0c0e12] p-1 gap-1 text-xs">
                <button
                  onClick={() => setActiveRightTab('findings')}
                  className={`flex-1 py-1.5 rounded text-center font-medium transition-colors cursor-pointer ${
                    activeRightTab === 'findings'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Findings ({summary?.total || 0})
                </button>
                <button
                  onClick={() => setActiveRightTab('overview')}
                  className={`flex-1 py-1.5 rounded text-center font-medium transition-colors cursor-pointer ${
                    activeRightTab === 'overview'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveRightTab('checklist')}
                  className={`flex-1 py-1.5 rounded text-center font-medium transition-colors cursor-pointer ${
                    activeRightTab === 'checklist'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Checklist ({checklist.filter((i) => i.completed).length}/{checklist.length})
                </button>
                {dependencies.length > 0 && (
                  <button
                    onClick={() => setActiveRightTab('dependencies')}
                    className={`flex-1 py-1.5 rounded text-center font-medium transition-colors cursor-pointer ${
                      activeRightTab === 'dependencies'
                        ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Deps ({dependencies.length})
                  </button>
                )}
              </div>

              {/* Selected File Details Peek (Collapsible if present) */}
              {selectedFile && showFileDetails && (
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#12151b]">
                  <FileDetailsPanel
                    file={selectedFile}
                    findings={findings}
                    changeMap={changeMap}
                    onSelectRelatedFile={handleJumpToFile}
                    onClose={() => setShowFileDetails(false)}
                  />
                </div>
              )}

              {/* Right Subpanel Content */}
              <div className="flex-1 overflow-hidden">
                {activeRightTab === 'findings' && (
                  <FindingsPanel
                    findings={findings}
                    onToggleReviewed={handleToggleReviewed}
                    onDismissFinding={handleDismissFinding}
                    onJumpToFile={handleJumpToFile}
                    selectedFindingId={selectedFindingId}
                    totalSignals={summary?.totalSignals}
                  />
                )}
                {activeRightTab === 'overview' && summary && (
                  <div className="p-4 overflow-y-auto h-full space-y-4">
                    <ProjectOverview
                      parsedDiff={parsedDiff}
                      summary={summary}
                      findings={findings}
                      dependencies={dependencies}
                      projectName={projectName}
                    />
                    {selectedFile && !showFileDetails && (
                      <button
                        onClick={() => setShowFileDetails(true)}
                        className="w-full py-2 px-3 text-xs font-medium rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 cursor-pointer"
                      >
                        Inspect Selected File Details: {selectedFile.newPath}
                      </button>
                    )}
                  </div>
                )}
                {activeRightTab === 'checklist' && (
                  <ReviewChecklist
                    items={checklist}
                    onToggleItem={handleToggleChecklistItem}
                    onAddItem={handleAddChecklistItem}
                    onDeleteItem={handleDeleteChecklistItem}
                  />
                )}
                {activeRightTab === 'dependencies' && (
                  <DependencyInspector
                    dependencies={dependencies}
                    onUpdateDependencies={setDependencies}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation Bar (Fixed for quick one-thumb reach on devices below lg) */}
          <div className="lg:hidden flex items-center justify-around border-t border-neutral-200 dark:border-neutral-800 bg-white/98 dark:bg-[#0c0e12]/98 backdrop-blur-md px-2 py-1.5 text-[11px] shrink-0 z-30 shadow-lg select-none">
            <button
              onClick={() => setActiveMobileTab('diff')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors cursor-pointer ${
                activeMobileTab === 'diff'
                  ? 'text-neutral-950 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Diff</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('files')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors cursor-pointer relative ${
                activeMobileTab === 'files'
                  ? 'text-neutral-950 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <div className="relative">
                <FolderOpen className="h-4 w-4" />
                <span className="absolute -top-1 -right-2 text-[9px] font-mono px-1 rounded-full bg-neutral-200 dark:bg-neutral-700">
                  {parsedDiff.totalFiles}
                </span>
              </div>
              <span>Files</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('findings')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors cursor-pointer relative ${
                activeMobileTab === 'findings'
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <div className="relative">
                <AlertTriangle className="h-4 w-4" />
                {summary && summary.total > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-mono font-bold px-1 rounded-full bg-amber-500 text-white">
                    {summary.total}
                  </span>
                )}
              </div>
              <span>Findings</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('checklist')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors cursor-pointer ${
                activeMobileTab === 'checklist'
                  ? 'text-neutral-950 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Checklist</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('overview')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors cursor-pointer ${
                activeMobileTab === 'overview'
                  ? 'text-neutral-950 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Overview</span>
            </button>
          </div>
        </div>
      )}

      {/* Upgraded Project Import Modal */}
      <ProjectImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onCompleteAnalysis={handleCompleteAnalysis}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={reportObject}
      />

      {/* Local History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onLoadEntry={handleLoadHistory}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
