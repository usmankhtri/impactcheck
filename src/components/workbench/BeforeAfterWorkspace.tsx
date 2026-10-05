import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  GitCompare,
  FileText,
  Layers,
  ClipboardPaste,
  FileCode,
  Archive,
  FolderOpen,
  ArrowRight,
  ArrowDown,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { ParsedDiff, DiffFile } from '../../types/diff';
import { extractZipArchive } from '../../utils/zipParser';
import { compareFileMaps, createSnapshotProject, computeLineDiff } from '../../utils/diffGenerator';
import { parseGitDiff } from '../../parser/diffParser';
import {
  AnalysisInput,
  AnalysisStatus,
  AnalysisStageInfo,
} from '../../services/analysisPipeline';

export type ComparisonMode = 'before-after' | 'git-diff' | 'snapshot';
export type ImportMethod = 'paste' | 'file' | 'zip' | 'folder';

interface FileState {
  method: ImportMethod;
  name: string;
  path: string;
  content: string;
  filesMap?: Map<string, string>;
  lineCount: number;
  byteSize: number;
  fileCount?: number;
  isReady: boolean;
  isEditing?: boolean;
}

export interface BeforeAfterWorkspaceProps {
  onAnalyze: (input: AnalysisInput) => Promise<void> | void;
  analysisStatus?: AnalysisStatus;
  currentStage?: AnalysisStageInfo | null;
  analysisError?: string | null;
  isAnalyzing?: boolean;
}

const SAMPLE_PAIRS = [
  {
    id: 'api-change',
    title: 'API Route & Method Change',
    path: 'src/api/users.ts',
    before: `import { Router } from 'express';
export const router = Router();

// Legacy user list route
router.get('/api/v1/users', async (req, res) => {
  const users = await fetchUsers(req.query);
  return res.json({ data: users });
});

// Status check endpoint
router.get('/api/status', (req, res) => {
  return res.json({ status: 'ok', timestamp: Date.now() });
});`,
    after: `import { Router } from 'express';
export const router = Router();

// Updated user list route with cursor pagination
router.get('/api/v2/users', async (req, res) => {
  const users = await fetchUsers(req.query);
  return res.json({ data: users });
});

// Switch status ping to POST for health payloads
router.post('/api/status', (req, res) => {
  return res.json({ status: 'ok', timestamp: Date.now() });
});`,
  },
  {
    id: 'auth-guard',
    title: 'Authorization Guard Dropped',
    path: 'src/routes/users.ts',
    before: `import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
export const router = Router();

router.get('/:id', requireAuth, getUserHandler);
router.delete('/:id', requireAuth, requireAdmin, deleteHandler);`,
    after: `import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
export const router = Router();

router.get('/:id', requireAuth, getUserHandler);
router.delete('/:id', requireAuth, deleteHandler);`,
  },
  {
    id: 'db-migration',
    title: 'Destructive Column Drop',
    path: 'migrations/002_update.sql',
    before: `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  legacy_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);`,
    after: `ALTER TABLE users DROP COLUMN legacy_token;
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);`,
  },
  {
    id: 'deps-upgrade',
    title: 'Major Dependency Bump',
    path: 'package.json',
    before: `{
  "name": "impactcheck-sample",
  "version": "1.0.0",
  "dependencies": {
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}`,
    after: `{
  "name": "impactcheck-sample",
  "version": "2.0.0",
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`,
  },
];

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'TypeScript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'JavaScript';
    case 'json':
      return 'JSON';
    case 'sql':
      return 'SQL';
    case 'py':
      return 'Python';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'md':
      return 'Markdown';
    case 'yml':
    case 'yaml':
      return 'YAML';
    default:
      return 'Code';
  }
}

