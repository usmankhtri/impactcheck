import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, X, Sparkles, FolderOpen, ArrowRight } from 'lucide-react';
import { EXAMPLES, DiffExample } from '../../examples';

interface DiffInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (diffText: string) => void;
  isLoading?: boolean;
}

export const DiffInputModal: React.FC<DiffInputModalProps> = ({
  isOpen,
  onClose,
  onAnalyze,
  isLoading = false,
}) => {
  const [diffText, setDiffText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDiffText(e.target.value);
    if (error) setError(null);
  };

  const handleSelectExample = (ex: DiffExample) => {
    setSelectedExample(ex.id);
    setDiffText(ex.diff);
    if (error) setError(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readFile(e.target.files[0]);
    }
  };

  const readFile = (file: File) => {
    if (!file.name.endsWith('.diff') && !file.name.endsWith('.patch') && !file.name.endsWith('.txt')) {
      setError('Please upload a .diff or .patch file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setDiffText(content);
        setSelectedExample('');
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diffText.trim()) {
      setError('Please paste a diff, upload a file, or select an example.');
      return;
    }
    try {
      onAnalyze(diffText);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse diff.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Provide Git Diff for Analysis
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Paste standard unified git diff, upload a .patch file, or load a verified test example.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Example Selector Bar */}
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0e1014] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-neutral-500" />
                <span>Test Examples (Local & Deterministic)</span>
              </span>
              <span className="text-[11px] text-neutral-500">Click to preview impact</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => handleSelectExample(ex)}
                  className={`text-left p-2 rounded text-xs transition-colors border ${
                    selectedExample === ex.id
                      ? 'border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100'
                      : 'border-neutral-200 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/40 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="truncate font-medium">{ex.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">{ex.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop or Paste */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="diff-input" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Git Diff Content
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 underline underline-offset-2"
              >
                <Upload className="h-3 w-3" />
                <span>Upload .diff or .patch</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".diff,.patch,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              className={`relative rounded border transition-colors ${
                dragActive
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/60'
                  : 'border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0c0e12]'
              }`}
            >
              <textarea
                id="diff-input"
                rows={12}
                value={diffText}
                onChange={handleTextChange}
                placeholder="diff --git a/src/api/users.ts b/src/api/users.ts&#10;index 1a2b3c..4d5e6f 100644&#10;--- a/src/api/users.ts&#10;+++ b/src/api/users.ts&#10;@@ -10,3 +10,4 @@&#10;- router.get('/users', handler);&#10;+ router.post('/users', handler);"
                className="w-full resize-none p-3.5 font-mono text-xs text-neutral-900 dark:text-neutral-100 bg-transparent focus:outline-hidden placeholder:text-neutral-400 dark:placeholder:text-neutral-600 leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-500">
              Analysis runs locally in browser. No diff text is transmitted to remote servers.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !diffText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Analyzing...' : 'Analyze Diff'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
