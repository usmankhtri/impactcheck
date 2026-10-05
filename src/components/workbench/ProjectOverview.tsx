import React from 'react';
import {
  FileText,
  Plus,
  Minus,
  AlertTriangle,
  Server,
  Database,
  Lock,
  TestTube2,
  Layers,
  Code,
  Sliders,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { ParsedDiff } from '../../types/diff';
import { FindingsSummary, Finding } from '../../types/finding';
import { DependencyChange } from '../../types/dependency';
import { extractProjectOverview } from '../../utils/projectOverview';

interface ProjectOverviewProps {
  parsedDiff: ParsedDiff;
  summary: FindingsSummary;
  findings: Finding[];
  dependencies: DependencyChange[];
  projectName?: string;
  onSelectCategory?: (category: string) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  parsedDiff,
  summary,
  findings,
  dependencies,
  projectName = 'Current Changeset',
  onSelectCategory,
}) => {
  const isSnapshot =
    parsedDiff.analysisMode === 'snapshot' ||
    parsedDiff.mode === 'snapshot' ||
    parsedDiff.hasBaseline === false;

  const overview = extractProjectOverview(parsedDiff.files, dependencies);

  const addedFiles = parsedDiff.files.filter((f) => f.status === 'added').length;
  const deletedFiles = parsedDiff.files.filter((f) => f.status === 'deleted').length;
  const renamedFiles = parsedDiff.files.filter((f) => f.status === 'renamed').length;
  const modifiedFiles = parsedDiff.files.filter((f) => f.status === 'modified').length;

  // Comparison mode review focus areas
  const areas: Array<{ name: string; count: number; icon: React.ElementType; key: string }> = [
    { name: 'API Routes', count: summary.byCategory.api, icon: Server, key: 'api' },
    { name: 'Authentication', count: summary.byCategory.authentication, icon: Lock, key: 'authentication' },
    { name: 'Database', count: summary.byCategory.database, icon: Database, key: 'database' },
    { name: 'Dependencies', count: summary.byCategory.dependencies, icon: Layers, key: 'dependencies' },
    { name: 'Tests', count: summary.byCategory.tests, icon: TestTube2, key: 'tests' },
  ];

  // Snapshot mode project understanding characteristics
  const snapshotAreas: Array<{
    name: string;
    detail: string;
    count: number;
    icon: React.ElementType;
    key?: string;
  }> = [
    {
      name: 'Dependencies',
      detail: overview.dependenciesCount === 1 ? '1 package detected' : `${overview.dependenciesCount} packages detected`,
      count: overview.dependenciesCount,
      icon: Layers,
      key: 'dependencies',
    },
    {
      name: 'API Routes',
      detail: overview.apiRoutesCount === 1 ? '1 route detected' : `${overview.apiRoutesCount} routes detected`,
      count: overview.apiRoutesCount,
      icon: Server,
      key: 'api',
    },
    {
      name: 'Environment Variables',
      detail: overview.envVarsCount === 1 ? '1 variable detected' : `${overview.envVarsCount} variables detected`,
      count: overview.envVarsCount,
      icon: Sliders,
      key: 'configuration',
    },
    {
      name: 'Auth / Security Modules',
      detail: overview.authModulesCount === 1 ? '1 module detected' : `${overview.authModulesCount} modules detected`,
      count: overview.authModulesCount,
      icon: Lock,
      key: 'authentication',
    },
    {
      name: 'Database / Migrations',
      detail: overview.databaseMigrationsCount === 1 ? '1 migration detected' : `${overview.databaseMigrationsCount} migrations detected`,
      count: overview.databaseMigrationsCount,
      icon: Database,
      key: 'database',
    },
    {
      name: 'Frontend Area',
      detail: overview.frontendFilesCount === 1 ? '1 area detected' : `${overview.frontendFilesCount} areas detected`,
      count: overview.frontendFilesCount,
      icon: Code,
      key: 'frontend',
    },
    {
      name: 'Test Area',
      detail: overview.testFilesCount === 1 ? '1 test area' : `${overview.testFilesCount} test areas`,
      count: overview.testFilesCount,
      icon: TestTube2,
      key: 'tests',
    },
    {
      name: 'Configuration Files',
      detail: overview.configFilesCount === 1 ? '1 config file' : `${overview.configFilesCount} config files`,
      count: overview.configFilesCount,
      icon: FileText,
      key: 'configuration',
    },
  ];

  // Concise natural-language summary for comparison mode
  const activeCategories = areas.filter((a) => a.count > 0).map((a) => a.name.toLowerCase());
  const summarySentence = isSnapshot
    ? `${overview.totalFilesAnalyzed} files analyzed across project architecture. High-level structure mapped; only actionable conditions are surfaced as review findings.`
    : activeCategories.length > 0
    ? `${parsedDiff.totalFiles} ${parsedDiff.totalFiles === 1 ? 'file' : 'files'} changed across ${activeCategories.join(', ')}.`
    : `${parsedDiff.totalFiles} ${parsedDiff.totalFiles === 1 ? 'file' : 'files'} changed with no high-impact boundary crossings detected.`;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            {isSnapshot ? 'Project Understanding · Snapshot' : 'Project Overview'}
          </span>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
            {projectName}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {summarySentence}
          </p>
        </div>

        {/* High-level counters */}
        {isSnapshot ? (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <div className="text-neutral-900 dark:text-neutral-100 font-semibold">
                {overview.totalFilesAnalyzed}
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Files</div>
            </div>
            <div className="text-neutral-300 dark:text-neutral-700">·</div>
            <div className="text-right">
              <div className="text-neutral-700 dark:text-neutral-300 font-semibold">
                {overview.totalLinesAnalyzed.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Lines</div>
            </div>
            <div className="text-neutral-300 dark:text-neutral-700">·</div>
            <div className="text-right">
              <div
                className={`font-semibold ${
                  summary.total > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {summary.total}
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Findings</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                +{parsedDiff.totalAdditions}
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Added</div>
            </div>
            <div className="text-neutral-300 dark:text-neutral-700">/</div>
            <div className="text-right">
              <div className="text-rose-600 dark:text-rose-400 font-semibold">
                -{parsedDiff.totalDeletions}
              </div>
              <div className="text-[10px] text-neutral-400 font-sans">Removed</div>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot vs Comparison Body */}
      {isSnapshot ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Project Areas Detected</span>
            <span className="font-normal text-[10px] text-neutral-400">
              Structural characteristics (low-noise baseline)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {snapshotAreas.map((area) => {
              const Icon = area.icon;
              const hasItems = area.count > 0;
              return (
                <div
                  key={area.name}
                  className={`p-2.5 rounded border transition-colors ${
                    hasItems
                      ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#14171d]'
                      : 'border-neutral-100 dark:border-neutral-800/40 opacity-40 bg-neutral-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-3.5 w-3.5 text-neutral-500" />
                    <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {area.count}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 mt-1 truncate">
                    {area.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {area.detail}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actionable Findings Status */}
          {summary.total === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Clean snapshot:</strong> No destructive database statements, unhandled environment fallbacks, or security vulnerabilities identified.
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>{summary.total} actionable {summary.total === 1 ? 'condition' : 'conditions'} detected:</strong> {summary.byPriority.HIGH > 0 ? `${summary.byPriority.HIGH} high priority` : ''}{summary.byPriority.HIGH > 0 && summary.byPriority.MEDIUM > 0 ? ', ' : ''}{summary.byPriority.MEDIUM > 0 ? `${summary.byPriority.MEDIUM} medium priority` : ''}.
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* File status metric breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
              <div className="text-[10px] text-neutral-500">Modified Files</div>
              <div className="font-mono text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
                {modifiedFiles}
              </div>
            </div>
            <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
              <div className="text-[10px] text-neutral-500">Added Files</div>
              <div className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {addedFiles}
              </div>
            </div>
            <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
              <div className="text-[10px] text-neutral-500">Deleted Files</div>
              <div className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                {deletedFiles}
              </div>
            </div>
            <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
              <div className="text-[10px] text-neutral-500">Renamed Files</div>
              <div className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {renamedFiles}
              </div>
            </div>
          </div>

          {/* Main Review Areas */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
              Identified Review Focus Areas
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {areas.map((area) => {
                const Icon = area.icon;
                return (
                  <button
                    key={area.name}
                    onClick={() => onSelectCategory && onSelectCategory(area.key)}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      area.count > 0
                        ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/60 dark:bg-[#14171d] hover:border-neutral-500'
                        : 'border-neutral-100 dark:border-neutral-800/60 opacity-50 bg-neutral-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-3.5 w-3.5 text-neutral-500" />
                      <span className="font-mono text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                        {area.count}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate mt-1">
                      {area.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
