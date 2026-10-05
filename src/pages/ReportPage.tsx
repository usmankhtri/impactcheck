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
import { ImpactCheckReport } from '../types/report';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [report, setReport] = useState<ImpactCheckReport | null>(null);
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
    downloadFile(md, 'impactcheck-impact-report.md', 'text/markdown');
    success('Report downloaded as Markdown');
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    downloadFile(jsonStr, 'impactcheck-report.json', 'application/json');
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

  const { summary, files, findings, dependencies, checklist, projectOverview } = report;
  const isSnapshot =
    report.analysisMode === 'snapshot' ||
    (summary.totalAdditions === 0 && summary.totalDeletions === 0 && files.every((f) => f.status === 'detected'));

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
              {isSnapshot ? 'Project Snapshot Impact Report' : 'Code Review Impact Report'}
            </h1>
            <p className="text-xs text-neutral-500 font-mono">
              Generated on {new Date(report.generatedAt).toLocaleString()} · {isSnapshot ? 'Standalone Snapshot Baseline' : 'Changeset Comparison'}
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors shadow-2xs cursor-pointer"
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
              {isSnapshot ? 'Files Analyzed' : 'Files Changed'}
            </span>
            <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {summary.totalFilesChanged}
            </div>
            <div className="text-[11px] font-mono mt-0.5">
              {isSnapshot ? (
                <span className="text-neutral-500">
                  {(projectOverview?.totalLinesAnalyzed || files.reduce((s, f) => s + (f.additions + f.deletions || 0), 0)).toLocaleString()} lines analyzed
                </span>
              ) : (
                <>
                  <span className="text-emerald-600 font-medium">+{summary.totalAdditions}</span>{' '}
                  <span className="text-rose-600 font-medium">-{summary.totalDeletions}</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">
              {isSnapshot ? 'Actionable Findings' : 'Review Findings'}
            </span>
            <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {summary.findingsCount}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
              {summary.breakdown.byPriority.HIGH} high · {summary.breakdown.byPriority.MEDIUM} med
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

        {/* Snapshot Mode: Project Understanding Architecture Section */}
        {isSnapshot && projectOverview && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
                Project Areas Detected ({summary.totalFilesChanged} files analyzed)
              </h2>
              <span className="text-[10px] text-neutral-400 font-mono">
                Project understanding baseline
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <Layers className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.dependenciesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Dependencies
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.dependenciesCount === 1 ? '1 package detected' : `${projectOverview.dependenciesCount} packages detected`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <Server className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.apiRoutesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  API Routes
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.apiRoutesCount === 1 ? '1 route detected' : `${projectOverview.apiRoutesCount} routes detected`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <FileText className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.envVarsCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Environment Vars
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.envVarsCount === 1 ? '1 variable detected' : `${projectOverview.envVarsCount} variables detected`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <Lock className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.authModulesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Auth & Security
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.authModulesCount === 1 ? '1 module detected' : `${projectOverview.authModulesCount} modules detected`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <Database className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.databaseMigrationsCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Database Migrations
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.databaseMigrationsCount === 1 ? '1 migration' : `${projectOverview.databaseMigrationsCount} migrations detected`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <Layers className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.frontendFilesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Frontend Area
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.frontendFilesCount === 1 ? '1 frontend file' : `${projectOverview.frontendFilesCount} frontend files`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <TestTube2 className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.testFilesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Test Area
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.testFilesCount === 1 ? '1 test area' : `${projectOverview.testFilesCount} test areas`}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <FileText className="h-4 w-4" />
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {projectOverview.configFilesCount}
                  </span>
                </div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                  Configuration
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {projectOverview.configFilesCount === 1 ? '1 config file' : `${projectOverview.configFilesCount} config files`}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Changed Files Table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            {isSnapshot ? `Analyzed Files (${files.length})` : `Changed Files (${files.length})`}
          </h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-[11px] text-neutral-500">
                  <th className="py-2.5 px-4 font-semibold">File Path</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  {isSnapshot ? (
                    <th className="py-2.5 px-4 font-semibold text-right">Lines Analyzed</th>
                  ) : (
                    <>
                      <th className="py-2.5 px-4 font-semibold text-right">Additions</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Deletions</th>
                    </>
                  )}
                  <th className="py-2.5 px-4 font-semibold text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono text-[11px]">
                {files.map((f) => (
                  <tr key={f.path} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-4 text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                      {f.path}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-sans font-semibold">
                      {f.status}
                    </td>
                    {isSnapshot ? (
                      <td className="py-2.5 px-4 text-right text-neutral-600 dark:text-neutral-400">
                        {f.additions || 0}
                      </td>
                    ) : (
                      <>
                        <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                          +{f.additions}
                        </td>
                        <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">
                          -{f.deletions}
                        </td>
                      </>
                    )}
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

        {/* Dependency Modifications / Overview */}
        {dependencies.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
              {isSnapshot ? `Dependency Overview (${dependencies.length})` : `Dependency Modifications (${dependencies.length})`}
            </h2>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-[11px] text-neutral-500">
                    <th className="py-2.5 px-4 font-semibold">Package</th>
                    <th className="py-2.5 px-4 font-semibold">Ecosystem</th>
                    {isSnapshot ? (
                      <th className="py-2.5 px-4 font-semibold">Detected Version</th>
                    ) : (
                      <>
                        <th className="py-2.5 px-4 font-semibold">Action</th>
                        <th className="py-2.5 px-4 font-semibold">Old Version</th>
                        <th className="py-2.5 px-4 font-semibold">New Version</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Major Bump?</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono text-[11px]">
                  {dependencies.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {d.name}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 uppercase text-[10px]">
                        {d.ecosystem}
                      </td>
                      {isSnapshot ? (
                        <td className="py-2.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                          {d.newVersion || d.oldVersion || '—'}
                        </td>
                      ) : (
                        <>
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
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Snapshot API/Route Overview */}
        {isSnapshot && projectOverview?.detectedRoutes && projectOverview.detectedRoutes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
              API / Route Overview ({projectOverview.detectedRoutes.length})
            </h2>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-[11px] text-neutral-500">
                    <th className="py-2.5 px-4 font-semibold w-24">Method</th>
                    <th className="py-2.5 px-4 font-semibold">Route Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono text-[11px]">
                  {projectOverview.detectedRoutes.map((routeStr, idx) => {
                    const parts = routeStr.split(' ');
                    const method = parts[0] || 'GET';
                    const routePath = parts.slice(1).join(' ') || '/';
                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                        <td className="py-2.5 px-4 font-bold text-neutral-900 dark:text-neutral-100">
                          <span
                            className={
                              method === 'DELETE'
                                ? 'text-rose-600 dark:text-rose-400'
                                : method === 'POST'
                                ? 'text-amber-600 dark:text-amber-400'
                                : method === 'PUT' || method === 'PATCH'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {method}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-neutral-800 dark:text-neutral-200">
                          {routePath}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Review Checklist */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            {isSnapshot ? `Review Checklist (${checklist.length})` : `Verification Checklist (${checklist.length})`}
          </h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs shadow-2xs">
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

        {/* Limitations */}
        {report.disclaimers && report.disclaimers.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
              Limitations
            </h2>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 text-xs shadow-2xs space-y-2 text-neutral-500">
              {report.disclaimers.map((disc, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-neutral-400 select-none">•</span>
                  <span>{disc}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};