export const BeforeAfterWorkspace: React.FC<BeforeAfterWorkspaceProps> = ({
  onAnalyze,
  analysisStatus = 'idle',
  currentStage = null,
  analysisError = null,
  isAnalyzing = false,
}) => {
  const isCurrentlyAnalyzing = Boolean(isAnalyzing || analysisStatus === 'analyzing');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('before-after');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExamplesMenu, setShowExamplesMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Before & After States
  const [beforeState, setBeforeState] = useState<FileState>({
    method: 'paste',
    name: '',
    path: 'src/auth.ts',
    content: '',
    lineCount: 0,
    byteSize: 0,
    isReady: false,
    isEditing: true,
  });

  const [afterState, setAfterState] = useState<FileState>({
    method: 'paste',
    name: '',
    path: 'src/auth.ts',
    content: '',
    lineCount: 0,
    byteSize: 0,
    isReady: false,
    isEditing: true,
  });

  // Git Diff / Patch Mode State
  const [gitDiffMethod, setGitDiffMethod] = useState<'paste' | 'file'>('paste');
  const [gitDiffText, setGitDiffText] = useState('');
  const [gitDiffFileName, setGitDiffFileName] = useState('');

  // Snapshot Mode State
  const [snapshotFiles, setSnapshotFiles] = useState<Map<string, string> | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotCount, setSnapshotCount] = useState(0);

  // Hidden File Inputs
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const beforeZipInputRef = useRef<HTMLInputElement>(null);
  const afterZipInputRef = useRef<HTMLInputElement>(null);
  const beforeFolderInputRef = useRef<HTMLInputElement>(null);
  const afterFolderInputRef = useRef<HTMLInputElement>(null);
  const gitDiffFileInputRef = useRef<HTMLInputElement>(null);
  const snapshotZipInputRef = useRef<HTMLInputElement>(null);
  const snapshotFolderInputRef = useRef<HTMLInputElement>(null);

  // Sync paths when Before changes
  const handleBeforePathChange = (newPath: string) => {
    setBeforeState((prev) => ({ ...prev, path: newPath }));
    if (afterState.path === beforeState.path || !afterState.path || afterState.path === 'src/auth.ts') {
      setAfterState((prev) => ({ ...prev, path: newPath }));
    }
  };

  // Content Change Handler
  const handleContentChange = (side: 'before' | 'after', text: string) => {
    const lines = text ? text.split(/\r?\n/).length : 0;
    const bytes = new Blob([text]).size;
    const isReady = text.trim().length > 0;

    if (side === 'before') {
      setBeforeState((prev) => ({
        ...prev,
        content: text,
        lineCount: lines,
        byteSize: bytes,
        isReady,
        name: prev.name || prev.path.split('/').pop() || 'before_code',
      }));
    } else {
      setAfterState((prev) => ({
        ...prev,
        content: text,
        lineCount: lines,
        byteSize: bytes,
        isReady,
        name: prev.name || prev.path.split('/').pop() || 'after_code',
      }));
    }
    setErrorMessage(null);
  };

  // Upload Single File
  const handleSingleFileUpload = async (side: 'before' | 'after', file: File) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 2MB.`);
        return;
      }
      const text = await file.text();
      const lines = text ? text.split(/\r?\n/).length : 0;

      const update: FileState = {
        method: 'file',
        name: file.name,
        path: file.name,
        content: text,
        lineCount: lines,
        byteSize: file.size,
        isReady: true,
        isEditing: false,
      };

      if (side === 'before') {
        setBeforeState(update);
        if (!afterState.isReady || afterState.path === 'src/auth.ts') {
          setAfterState((prev) => ({ ...prev, path: file.name }));
        }
      } else {
        setAfterState(update);
      }
      setErrorMessage(null);
    } catch {
      setErrorMessage('Could not read the uploaded file.');
    }
  };

  // Upload ZIP
  const handleZipUpload = async (side: 'before' | 'after', file: File) => {
    if (!file) return;
    try {
      const extracted = await extractZipArchive(file);
      if (extracted.files.size === 0) {
        throw new Error('No readable text files found in ZIP archive.');
      }

      let totalLines = 0;
      for (const text of extracted.files.values()) {
        totalLines += text.split(/\r?\n/).length;
      }

      const update: FileState = {
        method: 'zip',
        name: file.name,
        path: file.name,
        content: '',
        filesMap: extracted.files,
        lineCount: totalLines,
        byteSize: extracted.totalBytes,
        fileCount: extracted.files.size,
        isReady: true,
        isEditing: false,
      };

      if (side === 'before') {
        setBeforeState(update);
      } else {
        setAfterState(update);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid ZIP file.');
    }
  };

  // Upload Folder
  const handleFolderUpload = async (side: 'before' | 'after', fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      const map = new Map<string, string>();
      let totalBytes = 0;
      let totalLines = 0;

      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const relPath = f.webkitRelativePath.split('/').slice(1).join('/') || f.name;
        if (f.size <= 1500000 && !/\.(png|jpg|jpeg|gif|ico|pdf|zip|gz|exe)$/i.test(f.name)) {
          const text = await f.text();
          map.set(relPath, text);
          totalBytes += f.size;
          totalLines += text.split(/\r?\n/).length;
        }
      }

      if (map.size === 0) {
        throw new Error('No readable text files found in selected folder.');
      }

      const folderName = fileList[0]?.webkitRelativePath.split('/')[0] || (side === 'before' ? 'Before Folder' : 'After Folder');

      const update: FileState = {
        method: 'folder',
        name: folderName,
        path: folderName,
        content: '',
        filesMap: map,
        lineCount: totalLines,
        byteSize: totalBytes,
        fileCount: map.size,
        isReady: true,
        isEditing: false,
      };

      if (side === 'before') {
        setBeforeState(update);
      } else {
        setAfterState(update);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid folder selection.');
    }
  };

  // Clear a side
  const handleClearSide = (side: 'before' | 'after') => {
    const emptyState: FileState = {
      method: 'paste',
      name: '',
      path: side === 'before' ? 'src/auth.ts' : beforeState.path || 'src/auth.ts',
      content: '',
      lineCount: 0,
      byteSize: 0,
      isReady: false,
      isEditing: true,
    };
    if (side === 'before') {
      setBeforeState(emptyState);
    } else {
      setAfterState(emptyState);
    }
    setErrorMessage(null);
  };

  // Load sample pair
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_PAIRS.find((s) => s.id === sampleId) || SAMPLE_PAIRS[0];
    const beforeLines = sample.before.split(/\r?\n/).length;
    const afterLines = sample.after.split(/\r?\n/).length;

    setComparisonMode('before-after');
    setBeforeState({
      method: 'paste',
      name: sample.path,
      path: sample.path,
      content: sample.before,
      lineCount: beforeLines,
      byteSize: new Blob([sample.before]).size,
      isReady: true,
      isEditing: false,
    });
    setAfterState({
      method: 'paste',
      name: sample.path,
      path: sample.path,
      content: sample.after,
      lineCount: afterLines,
      byteSize: new Blob([sample.after]).size,
      isReady: true,
      isEditing: false,
    });
    setShowExamplesMenu(false);
    setErrorMessage(null);
  };

  // Validation
  const validation = useMemo(() => {
    if (comparisonMode === 'before-after') {
      if (!beforeState.isReady && !afterState.isReady) {
        return { canAnalyze: false, message: 'Add both versions to continue.' };
      }
      if (!beforeState.isReady) {
        return { canAnalyze: false, message: 'Add the Before version to continue.' };
      }
      if (!afterState.isReady) {
        return { canAnalyze: false, message: 'Add the After version to continue.' };
      }
      return { canAnalyze: true, message: 'Ready to analyze' };
    }

    if (comparisonMode === 'git-diff') {
      if (!gitDiffText.trim()) {
        return { canAnalyze: false, message: 'Paste or upload a Git diff to continue.' };
      }
      return { canAnalyze: true, message: 'Ready to analyze' };
    }

    if (comparisonMode === 'snapshot') {
      if (!snapshotFiles || snapshotFiles.size === 0) {
        return { canAnalyze: false, message: 'Select a project ZIP or folder to continue.' };
      }
      return { canAnalyze: true, message: 'Ready to analyze' };
    }

    return { canAnalyze: false, message: '' };
  }, [comparisonMode, beforeState, afterState, gitDiffText, snapshotFiles]);

  // Execute Analysis
  const handleExecuteAnalysis = () => {
    if (!validation.canAnalyze || isCurrentlyAnalyzing) return;
    setErrorMessage(null);

    try {
      if (comparisonMode === 'before-after') {
        // Project vs Project
        if (beforeState.filesMap && afterState.filesMap) {
          onAnalyze({
            type: 'before-after-projects',
            beforeName: beforeState.name || 'Base Project',
            afterName: afterState.name || 'Target Project',
            beforeFiles: beforeState.filesMap,
            afterFiles: afterState.filesMap,
          });
          return;
        }

        // Single File vs Single File
        const beforePath = beforeState.path.trim() || 'src/file.ts';
        const afterPath = afterState.path.trim() || beforePath;
        const beforeText = beforeState.content;
        const afterText = afterState.content;

        onAnalyze({
          type: 'before-after-text',
          beforePath,
          beforeContent: beforeText,
          afterPath,
          afterContent: afterText,
          projectName: afterPath.split('/').pop() || 'File Comparison',
        });
        return;
      }

      if (comparisonMode === 'git-diff') {
        onAnalyze({
          type: 'git-diff',
          diffText: gitDiffText,
          fileName: gitDiffFileName || undefined,
        });
        return;
      }

      if (comparisonMode === 'snapshot') {
        if (!snapshotFiles) return;
        onAnalyze({
          type: 'snapshot',
          projectName: snapshotName || 'Project Snapshot',
          files: snapshotFiles,
        });
        return;
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Analysis failed. Please check input format.');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
      {/* Hidden file inputs */}
      <input ref={beforeFileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleSingleFileUpload('before', e.target.files[0])} />
      <input ref={afterFileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleSingleFileUpload('after', e.target.files[0])} />
      <input ref={beforeZipInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && handleZipUpload('before', e.target.files[0])} />
      <input ref={afterZipInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && handleZipUpload('after', e.target.files[0])} />
      <input ref={beforeFolderInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => handleFolderUpload('before', e.target.files)} />
      <input ref={afterFolderInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => handleFolderUpload('after', e.target.files)} />
      <input ref={gitDiffFileInputRef} type="file" accept=".diff,.patch,.txt" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) {
          setGitDiffText(await f.text());
          setGitDiffFileName(f.name);
        }
      }} />
      <input ref={snapshotZipInputRef} type="file" accept=".zip" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) {
          try {
            const res = await extractZipArchive(f);
            setSnapshotFiles(res.files);
            setSnapshotName(f.name);
            setSnapshotCount(res.files.size);
          } catch {
            setErrorMessage('Invalid ZIP archive.');
          }
        }
      }} />
      <input ref={snapshotFolderInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={async (e) => {
        const list = e.target.files;
        if (list && list.length > 0) {
          const map = new Map<string, string>();
          for (let i = 0; i < list.length; i++) {
            const f = list[i];
            if (f.size <= 1500000 && !/\.(png|jpg|jpeg|gif|ico|pdf|zip|gz)$/i.test(f.name)) {
              map.set(f.webkitRelativePath.split('/').slice(1).join('/') || f.name, await f.text());
            }
          }
          setSnapshotFiles(map);
          setSnapshotName(list[0]?.webkitRelativePath.split('/')[0] || 'Local Project');
          setSnapshotCount(map.size);
        }
      }} />

      {/* Header: Title & Compact Selector */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Compare a change
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Understand what your code changes could affect before you merge.
          </p>
        </div>

        {/* Compact Mode Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-xs">
            <button
              type="button"
              onClick={() => setComparisonMode('before-after')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'before-after'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Before / After
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('git-diff')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'git-diff'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Git / Patch
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('snapshot')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'snapshot'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Snapshot
            </button>
          </div>

          {/* Examples Action */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExamplesMenu(!showExamplesMenu)}
              className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Examples</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showExamplesMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12151c] shadow-lg py-1 z-50 text-xs">
                {SAMPLE_PAIRS.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleLoadSample(ex.id)}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* How to import help action */}
          <button
            type="button"
            onClick={() => setShowHelpModal(!showHelpModal)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            title="How to import"
            aria-label="How to import"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* How to Import Modal / Popover */}
      {showHelpModal && (
        <div className="my-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111419] text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-white">
            <span>How to import</span>
            <button onClick={() => setShowHelpModal(false)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
            <div>
              <strong className="block text-neutral-900 dark:text-neutral-200">Before / After</strong>
              Put the older version on the left and newer version on the right.
            </div>
            <div>
              <strong className="block text-neutral-900 dark:text-neutral-200">Single file</strong>
              Use the same file before and after the change.
            </div>
            <div>
              <strong className="block text-neutral-900 dark:text-neutral-200">Project</strong>
              Put the older project on the left and updated project on the right.
            </div>
            <div>
              <strong className="block text-neutral-900 dark:text-neutral-200">Git / Patch</strong>
              Use Git diff or a patch if you already have the change.
            </div>
          </div>
        </div>
      )}

      {/* Main Mode View */}
      {comparisonMode === 'before-after' && (
        <div className="flex-1 flex flex-col mt-5 space-y-6">
          {/* Desktop side-by-side / Mobile stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* BEFORE PANEL */}
            <SideSection
              title="Before"
              subtitle="Old version"
              helper="Use the version before your change."
              placeholder="Paste your old code."
              state={beforeState}
              onPathChange={handleBeforePathChange}
              onContentChange={(t) => handleContentChange('before', t)}
              onSelectPaste={() => setBeforeState((p) => ({ ...p, method: 'paste', isEditing: true }))}
              onSelectFile={() => beforeFileInputRef.current?.click()}
              onSelectZip={() => beforeZipInputRef.current?.click()}
              onSelectFolder={() => beforeFolderInputRef.current?.click()}
              onClear={() => handleClearSide('before')}
              onToggleEdit={() => setBeforeState((p) => ({ ...p, isEditing: !p.isEditing }))}
              disabled={isCurrentlyAnalyzing}
            />

            {/* Mobile divider */}
            <div className="flex lg:hidden items-center justify-center -my-2 text-neutral-400">
              <ArrowDown className="h-4 w-4" />
            </div>

            {/* AFTER PANEL */}
            <SideSection
              title="After"
              subtitle="New version"
              helper="Use the version after your change."
              placeholder="Paste your new code."
              state={afterState}
              onPathChange={(p) => setAfterState((prev) => ({ ...prev, path: p }))}
              onContentChange={(t) => handleContentChange('after', t)}
              onSelectPaste={() => setAfterState((p) => ({ ...p, method: 'paste', isEditing: true }))}
              onSelectFile={() => afterFileInputRef.current?.click()}
              onSelectZip={() => afterZipInputRef.current?.click()}
              onSelectFolder={() => afterFolderInputRef.current?.click()}
              onClear={() => handleClearSide('after')}
              onToggleEdit={() => setAfterState((p) => ({ ...p, isEditing: !p.isEditing }))}
              disabled={isCurrentlyAnalyzing}
            />
          </div>
        </div>
      )}

      {/* GIT / PATCH MODE */}
      {comparisonMode === 'git-diff' && (
        <div className="mt-5 p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] space-y-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
              Git diff or patch
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Paste or upload the change you want to review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCurrentlyAnalyzing}
              onClick={() => setGitDiffMethod('paste')}
              className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
                gitDiffMethod === 'paste'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
              } ${isCurrentlyAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Paste diff
            </button>
            <button
              type="button"
              disabled={isCurrentlyAnalyzing}
              onClick={() => {
                setGitDiffMethod('file');
                gitDiffFileInputRef.current?.click();
              }}
              className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
                gitDiffMethod === 'file'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
              } ${isCurrentlyAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Upload .diff file
            </button>
          </div>

          <textarea
            value={gitDiffText}
            disabled={isCurrentlyAnalyzing}
            onChange={(e) => setGitDiffText(e.target.value)}
            placeholder={`diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,3 +10,3 @@
