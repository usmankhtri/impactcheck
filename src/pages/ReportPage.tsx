import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Copy,
  Check,
  ArrowLeft,
  Server,
  Database,
  Lock,
  TestTube2,
  Layers,
  Network,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { FindingCard } from '../components/design-system/FindingCard';
import { EmptyState } from '../components/design-system/EmptyState';
import { useToast } from '../components/design-system/ToastContext';
import { getHistory } from '../services/historyService';
import { parseGitDiff } from '../parser/diffParser';
import { runAnalysis } from '../rules';
import { generateChecklistFromFindings } from '../services/checklistGenerator';
import {
  buildReportObject,
  generateMarkdownReport,
  generatePlainTextReport,
  downloadFile,
} from '../services/reportExporter';
import { EXAMPLES } from '../examples';
import { DiffGuardReport } from '../types/report';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [report, setReport] = useState<DiffGuardReport | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'findings' | 'files' | 'dependencies' | 'checklist'>('all');

  useEffect(() => {
    // Attempt to load from history first, or load the latest example
    const history = getHistory();
    let diffText = EXAMPLES[0].diff;
    let projName = EXAMPLES[0].name;

    if (history.length > 0 && history[0].diffText) {
      diffText = history[0].diffText;
      projName = history[0].name;
    }

    try {
      const parsed = parseGitDiff(diffText);
      const analysis = runAnalysis(parsed);
      const checklist = generateChecklistFromFindings(analysis.findings);
      const built = buildReportObject(parsed, analysis.findings, analysis.summary, analysis.dependencies, checklist);
      setReport(built);
    } catch (err) {
      console.error('Failed to construct report', err);
    }
  }, []);

  const handleCopyMarkdown = () => {
    if (!report) return;
    const md = generateMarkdownReport(report);
    navigator.clipboard.writeText(md);
    success('Markdown report copied to clipboard');
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const md = generateMarkdownReport(report);
    downloadFile(md, 'diffguard-impact-report.md', 'text/markdown');
    success('Report downloaded as Markdown');
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    downloadFile(jsonStr, 'diffguard-report.json', 'application/json');
    success('Report downloaded as JSON');
  };

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={FileText}
            title="No report data available"
            description="Run an analysis first or open a sample project to view its impact report."
            action={{
              label: 'Go to Analyzer',
              onClick: () => navigate('/app'),
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  const { summary, files, findings, dependencies, checklist } = report;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="space-y-1">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 mb-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Workbench</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Code Review Impact Report
            </h1>
            <p className="text-xs text-neutral-500 font-mono">
              Generated on {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors shadow-2xs cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Markdown</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export .md</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
              title="Export Raw JSON"
            >
              <span className="font-mono text-[10px]">JSON</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              Files Changed
            </span>
            <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {summary.totalFilesChanged}
            </div>
            <div className="text-[11px] font-mono mt-0.5">
              <span className="text-emerald-600 font-medium">+{summary.totalAdditions}</span>{' '}
              <span className="text-rose-600 font-medium">-{summary.totalDeletions}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              Unique Findings
            </span>
            <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {summary.findingsCount}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              {summary.signalsCount} underlying signals
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              High Severity
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {summary.breakdown.byPriority.HIGH}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              {summary.breakdown.byPriority.MEDIUM} medium · {summary.breakdown.byPriority.REVIEW} review
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              Checklist
            </span>
            <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {summary.checklistProgress.percentage}%
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              {summary.checklistProgress.completed}/{summary.checklistProgress.total} items verified
            </div>
          </div>
        </section>

        {/* Changed Files Table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Changed Files ({files.length})
          </h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-[11px] text-neutral-500">
                  <th className="py-2.5 px-4 font-semibold">File Path</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Additions</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Deletions</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-mono text-[11px]">
                {files.map((f) => (
                  <tr key={f.path} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/40">
                    <td className="py-2.5 px-4 text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                      {f.path}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-sans font-semibold">
                      {f.status}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      +{f.additions}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">
                      -{f.deletions}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {f.findingsCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[10px]">
                          {f.findingsCount}
                        </span>
                      ) : (
                        <span className="text-neutral-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Review Findings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
              Detailed Findings & Evidence ({findings.length})
            </h2>
            <span className="text-xs text-neutral-500 font-mono">
              Ordered by priority & impact
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400 rounded-xl border border-neutral-200 dark:border-neutral-800">
              No specific risk patterns or boundary alterations detected.
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  showActions={false}
                  defaultExpanded={true}
                />
              ))}
            </div>
          )}
        </section>

        {/* Dependency Changes */}
        {dependencies.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
              Dependency Modifications ({dependencies.length})
            </h2>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-[11px] text-neutral-500">
                    <th className="py-2.5 px-4 font-semibold">Package</th>
                    <th className="py-2.5 px-4 font-semibold">Ecosystem</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                    <th className="py-2.5 px-4 font-semibold">Old Version</th>
                    <th className="py-2.5 px-4 font-semibold">New Version</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Major Bump?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-mono text-[11px]">
                  {dependencies.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/40">
                      <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {d.name}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 uppercase text-[10px]">
                        {d.ecosystem}
                      </td>
                      <td className="py-2.5 px-4 capitalize font-sans">{d.changeType}</td>
                      <td className="py-2.5 px-4 text-neutral-500">{d.oldVersion || '—'}</td>
                      <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {d.newVersion || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {d.isMajorBump ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                            YES
                          </span>
                        ) : (
                          <span className="text-neutral-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Review Checklist */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Verification Checklist ({checklist.length})
          </h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 divide-y divide-neutral-100 dark:divide-neutral-850 text-xs shadow-2xs">
            {checklist.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase font-semibold">
                  {item.category}
                </span>
                <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
