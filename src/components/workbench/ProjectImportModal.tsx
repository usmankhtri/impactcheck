import React, { useState, useRef, useEffect } from 'react';
import {
  Archive,
  FolderOpen,
  GitCompare,
  FileCode,
  ClipboardPaste,
  Upload,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Filter,
  Layers,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import { extractZipArchive } from '../../utils/zipParser';
import { compareFileMaps, createSnapshotProject } from '../../utils/diffGenerator';
import { detectProjectMetadata, DetectedProjectMetadata, DEFAULT_EXCLUSION_PATTERNS } from '../../utils/projectDetector';
import { parseGitDiff } from '../../parser/diffParser';
import { ParsedDiff } from '../../types/diff';
import { EXAMPLES, DiffExample } from '../../examples';

export type ImportMode = 'zip' | 'folder' | 'compare' | 'diff_file' | 'paste' | 'examples';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteAnalysis: (parsedDiff: ParsedDiff, rawDiffText?: string, projectName?: string) => void;
}

export const ProjectImportModal: React.FC<ProjectImportModalProps> = ({
  isOpen,
  onClose,
  onCompleteAnalysis,
}) => {
  const [activeMode, setActiveMode] = useState<ImportMode>('zip');
  const [step, setStep] = useState<'select' | 'detected'>('select');

  // Loaded state
  const [pastedDiff, setPastedDiff] = useState('');
  const [detectedProject, setDetectedProject] = useState<DetectedProjectMetadata | null>(null);
  const [pendingParsedDiff, setPendingParsedDiff] = useState<ParsedDiff | null>(null);
  const [pendingRawDiff, setPendingRawDiff] = useState<string>('');

  // Exclusions
  const [excludeNoise, setExcludeNoise] = useState(true);
  const [customExclusions, setCustomExclusions] = useState<string[]>(DEFAULT_EXCLUSION_PATTERNS);
  const [showExclusionConfig, setShowExclusionConfig] = useState(false);

  // Folder Compare State
  const [beforeFiles, setBeforeFiles] = useState<Map<string, string> | null>(null);
  const [afterFiles, setAfterFiles] = useState<Map<string, string> | null>(null);
  const [beforeName, setBeforeName] = useState<string>('');
  const [afterName, setAfterName] = useState<string>('');

  // Status
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // File Inputs
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const diffFileInputRef = useRef<HTMLInputElement>(null);
  const beforeFolderInputRef = useRef<HTMLInputElement>(null);
  const afterFolderInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('select');
    setDetectedProject(null);
    setPendingParsedDiff(null);
    setPendingRawDiff('');
    setStatusMessage(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setBeforeFiles(null);
    setAfterFiles(null);
    setBeforeName('');
    setAfterName('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Keyboard Escape and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ZIP Handler
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Reading and extracting ZIP archive safely in browser...');

    try {
      const extracted = await extractZipArchive(file, (pct, cur) => {
        setStatusMessage(`Extracting files (${pct}%)...`);
      });

      if (extracted.files.size === 0) {
        throw new Error('No readable text source files found in this ZIP archive.');
      }

      // Check if this zip has a git patch or diff inside, or if it's a project
      const filePaths = Array.from(extracted.files.keys());
      const metadata = detectProjectMetadata(filePaths, extracted.files, extracted.name);
      setDetectedProject(metadata);

      // Create a comparison baseline: compare against empty or internal files
      // If project has git diff file inside, use that; otherwise generate structure diff
      const patchFile = filePaths.find((p) => p.endsWith('.patch') || p.endsWith('.diff'));
      let parsed: ParsedDiff;
      let rawDiff = '';

      if (patchFile) {
        rawDiff = extracted.files.get(patchFile)!;
        parsed = parseGitDiff(rawDiff);
        parsed.analysisMode = 'git-diff';
      } else {
        // Create canonical standalone project snapshot
        const effectiveExclusions = excludeNoise ? customExclusions : [];
        parsed = createSnapshotProject(extracted.files, effectiveExclusions, extracted.warnings);
      }

      setPendingParsedDiff(parsed);
      setPendingRawDiff(rawDiff);
      setStep('detected');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to extract ZIP archive.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // Folder Upload Handler (webkitdirectory)
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Reading ${fileList.length} files from folder...`);

    try {
      const filesMap = new Map<string, string>();
      const filePaths: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const relPath = file.webkitRelativePath || file.name;
        filePaths.push(relPath);

        // Only read text files < 1.5MB
        if (file.size <= 1500000 && !/\.(png|jpg|jpeg|gif|ico|pdf|zip|gz|exe|dll|dylib)$/i.test(file.name)) {
          const text = await file.text();
          filesMap.set(relPath, text);
        }
      }

      const folderName = fileList[0]?.webkitRelativePath?.split('/')[0] || 'Local Folder';
      const metadata = detectProjectMetadata(filePaths, filesMap, folderName);
      setDetectedProject(metadata);

      const effectiveExclusions = excludeNoise ? customExclusions : [];
      const parsed = createSnapshotProject(filesMap, effectiveExclusions);

      setPendingParsedDiff(parsed);
      setPendingRawDiff('');
      setStep('detected');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load project folder.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // Compare Two Folders Handler
  const handleBeforeFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const map = new Map<string, string>();
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const relPath = f.webkitRelativePath.split('/').slice(1).join('/'); // strip root
      if (f.size <= 1500000) {
        map.set(relPath || f.name, await f.text());
      }
    }
    setBeforeFiles(map);
    setBeforeName(list[0]?.webkitRelativePath.split('/')[0] || 'Before');
  };

  const handleAfterFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const map = new Map<string, string>();
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const relPath = f.webkitRelativePath.split('/').slice(1).join('/');
      if (f.size <= 1500000) {
        map.set(relPath || f.name, await f.text());
      }
    }
    setAfterFiles(map);
    setAfterName(list[0]?.webkitRelativePath.split('/')[0] || 'After');
  };

  const executeCompare = () => {
    if (!beforeFiles || !afterFiles) {
      setErrorMessage('Please provide both the Before and After project folders.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Recursively comparing directory trees and calculating line changes...');

    try {
      const effectiveExclusions = excludeNoise ? customExclusions : [];
      const parsed = compareFileMaps(beforeFiles, afterFiles, effectiveExclusions);
      parsed.analysisMode = 'comparison';

      const metadata = detectProjectMetadata(
        Array.from(afterFiles.keys()),
        afterFiles,
        `${beforeName} → ${afterName}`
      );

      setDetectedProject(metadata);
      setPendingParsedDiff(parsed);
      setStep('detected');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to compare directories.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // Diff / Patch File Handler
  const handleDiffFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseGitDiff(text);
      parsed.analysisMode = 'git-diff';
      const metadata = detectProjectMetadata(parsed.files.map((f) => f.newPath), undefined, file.name);
      setDetectedProject(metadata);
      setPendingParsedDiff(parsed);
      setPendingRawDiff(text);
      setStep('detected');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid Git diff format.');
    }
  };

  // Paste Handler
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedDiff.trim()) {
      setErrorMessage('Please paste a Git diff first.');
      return;
    }
    try {
      const parsed = parseGitDiff(pastedDiff);
      parsed.analysisMode = 'pasted-diff';
      const metadata = detectProjectMetadata(parsed.files.map((f) => f.newPath), undefined, 'Pasted Diff');
      setDetectedProject(metadata);
      setPendingParsedDiff(parsed);
      setPendingRawDiff(pastedDiff);
      setStep('detected');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse pasted Git diff.');
    }
  };

  // Trigger Complete Analysis
  const handleFinalizeAnalysis = () => {
    if (pendingParsedDiff) {
      onCompleteAnalysis(pendingParsedDiff, pendingRawDiff, detectedProject?.name);
      handleClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Add Your Project or Changes</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Analyze project archives, folders, directory comparisons, or standard Git diffs.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Mode Selection & Input */}
        {step === 'select' && (
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="flex items-center gap-2.5 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 text-xs text-neutral-700 dark:text-neutral-300">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveMode('zip')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  activeMode === 'zip'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <Archive className="h-4 w-4 text-neutral-700 dark:text-neutral-300 mb-1.5" />
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Project ZIP</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Upload archive</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('folder')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  activeMode === 'folder'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <FolderOpen className="h-4 w-4 text-neutral-700 dark:text-neutral-300 mb-1.5" />
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Project Folder</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Select local folder</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('compare')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  activeMode === 'compare'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <GitCompare className="h-4 w-4 text-neutral-700 dark:text-neutral-300 mb-1.5" />
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Compare Folders</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Before vs After</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('diff_file')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  activeMode === 'diff_file'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <FileCode className="h-4 w-4 text-neutral-700 dark:text-neutral-300 mb-1.5" />
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Diff / Patch</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Upload .diff file</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('paste')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  activeMode === 'paste'
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 font-medium'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <ClipboardPaste className="h-4 w-4 text-neutral-700 dark:text-neutral-300 mb-1.5" />
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Paste Diff</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Paste raw text</div>
              </button>
            </div>

            {/* Mode-Specific Input UI */}
            {activeMode === 'zip' && (
              <div
                onClick={() => zipInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-10 text-center hover:border-neutral-500 dark:hover:border-neutral-500 cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/30 transition-colors"
              >
                <Archive className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Drop files or a folder here
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  or choose from your computer (.zip archive)
                </div>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                />
              </div>
            )}

            {activeMode === 'folder' && (
              <div
                onClick={() => folderInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-10 text-center hover:border-neutral-500 dark:hover:border-neutral-500 cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/30 transition-colors"
              >
                <FolderOpen className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Drop files or a folder here
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  or choose from your computer (local project directory)
                </div>
                <input
                  ref={folderInputRef}
                  type="file"
                  /* @ts-ignore */
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                />
              </div>
            )}

            {activeMode === 'compare' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Folder */}
                  <div
                    onClick={() => beforeFolderInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      beforeFiles
                        ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 bg-neutral-50/40 dark:bg-neutral-900/20'
                    }`}
                  >
                    <FolderOpen className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      1. Before (Base / Original)
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      {beforeFiles ? `${beforeFiles.size} files loaded` : 'Click to select folder'}
                    </div>
                    <input
                      ref={beforeFolderInputRef}
                      type="file"
                      /* @ts-ignore */
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleBeforeFolder}
                      className="hidden"
                    />
                  </div>

                  {/* After Folder */}
                  <div
                    onClick={() => afterFolderInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      afterFiles
                        ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 bg-neutral-50/40 dark:bg-neutral-900/20'
                    }`}
                  >
                    <FolderOpen className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      2. After (Modified / Head)
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1">
                      {afterFiles ? `${afterFiles.size} files loaded` : 'Click to select folder'}
                    </div>
                    <input
                      ref={afterFolderInputRef}
                      type="file"
                      /* @ts-ignore */
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleAfterFolder}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={executeCompare}
                    disabled={!beforeFiles || !afterFiles || isProcessing}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                  >
                    <GitCompare className="h-4 w-4" />
                    <span>Compare Both Folders & Analyze</span>
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'diff_file' && (
              <div
                onClick={() => diffFileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-10 text-center hover:border-neutral-500 dark:hover:border-neutral-500 cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/30 transition-colors"
              >
                <FileCode className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Select a .diff or .patch file
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  Works with git diff output, pull request patches, and commit files.
                </div>
                <input
                  ref={diffFileInputRef}
                  type="file"
                  accept=".diff,.patch,.txt"
                  onChange={handleDiffFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {activeMode === 'paste' && (
              <form onSubmit={handlePasteSubmit} className="space-y-3">
                <textarea
                  rows={9}
                  value={pastedDiff}
                  onChange={(e) => setPastedDiff(e.target.value)}
                  placeholder="diff --git a/src/api/users.ts b/src/api/users.ts&#10;--- a/src/api/users.ts&#10;+++ b/src/api/users.ts&#10;@@ -1,4 +1,4 @@&#10;- router.get('/users', handler);&#10;+ router.post('/users', handler);"
                  className="w-full p-3 font-mono text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0c0e12] text-neutral-900 dark:text-neutral-100 focus:outline-hidden leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!pastedDiff.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Inspect Pasted Diff</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* Test Examples Quick Picker */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Or test an explicit developer scenario:
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXAMPLES.slice(0, 4).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      const parsed = parseGitDiff(ex.diff);
                      const meta = detectProjectMetadata(parsed.files.map((f) => f.newPath), undefined, ex.name);
                      setDetectedProject(meta);
                      setPendingParsedDiff(parsed);
                      setPendingRawDiff(ex.diff);
                      setStep('detected');
                    }}
                    className="text-left p-2 rounded border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{ex.name}</div>
                    <div className="text-[10px] text-neutral-500 truncate mt-0.5">{ex.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Project Detected Pre-Analysis Step */}
        {step === 'detected' && detectedProject && (
          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                    Project Detected
                  </span>
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-white mt-0.5">
                    {detectedProject.name}
                  </h3>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{detectedProject.projectType}</span>
                    {detectedProject.packageManager && (
                      <>
                        <span>·</span>
                        <span>Package manager: {detectedProject.packageManager}</span>
                      </>
                    )}
                    {detectedProject.framework && (
                      <>
                        <span>·</span>
                        <span>Framework: {detectedProject.framework}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {pendingParsedDiff?.totalFiles || detectedProject.totalFiles} files
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    +{pendingParsedDiff?.totalAdditions || 0} / -{pendingParsedDiff?.totalDeletions || 0} lines
                  </div>
                </div>
              </div>

              {/* Language Distribution */}
              {detectedProject.languages.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Detected Languages
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedProject.languages.map((l) => (
                      <span
                        key={l.name}
                        className="text-[11px] font-mono px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                      >
                        {l.name} ({l.percentage}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Noise Filtering Box */}
              {detectedProject.noiseFilesCount > 0 && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Smart Default File Filtering</span>
                    </div>
                    <div className="text-neutral-500 text-[11px]">
                      {detectedProject.noiseFilesCount} files look generated, lockfile-related, or dependencies (e.g. node_modules, dist).
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={excludeNoise}
                      onChange={(e) => setExcludeNoise(e.target.checked)}
                      className="rounded"
                    />
                    <span>Exclude recommended files</span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
              >
                Adjust Files / Reselect
              </button>

              <button
                type="button"
                onClick={handleFinalizeAnalysis}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
              >
                <span>Analyze Changes</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
