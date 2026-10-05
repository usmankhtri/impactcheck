import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, Code2, AlignLeft, Globe } from 'lucide-react';
import { ImpactCheckReport } from '../../types/report';
import {
  generateMarkdownReport,
  generatePlainTextReport,
  generateHtmlReport,
  downloadFile,
} from '../../services/reportExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ImpactCheckReport | null;
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
        downloadFile(currentContent, `impactcheck-report-${timestamp}.md`, 'text/markdown');
        break;
      case 'html':
        downloadFile(currentContent, `impactcheck-report-${timestamp}.html`, 'text/html');
        break;
      case 'json':
        downloadFile(currentContent, `impactcheck-report-${timestamp}.json`, 'application/json');
        break;
      case 'text':
        downloadFile(currentContent, `impactcheck-report-${timestamp}.txt`, 'text/plain');
        break;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className="relative w-full max-w-3xl h-[85vh] max-h-[680px] min-h-[420px] flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* Fixed Header */}
        <div className="shrink-0">
          {/* Top Title & Close Button */}
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 px-4 sm:px-6 py-3.5">
            <div>
              <h2 id="export-dialog-title" className="text-sm sm:text-base font-semibold text-neutral-950 dark:text-white">
                Export report
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Choose a format and export your review report.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Close export dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Format Selector Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-neutral-50/60 dark:bg-[#0e1117] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="font-medium text-neutral-700 dark:text-neutral-300 hidden sm:inline">Format:</span>
              <div className="flex items-center gap-1 p-0.5 bg-neutral-200/70 dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setFormat('markdown')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    format === 'markdown'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('json')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    format === 'json'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('html')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    format === 'html'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('text')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    format === 'text'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-2xs font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                  <span>Plain Text</span>
                </button>
              </div>
            </div>

            <span className="text-[11px] font-mono text-neutral-400 hidden md:inline">
              {format === 'markdown' && '.md document'}
              {format === 'json' && '.json structured'}
              {format === 'html' && '.html standalone'}
              {format === 'text' && '.txt raw'}
            </span>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-neutral-50/30 dark:bg-black/20">
          <pre className="p-4 rounded-lg bg-neutral-50 dark:bg-[#0c0e12] border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words selection:bg-neutral-200 dark:selection:bg-neutral-800">
            {currentContent}
          </pre>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 bg-neutral-50/80 dark:bg-[#0e1117] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
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
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-neutral-950 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
