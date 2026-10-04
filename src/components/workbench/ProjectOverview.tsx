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
  ArrowRight,
} from 'lucide-react';
import { ParsedDiff } from '../../types/diff';
import { FindingsSummary, Finding } from '../../types/finding';
import { DependencyChange } from '../../types/dependency';

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
  const addedFiles = parsedDiff.files.filter((f) => f.status === 'added').length;
  const deletedFiles = parsedDiff.files.filter((f) => f.status === 'deleted').length;
  const renamedFiles = parsedDiff.files.filter((f) => f.status === 'renamed').length;
  const modifiedFiles = parsedDiff.files.filter((f) => f.status === 'modified').length;

  // Key review area summaries
  const areas: Array<{ name: string; count: number; icon: React.ElementType; key: string }> = [
    { name: 'API Routes', count: summary.byCategory.api, icon: Server, key: 'api' },
    { name: 'Authentication', count: summary.byCategory.authentication, icon: Lock, key: 'authentication' },
    { name: 'Database', count: summary.byCategory.database, icon: Database, key: 'database' },
    { name: 'Dependencies', count: summary.byCategory.dependencies, icon: Layers, key: 'dependencies' },
    { name: 'Tests', count: summary.byCategory.tests, icon: TestTube2, key: 'tests' },
  ];

  // Concise natural-language summary
  const activeCategories = areas.filter((a) => a.count > 0).map((a) => a.name.toLowerCase());
  const summarySentence =
    activeCategories.length > 0
      ? `${parsedDiff.totalFiles} ${parsedDiff.totalFiles === 1 ? 'file' : 'files'} changed across ${activeCategories.join(', ')}.`
      : `${parsedDiff.totalFiles} ${parsedDiff.totalFiles === 1 ? 'file' : 'files'} changed with no high-impact boundary crossings detected.`;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-4 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            Project Overview
          </span>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
            {projectName}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {summarySentence}
          </p>
        </div>

        {/* High-level counters */}
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
      </div>

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
    </div>
  );
};