-const port = 3000;
+const port = process.env.PORT || 8080;`}
            className="w-full h-72 p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-transparent font-mono text-xs text-neutral-900 dark:text-neutral-100 leading-5 focus:outline-none overflow-x-auto whitespace-pre disabled:opacity-50"
            spellCheck={false}
          />
        </div>
      )}

      {/* SNAPSHOT MODE */}
      {comparisonMode === 'snapshot' && (
        <div className="mt-5 p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] space-y-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
              Project Snapshot
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Analyze a project as it currently exists. This analyzes the current project and does not assume uploaded files are historical changes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={isCurrentlyAnalyzing}
              onClick={() => snapshotZipInputRef.current?.click()}
              className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/30 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="h-5 w-5 text-neutral-700 dark:text-neutral-300 mb-1.5" />
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Upload ZIP</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Archive containing project source files.</div>
            </button>

            <button
              type="button"
              disabled={isCurrentlyAnalyzing}
              onClick={() => snapshotFolderInputRef.current?.click()}
              className="p-5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/30 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="h-5 w-5 text-neutral-700 dark:text-neutral-300 mb-1.5" />
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Select folder</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">Pick local directory from your device.</div>
            </button>
          </div>

          {snapshotCount > 0 && (
            <div className="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs flex items-center justify-between">
              <span className="font-mono text-neutral-700 dark:text-neutral-300">
                {snapshotName} · {snapshotCount} files loaded
              </span>
              <button
                type="button"
                disabled={isCurrentlyAnalyzing}
                onClick={() => {
                  setSnapshotFiles(null);
                  setSnapshotCount(0);
                  setSnapshotName('');
                }}
                className="text-neutral-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {(errorMessage || analysisError) && (
        <div className="mt-4 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>{errorMessage || analysisError}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 dark:text-rose-300 hover:underline cursor-pointer font-medium text-xs ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Analysis State vs Primary Action Button */}
      {isCurrentlyAnalyzing ? (
        <div className="mt-8 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center">
          <div className="w-full max-w-lg p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 shadow-xs flex flex-col items-center text-center">
            {/* Subtle spinner & title */}
            <div className="flex items-center gap-2.5 text-neutral-950 dark:text-white font-semibold text-sm">
              <svg
                className="animate-spin h-4 w-4 text-neutral-800 dark:text-neutral-200"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Analyzing your changes…</span>
            </div>

            {/* Current Real Stage */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                Stage {currentStage?.stepIndex || 1} of {currentStage?.totalSteps || 7}
              </span>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {currentStage?.label || 'Processing…'}
              </span>
            </div>

            {/* Detail */}
            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-mono text-center max-w-md truncate">
              {currentStage?.detail || 'Inspecting syntax and differences…'}
            </p>

            {/* Stage Progress Pills */}
            <div className="mt-4 flex items-center justify-center gap-1.5 w-full max-w-xs">
              {Array.from({ length: 7 }).map((_, idx) => {
                const currentIdx = (currentStage?.stepIndex || 1) - 1;
                const isPassed = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      isPassed
                        ? 'bg-neutral-900 dark:bg-neutral-100'
                        : isCurrent
                        ? 'bg-neutral-500 dark:bg-neutral-400 animate-pulse'
                        : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Primary Action Button (Centered & Clean) */
        <div className="mt-8 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center space-y-2">
          <button
            type="button"
            disabled={!validation.canAnalyze || isCurrentlyAnalyzing}
            onClick={handleExecuteAnalysis}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              validation.canAnalyze && !isCurrentlyAnalyzing
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
          >
            <span>Analyze Impact →</span>
          </button>

          <span className="text-xs text-neutral-500 font-medium">
            {validation.message}
          </span>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   SIDE SECTION COMPONENT (BEFORE OR AFTER)
   ========================================================================== */

interface SideSectionProps {
  title: 'Before' | 'After';
  subtitle: string;
  helper: string;
  placeholder: string;
  state: FileState;
  onPathChange: (path: string) => void;
  onContentChange: (content: string) => void;
  onSelectPaste: () => void;
  onSelectFile: () => void;
  onSelectZip: () => void;
  onSelectFolder: () => void;
  onClear: () => void;
  onToggleEdit: () => void;
  disabled?: boolean;
}

const SideSection: React.FC<SideSectionProps> = ({
  title,
  subtitle,
  helper,
  placeholder,
  state,
  onPathChange,
  onContentChange,
  onSelectPaste,
  onSelectFile,
  onSelectZip,
  onSelectFolder,
  onClear,
  onToggleEdit,
  disabled = false,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    const count = state.content ? state.content.split(/\r?\n/).length : 1;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  }, [state.content]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Close add menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showAddMenu]);

  const isPasteMode = state.method === 'paste' || state.isEditing;

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] overflow-hidden flex flex-col min-h-[360px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-950 dark:text-white">
            {title}
          </h2>
          <p className="text-[11px] text-neutral-500">{subtitle}</p>
        </div>

        {/* Add Code Action Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setShowAddMenu(!showAddMenu)}
            className={`px-2.5 py-1 text-xs font-medium rounded border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Plus className="h-3 w-3" />
            <span>Add code</span>
          </button>

          {showAddMenu && !disabled && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12151c] shadow-lg py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onSelectPaste();
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                <ClipboardPaste className="h-3.5 w-3.5 text-neutral-400" />
                <span>Paste code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectFile();
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                <FileCode className="h-3.5 w-3.5 text-neutral-400" />
                <span>Upload file</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectZip();
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5 text-neutral-400" />
                <span>Upload project ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectFolder();
                  setShowAddMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                <span>Select folder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body: Imported Content Summary OR Code Editor */}
      {!isPasteMode && state.isReady ? (
        /* Minimal Imported Content Card */
        <div className="flex-1 flex flex-col justify-center p-6 text-center space-y-3">
          <div>
            <div className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {state.name || state.path}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {state.fileCount
                ? `${state.fileCount} files`
                : `${detectLanguageFromPath(state.path)} · ${state.lineCount} lines`}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs pt-2">
            {state.content && (
              <button
                type="button"
                disabled={disabled}
                onClick={onToggleEdit}
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer disabled:opacity-50"
              >
                View / Edit
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={onSelectPaste}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="text-neutral-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Code Editor */
        <div className="flex-1 flex flex-col p-3 space-y-2">
          {/* Path bar */}
          <div className="flex items-center justify-between text-xs px-2 py-1 rounded bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800">
            <input
              type="text"
              disabled={disabled}
              value={state.path}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="src/file.ts"
              className="font-mono text-xs text-neutral-800 dark:text-neutral-200 bg-transparent focus:outline-none flex-1 disabled:opacity-50"
            />
            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
              {detectLanguageFromPath(state.path)}
            </span>
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 min-h-[220px] flex rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#080a0e] overflow-hidden focus-within:border-neutral-400">
            {/* Line numbers gutter */}
            <div
              ref={gutterRef}
              className="select-none py-2 px-2 bg-neutral-50 dark:bg-[#0b0d11] border-r border-neutral-100 dark:border-neutral-800/80 text-[11px] font-mono text-neutral-400 text-right overflow-hidden leading-5"
              style={{ minWidth: '2.2rem' }}
              aria-hidden="true"
            >
              {lines.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              disabled={disabled}
              value={state.content}
              onChange={(e) => onContentChange(e.target.value)}
              onScroll={handleScroll}
              placeholder={`${placeholder}\n${helper}`}
              className="flex-1 p-2 bg-transparent text-xs font-mono text-neutral-900 dark:text-neutral-100 leading-5 focus:outline-none resize-none overflow-x-auto whitespace-pre disabled:opacity-50"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>

          {/* Helper info & clear */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 pt-0.5">
            <span>{helper}</span>
            {state.content && (
              <button
                type="button"
                disabled={disabled}
                onClick={onClear}
                className="hover:text-rose-600 cursor-pointer disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
