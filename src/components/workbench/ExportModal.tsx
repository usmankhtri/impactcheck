import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, Code2, AlignLeft, Globe } from 'lucide-react';
import { DiffGuardReport } from '../../types/report';
import {
  generateMarkdownReport,
  generatePlainTextReport,
  generateHtmlReport,
  downloadFile,
} from '../../services/reportExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DiffGuardReport | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, report }) => {
  const [format, setFormat] = useState<'markdown' | 'html' | 'json' | 'text'>('markdown');
  const [copied, setCopied] = useState(false);

  // Keyboard Escape and body scroll lock
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const getContent = (): string => {
    switch (format) {
      case 'markdown':
        return generateMarkdownReport(report);
      case 'html':
        return generateHtmlReport(report);
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'text':
        return generatePlainTextReport(report);
    }
  };

  const currentContent = getContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    switch (format) {
      case 'markdown':
        downloadFile(currentContent, `diffguard-report-${timestamp}.md`, 'text/markdown');
        break;
      case 'html':
        downloadFile(currentContent, `diffguard-report-${timestamp}.html`, 'text/html');
        break;
      case 'json':
        downloadFile(currentContent, `diffguard-report-${timestamp}.json`, 'application/json');
        break;
      case 'text':
        downloadFile(currentContent, `diffguard-report-${timestamp}.txt`, 'text/plain');
        break;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3.5 sm:py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Export Diff Impact Report
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Self-contained review report for pull requests, compliance, or architecture records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2.5 border-b border-neutral-100 dark:border-neutral-800/60 overflow-x-auto">
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-medium">
            <button
              onClick={() => setFormat('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                format === 'markdown'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Markdown</span>
            </button>
            <button
              onClick={() => setFormat('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                format === 'html'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                format === 'json'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => setFormat('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
                format === 'text'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <AlignLeft className="h-3.5 w-3.5" />
              <span>Plain Text</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <pre className="p-4 rounded-lg bg-neutral-50 dark:bg-[#0c0e12] border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto leading-relaxed whitespace-pre-wrap selection:bg-neutral-300 dark:selection:bg-neutral-700">
            {currentContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
