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
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  Check,
  Copy,
} from 'lucide-react';
import { ParsedDiff, DiffFile } from '../../types/diff';
import { extractZipArchive } from '../../utils/zipParser';
import { compareFileMaps, createSnapshotProject, computeLineDiff } from '../../utils/diffGenerator';
import { detectProjectMetadata } from '../../utils/projectDetector';
import { parseGitDiff } from '../../parser/diffParser';
import { EXAMPLES } from '../../examples';

export type ComparisonMode = 'before-after' | 'git-diff' | 'snapshot';
export type ImportMethod = 'paste' | 'file' | 'zip' | 'folder';

interface FileState {
  method: ImportMethod;
  name: string;
  path: string;
  content: string; // For single file or paste
  filesMap?: Map<string, string>; // For zip or folder
  lineCount: number;
  byteSize: number;
  fileCount?: number;
  isReady: boolean;
  isEditing?: boolean;
}

interface BeforeAfterWorkspaceProps {
  onAnalyze: (parsedDiff: ParsedDiff, rawDiffText?: string, projectName?: string) => void;
}

const SAMPLE_PAIRS = [
  {
    id: 'api-change',
    title: 'API Route & Method Change',
    category: 'API Impact',
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
    category: 'Security Impact',
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
    title: 'Destructive DB Column Drop',
    category: 'Database Impact',
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
    category: 'Dependencies',
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
    case 'scss':
      return 'CSS';
    case 'md':
      return 'Markdown';
    case 'yml':
    case 'yaml':
      return 'YAML';
    case 'env':
      return 'Config';
    default:
      return 'Text';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const BeforeAfterWorkspace: React.FC<BeforeAfterWorkspaceProps> = ({ onAnalyze }) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('before-after');
  const [showHelp, setShowHelp] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  const [snapshotMethod, setSnapshotMethod] = useState<'zip' | 'folder'>('zip');
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

  // Sync paths if user edits Before path and After matches default or previous
  const handleBeforePathChange = (newPath: string) => {
    setBeforeState((prev) => ({ ...prev, path: newPath }));
    if (afterState.path === beforeState.path || !afterState.path || afterState.path === 'src/auth.ts') {
      setAfterState((prev) => ({ ...prev, path: newPath }));
    }
  };

  // Paste Content Handler
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
        setErrorMessage(`File "${file.name}" is over 2MB. Please upload a smaller source file.`);
        return;
      }
      const text = await file.text();
      const lines = text ? text.split(/\r?\n/).length : 0;

      const stateUpdate: FileState = {
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
        setBeforeState(stateUpdate);
        if (!afterState.isReady || afterState.path === 'src/auth.ts') {
          setAfterState((prev) => ({ ...prev, path: file.name }));
        }
      } else {
        setAfterState(stateUpdate);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(`Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Upload Project ZIP
  const handleZipUpload = async (side: 'before' | 'after', file: File) => {
    if (!file) return;
    try {
      setIsAnalyzing(true);
      const extracted = await extractZipArchive(file);
      if (extracted.files.size === 0) {
        throw new Error('No readable source text files found in ZIP.');
      }

      let totalLines = 0;
      for (const text of extracted.files.values()) {
        totalLines += text.split(/\r?\n/).length;
      }

      const stateUpdate: FileState = {
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
        setBeforeState(stateUpdate);
      } else {
        setAfterState(stateUpdate);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(`ZIP extraction error: ${err instanceof Error ? err.message : 'Invalid ZIP'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload Folder (webkitdirectory)
  const handleFolderUpload = async (side: 'before' | 'after', fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      setIsAnalyzing(true);
      const map = new Map<string, string>();
      let totalBytes = 0;
      let totalLines = 0;

      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const relPath = f.webkitRelativePath.split('/').slice(1).join('/') || f.name;
        if (f.size <= 1500000 && !/\.(png|jpg|jpeg|gif|ico|pdf|zip|gz|exe|dll|dylib)$/i.test(f.name)) {
          const text = await f.text();
          map.set(relPath, text);
          totalBytes += f.size;
          totalLines += text.split(/\r?\n/).length;
        }
      }

      if (map.size === 0) {
        throw new Error('No readable source text files were found in the selected directory.');
      }

      const folderName = fileList[0]?.webkitRelativePath.split('/')[0] || (side === 'before' ? 'Before Folder' : 'After Folder');

      const stateUpdate: FileState = {
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
        setBeforeState(stateUpdate);
      } else {
        setAfterState(stateUpdate);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(`Folder upload error: ${err instanceof Error ? err.message : 'Invalid folder'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset a side
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

  // Load a Pre-configured Example Pair
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
    setErrorMessage(null);
  };

  // Validation Status Computation
  const validation = useMemo(() => {
    if (comparisonMode === 'before-after') {
      if (!beforeState.isReady && !afterState.isReady) {
        return {
          canAnalyze: false,
          status: 'empty',
          message: 'Add the previous version on the left (Before), and the updated version on the right (After).',
        };
      }
      if (!beforeState.isReady && afterState.isReady) {
        return {
          canAnalyze: false,
          status: 'missing-before',
          message: 'Before version is missing: Add the previous version on the left to compare against.',
        };
      }
      if (beforeState.isReady && !afterState.isReady) {
        return {
          canAnalyze: false,
          status: 'missing-after',
          message: 'After version is missing: Add the updated version on the right to perform comparison.',
        };
      }

      // Check if both are single files and identical
      if (
        (beforeState.method === 'paste' || beforeState.method === 'file') &&
        (afterState.method === 'paste' || afterState.method === 'file')
      ) {
        if (beforeState.content.trim() === afterState.content.trim()) {
          return {
            canAnalyze: true,
            status: 'identical',
            message: 'Note: Before and After code are identical (no line diffs detected).',
          };
        }
      }

      // If comparing single file with project
      if (
        (beforeState.filesMap && !afterState.filesMap) ||
        (!beforeState.filesMap && afterState.filesMap)
      ) {
        return {
          canAnalyze: false,
          status: 'mismatched-types',
          message: 'One side is a full project while the other is a single file. Compare two files or two projects for best results.',
        };
      }

      return {
        canAnalyze: true,
        status: 'ready',
        message: 'Before and After are ready to compare.',
      };
    }

    if (comparisonMode === 'git-diff') {
      if (!gitDiffText.trim()) {
        return {
          canAnalyze: false,
          status: 'empty',
          message: 'Paste a Git diff or upload a .diff / .patch file.',
        };
      }
      return {
        canAnalyze: true,
        status: 'ready',
        message: 'Git diff is ready for analysis.',
      };
    }

    if (comparisonMode === 'snapshot') {
      if (!snapshotFiles || snapshotFiles.size === 0) {
        return {
          canAnalyze: false,
          status: 'empty',
          message: 'Upload a project ZIP or select a local folder to audit codebase state.',
        };
      }
      return {
        canAnalyze: true,
        status: 'ready',
        message: `${snapshotCount} files loaded for standalone codebase audit.`,
      };
    }

    return { canAnalyze: false, status: 'empty', message: '' };
  }, [comparisonMode, beforeState, afterState, gitDiffText, snapshotFiles, snapshotCount]);

  // Execute Analysis
  const handleExecuteAnalysis = () => {
    if (!validation.canAnalyze || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      if (comparisonMode === 'before-after') {
        // Project vs Project (ZIP or Folder)
        if (beforeState.filesMap && afterState.filesMap) {
          const parsed = compareFileMaps(beforeState.filesMap, afterState.filesMap);
          parsed.analysisMode = 'comparison';
          const projectName = `${beforeState.name} → ${afterState.name}`;
          onAnalyze(parsed, undefined, projectName);
          return;
        }

        // Single File vs Single File (Paste or File upload)
        const beforePath = beforeState.path.trim() || 'src/file.ts';
        const afterPath = afterState.path.trim() || beforePath;
        const beforeText = beforeState.content;
        const afterText = afterState.content;

        const { hunks, additions, deletions } = computeLineDiff(beforeText, afterText);
        const status = beforePath === afterPath ? 'modified' : 'renamed';
        const linesAnalyzed = (beforeText ? beforeText.split(/\r?\n/).length : 0) + (afterText ? afterText.split(/\r?\n/).length : 0);

        const diffFile: DiffFile = {
          id: `file-cmp-${Date.now()}`,
          oldPath: beforePath,
          newPath: afterPath,
          status,
          isBinary: false,
          isLockfile: /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(afterPath),
          additions,
          deletions,
          linesAnalyzed,
          hunks,
          rawHeader: [`diff --git a/${beforePath} b/${afterPath}`, `--- a/${beforePath}`, `+++ b/${afterPath}`],
          beforeContent: beforeText,
          afterContent: afterText,
        };

        const parsedDiff: ParsedDiff = {
          files: [diffFile],
          totalFiles: 1,
          totalAdditions: additions,
          totalDeletions: deletions,
          totalLinesAnalyzed: linesAnalyzed,
          hasBinaryFiles: false,
          hasLockfiles: diffFile.isLockfile,
          parsedAt: new Date().toISOString(),
          analysisMode: 'comparison',
          hasBaseline: true,
        };

        const projectName = afterPath.split('/').pop() || 'File Comparison';
        onAnalyze(parsedDiff, undefined, projectName);
        return;
      }

      if (comparisonMode === 'git-diff') {
        const parsed = parseGitDiff(gitDiffText);
        parsed.analysisMode = 'git-diff';
        const projectName = gitDiffFileName || parsed.files[0]?.newPath || 'Git Diff';
        onAnalyze(parsed, gitDiffText, projectName);
        return;
      }

      if (comparisonMode === 'snapshot') {
        if (!snapshotFiles) return;
        const parsed = createSnapshotProject(snapshotFiles);
        const projectName = snapshotName || 'Project Snapshot';
        onAnalyze(parsed, undefined, projectName);
        return;
      }
    } catch (err: unknown) {
      setErrorMessage(`Analysis failed: ${err instanceof Error ? err.message : 'Please check input format.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd+Enter to trigger analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (validation.canAnalyze && !isAnalyzing) {
          e.preventDefault();
          handleExecuteAnalysis();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [validation.canAnalyze, isAnalyzing]);

  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
      {/* Hidden file inputs */}
      <input
        ref={beforeFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleSingleFileUpload('before', e.target.files[0]);
        }}
      />
      <input
        ref={afterFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleSingleFileUpload('after', e.target.files[0]);
        }}
      />
      <input
        ref={beforeZipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleZipUpload('before', e.target.files[0]);
        }}
      />
      <input
        ref={afterZipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleZipUpload('after', e.target.files[0]);
        }}
      />
      <input
        ref={beforeFolderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in browsers
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={(e) => handleFolderUpload('before', e.target.files)}
      />
      <input
        ref={afterFolderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in browsers
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={(e) => handleFolderUpload('after', e.target.files)}
      />
      <input
        ref={gitDiffFileInputRef}
        type="file"
        accept=".diff,.patch,.txt"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            const text = await f.text();
            setGitDiffText(text);
            setGitDiffFileName(f.name);
          }
        }}
      />
      <input
        ref={snapshotZipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            setIsAnalyzing(true);
            try {
              const res = await extractZipArchive(f);
              setSnapshotFiles(res.files);
              setSnapshotName(f.name);
              setSnapshotCount(res.files.size);
            } catch (err: unknown) {
              setErrorMessage(`ZIP error: ${err instanceof Error ? err.message : 'Invalid archive'}`);
            } finally {
              setIsAnalyzing(false);
            }
          }
        }}
      />
      <input
        ref={snapshotFolderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={async (e) => {
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
        }}
      />

      {/* Header Zone: Mode Selector & Help */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Compare a change
            </h1>
            <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              Before → After
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Understand what your code changes could affect before you merge.
          </p>
        </div>

        {/* Comparison Type Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-xs font-medium">
            <button
              type="button"
              onClick={() => setComparisonMode('before-after')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'before-after'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100" />
              <span>Before / After</span>
            </button>

            <button
              type="button"
              onClick={() => setComparisonMode('git-diff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'git-diff'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Git Diff / Patch</span>
            </button>

            <button
              type="button"
              onClick={() => setComparisonMode('snapshot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                comparisonMode === 'snapshot'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
              <span>Snapshot</span>
            </button>
          </div>

          {/* How to import toggle */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              showHelp
                ? 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-950 dark:text-white'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="How to import help"
            aria-label="How to import help"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>
      </div>

      {/* Unobtrusive Help Affordance */}
      {showHelp && (
        <div className="mt-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#111419] text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              <span>How to Import & Compare</span>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-white dark:bg-[#0c0e12] border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">File Comparison</div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                Paste or upload the previous version of the file as <strong>Before</strong>, and the updated version as <strong>After</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#0c0e12] border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Project Comparison</div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                Upload your previous project ZIP/folder as <strong>Before</strong> on the left, and updated project as <strong>After</strong> on the right.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#0c0e12] border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Git Diff / Patch</div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                Switch to <strong>Git Diff / Patch</strong> mode to paste or upload raw unified diffs from your terminal or pull request.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preset Quick Samples (One-click test drive) */}
      <div className="py-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
          <span>Quick Scenario Presets:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SAMPLE_PAIRS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample.id)}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Mode View */}
      {comparisonMode === 'before-after' && (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Side-by-Side (Desktop) / Stacked (Mobile) Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {/* Desktop Center Connector Indicator */}
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center">
              <div className="flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#12151c] text-neutral-700 dark:text-neutral-300 shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* LEFT: BEFORE PANEL */}
            <SideInputPanel
              side="before"
              title="Before"
              badge="Old State"
              subtitle="Your older version — the code or project before your changes."
              state={beforeState}
              onMethodChange={(method) => {
                setBeforeState((prev) => ({ ...prev, method }));
                if (method === 'file') beforeFileInputRef.current?.click();
                if (method === 'zip') beforeZipInputRef.current?.click();
                if (method === 'folder') beforeFolderInputRef.current?.click();
              }}
              onPathChange={handleBeforePathChange}
              onContentChange={(text) => handleContentChange('before', text)}
              onUploadFile={() => beforeFileInputRef.current?.click()}
              onUploadZip={() => beforeZipInputRef.current?.click()}
              onUploadFolder={() => beforeFolderInputRef.current?.click()}
              onClear={() => handleClearSide('before')}
              onToggleEdit={() => setBeforeState((prev) => ({ ...prev, isEditing: !prev.isEditing }))}
            />

            {/* Mobile Vertical Arrow Indicator */}
            <div className="flex lg:hidden items-center justify-center -my-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 font-medium">
                <span>Before</span>
                <ArrowDown className="h-3 w-3" />
                <span>After</span>
              </div>
            </div>

            {/* RIGHT: AFTER PANEL */}
            <SideInputPanel
              side="after"
              title="After"
              badge="New State"
              subtitle="Your newer version — the code or project after your changes."
              state={afterState}
              onMethodChange={(method) => {
                setAfterState((prev) => ({ ...prev, method }));
                if (method === 'file') afterFileInputRef.current?.click();
                if (method === 'zip') afterZipInputRef.current?.click();
                if (method === 'folder') afterFolderInputRef.current?.click();
              }}
              onPathChange={(p) => setAfterState((prev) => ({ ...prev, path: p }))}
              onContentChange={(text) => handleContentChange('after', text)}
              onUploadFile={() => afterFileInputRef.current?.click()}
              onUploadZip={() => afterZipInputRef.current?.click()}
              onUploadFolder={() => afterFolderInputRef.current?.click()}
              onClear={() => handleClearSide('after')}
              onToggleEdit={() => setAfterState((prev) => ({ ...prev, isEditing: !prev.isEditing }))}
            />
          </div>
        </div>
      )}

      {/* GIT DIFF / PATCH MODE */}
      {comparisonMode === 'git-diff' && (
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0e1117] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Git Diff / Patch Mode
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                Paste or upload a unified Git diff generated from your terminal or pull request.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGitDiffMethod('paste')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  gitDiffMethod === 'paste'
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent shadow-2xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Paste Diff
              </button>
              <button
                type="button"
                onClick={() => {
                  setGitDiffMethod('file');
                  gitDiffFileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  gitDiffMethod === 'file'
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent shadow-2xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Upload .diff File
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
              <span>{gitDiffFileName || 'Unified Diff Format'}</span>
              <span>{gitDiffText ? `${gitDiffText.split(/\r?\n/).length} lines` : 'Empty'}</span>
            </div>
            <textarea
              value={gitDiffText}
              onChange={(e) => {
                setGitDiffText(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={`diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,3 +10,3 @@
-const port = 3000;
+const port = process.env.PORT || 8080;`}
              className="w-full h-80 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] font-mono text-xs text-neutral-900 dark:text-neutral-100 leading-5 focus:outline-none focus:ring-1 focus:ring-neutral-400 overflow-x-auto whitespace-pre scrollbar-thin"
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* SNAPSHOT MODE */}
      {comparisonMode === 'snapshot' && (
        <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0e1117] space-y-4">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              Project Snapshot Analysis
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Statically inspect an entire codebase without a historical baseline to identify APIs, routes, databases, and dependencies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => snapshotZipInputRef.current?.click()}
              className="p-6 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 bg-white dark:bg-[#0c0e12] text-left transition-colors cursor-pointer group"
            >
              <Archive className="h-6 w-6 text-neutral-700 dark:text-neutral-300 mb-2 group-hover:scale-105 transition-transform" />
              <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Upload Project ZIP</div>
              <p className="text-xs text-neutral-500 mt-1">Upload a compressed project archive to extract safely in browser memory.</p>
            </button>

            <button
              type="button"
              onClick={() => snapshotFolderInputRef.current?.click()}
              className="p-6 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 bg-white dark:bg-[#0c0e12] text-left transition-colors cursor-pointer group"
            >
              <FolderOpen className="h-6 w-6 text-neutral-700 dark:text-neutral-300 mb-2 group-hover:scale-105 transition-transform" />
              <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Select Project Folder</div>
              <p className="text-xs text-neutral-500 mt-1">Pick a local folder from your hard drive without uploading code to any server.</p>
            </button>
          </div>

          {snapshotCount > 0 && (
            <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-medium text-emerald-900 dark:text-emerald-200">
                  {snapshotName} — {snapshotCount} files loaded and ready for audit
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSnapshotFiles(null);
                  setSnapshotCount(0);
                  setSnapshotName('');
                }}
                className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error / Validation Feedback Banner */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Action Zone */}
      <div className="mt-8 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs">
          {validation.canAnalyze ? (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{validation.message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <span className="h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span>{validation.message}</span>
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={!validation.canAnalyze || isAnalyzing}
            onClick={handleExecuteAnalysis}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-lg transition-all shadow-sm ${
              validation.canAnalyze && !isAnalyzing
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer shadow-md'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing changes…</span>
              </>
            ) : (
              <>
                <span>Analyze Impact</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   SIDE INPUT PANEL (BEFORE OR AFTER)
   ========================================================================== */

interface SideInputPanelProps {
  side: 'before' | 'after';
  title: string;
  badge: string;
  subtitle: string;
  state: FileState;
  onMethodChange: (method: ImportMethod) => void;
  onPathChange: (path: string) => void;
  onContentChange: (content: string) => void;
  onUploadFile: () => void;
  onUploadZip: () => void;
  onUploadFolder: () => void;
  onClear: () => void;
  onToggleEdit: () => void;
}

const SideInputPanel: React.FC<SideInputPanelProps> = ({
  side,
  title,
  badge,
  subtitle,
  state,
  onMethodChange,
  onPathChange,
  onContentChange,
  onUploadFile,
  onUploadZip,
  onUploadFolder,
  onClear,
  onToggleEdit,
}) => {
  const isBefore = side === 'before';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Sync scroll between line numbers gutter and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const lines = useMemo(() => {
    const count = state.content ? state.content.split(/\r?\n/).length : 1;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  }, [state.content]);

  const detectedLanguage = detectLanguageFromPath(state.path);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onContentChange(text);
      }
    } catch {
      // Fallback: focus textarea
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0e1117] overflow-hidden shadow-xs">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#12151c]/80 backdrop-blur-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isBefore ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'
            }`}
          />
          <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white uppercase">
            {title}
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
            {badge}
          </span>
        </div>

        {/* Quick status badge if populated */}
        {state.isReady && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready</span>
            <span>·</span>
            <span>{state.fileCount ? `${state.fileCount} files` : `${state.lineCount} lines`}</span>
          </div>
        )}
      </div>

      {/* Explanatory microcopy */}
      <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/40 dark:bg-[#10131a] text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
        <span>{subtitle}</span>
        {state.isReady && (
          <div className="flex items-center gap-2 shrink-0">
            {state.content && (
              <button
                type="button"
                onClick={onToggleEdit}
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer"
              >
                {state.isEditing ? 'Collapse' : 'Edit'}
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Method Selector Tabs */}
      <div className="px-3 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => onMethodChange('paste')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            state.method === 'paste'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          <span>Paste Code</span>
        </button>

        <button
          type="button"
          onClick={() => onMethodChange('file')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            state.method === 'file'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => onMethodChange('zip')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            state.method === 'zip'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          <span>Project ZIP</span>
        </button>

        <button
          type="button"
          onClick={() => onMethodChange('folder')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            state.method === 'folder'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Folder</span>
        </button>
      </div>

      {/* Main Panel Body */}
      <div className="flex-1 flex flex-col p-3">
        {/* CASE 1: PASTE CODE or VIEWING/EDITING LOADED FILE */}
        {(state.method === 'paste' || (state.method === 'file' && state.isEditing)) && (
          <div className="flex-1 flex flex-col space-y-2">
            {/* File Path & Language Bar */}
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12151b] text-xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileCode className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span className="text-neutral-400 font-mono text-[11px] shrink-0">Path:</span>
                <input
                  type="text"
                  value={state.path}
                  onChange={(e) => onPathChange(e.target.value)}
                  placeholder="e.g. src/auth.ts"
                  className="bg-transparent font-mono text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none min-w-0 flex-1 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-neutral-500">
                <span className="px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                  {detectedLanguage}
                </span>
                <span>·</span>
                <span>{state.lineCount} lines</span>
              </div>
            </div>

            {/* Editor Canvas with Synced Line Numbers */}
            <div className="flex-1 min-h-[260px] sm:min-h-[300px] flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#090b0f] overflow-hidden focus-within:ring-1 focus-within:ring-neutral-400">
              {/* Line Numbers Gutter */}
              <div
                ref={gutterRef}
                className="select-none py-2 px-2.5 bg-neutral-50 dark:bg-[#0c0e13] border-r border-neutral-200 dark:border-neutral-800 text-[11px] font-mono text-neutral-400 text-right overflow-hidden space-y-0 leading-5"
                style={{ minWidth: '2.5rem' }}
                aria-hidden="true"
              >
                {lines.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={state.content}
                onChange={(e) => onContentChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={
                  isBefore
                    ? '// Paste your previous code here (older version)...'
                    : '// Paste your updated code here (newer version)...'
                }
                className="flex-1 p-2 bg-transparent text-xs font-mono text-neutral-900 dark:text-neutral-100 leading-5 focus:outline-none resize-none overflow-x-auto whitespace-pre scrollbar-thin"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
              />
            </div>

            {/* Toolbar under editor */}
            <div className="flex items-center justify-between text-xs pt-1 text-neutral-500">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer text-[11px]"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Paste clipboard</span>
                </button>
                {state.content && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-[11px]"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] font-mono">
                {state.byteSize > 0 && formatBytes(state.byteSize)}
              </div>
            </div>
          </div>
        )}

        {/* CASE 2: UPLOAD FILE DROPZONE (when not editing) */}
        {state.method === 'file' && !state.isEditing && (
          <div className="flex-1 flex flex-col justify-center">
            {state.isReady ? (
              /* Summary Card */
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12151b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <div className="font-semibold text-xs font-mono text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                        {state.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {state.lineCount} lines · {formatBytes(state.byteSize)}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                    Ready
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={onToggleEdit}
                    className="flex-1 py-1.5 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>View / Edit Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={onUploadFile}
                    className="py-1.5 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="py-1.5 px-2.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone */
              <div
                onClick={onUploadFile}
                className="p-8 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 bg-neutral-50/50 dark:bg-[#0c0e12] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
              >
                <Upload className="h-8 w-8 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white mb-2 transition-colors" />
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Select a single source file
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  Supports .ts, .js, .json, .sql, .py, .md and any text code file under 2MB.
                </p>
                <span className="mt-3 px-3 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold">
                  Browse file
                </span>
              </div>
            )}
          </div>
        )}

        {/* CASE 3: UPLOAD ZIP */}
        {state.method === 'zip' && (
          <div className="flex-1 flex flex-col justify-center">
            {state.isReady && state.filesMap ? (
              /* ZIP Summary Card */
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12151b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <div className="font-semibold text-xs font-mono text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                        {state.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {state.fileCount} files · {formatBytes(state.byteSize)}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                    Extracted
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={onUploadZip}
                    className="flex-1 py-1.5 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Replace ZIP
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="py-1.5 px-2.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* ZIP Dropzone */
              <div
                onClick={onUploadZip}
                className="p-8 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 bg-neutral-50/50 dark:bg-[#0c0e12] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
              >
                <Archive className="h-8 w-8 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white mb-2 transition-colors" />
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Upload project .zip archive
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  Extracted entirely inside browser memory with Zip-Slip path sanitization.
                </p>
                <span className="mt-3 px-3 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold">
                  Select ZIP file
                </span>
              </div>
            )}
          </div>
        )}

        {/* CASE 4: FOLDER PICKER */}
        {state.method === 'folder' && (
          <div className="flex-1 flex flex-col justify-center">
            {state.isReady && state.filesMap ? (
              /* Folder Summary Card */
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12151b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                    <div>
                      <div className="font-semibold text-xs font-mono text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                        {state.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {state.fileCount} files · {formatBytes(state.byteSize)}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                    Loaded
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={onUploadFolder}
                    className="flex-1 py-1.5 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Change Folder
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="py-1.5 px-2.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Folder Dropzone */
              <div
                onClick={onUploadFolder}
                className="p-8 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 bg-neutral-50/50 dark:bg-[#0c0e12] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
              >
                <FolderOpen className="h-8 w-8 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white mb-2 transition-colors" />
                <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Select local project directory
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  ImpactCheck reads files locally. Source code is never uploaded to any server.
                </p>
                <span className="mt-3 px-3 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold">
                  Choose directory
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
