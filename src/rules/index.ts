import {
  ParsedDiff,
  DiffFile,
  AnalysisMode,
  AnalysisContext,
  AnalysisWarning,
} from '../types/diff';
import { Finding, FindingsSummary, FindingCategory, FindingPriority } from '../types/finding';
import { Rule } from './types';
import { apiRule } from './api/apiRules';
import { authRule } from './auth/authRules';
import { envRule } from './env/envRules';
import { databaseRule } from './database/databaseRules';
import { dependencyRule, extractDependencyChanges } from './dependencies/dependencyRules';
import { frontendRule } from './frontend/frontendRules';
import { testRule } from './tests/testRules';
import { configRule } from './config/configRules';
import { renameRule } from './renames/renameRules';
import { DependencyChange } from '../types/dependency';
import { correlateAndDeduplicateFindings } from './correlation';

export const ALL_RULES: Rule[] = [
  apiRule,
  authRule,
  envRule,
  databaseRule,
  dependencyRule,
  frontendRule,
  testRule,
  configRule,
  renameRule,
];

export interface AnalysisResult {
  findings: Finding[];
  dependencies: DependencyChange[];
  summary: FindingsSummary;
  context: AnalysisContext;
  warnings: AnalysisWarning[];
}

export function runAnalysis(parsedDiff: ParsedDiff, options?: { mode?: AnalysisMode }): AnalysisResult {
  const rawFindings: Finding[] = [];
  const seenIds = new Set<string>();

  // Determine authoritative analysis mode
  const effectiveMode: AnalysisMode =
    options?.mode ||
    (parsedDiff.mode ? parsedDiff.mode : parsedDiff.analysisMode) ||
    (parsedDiff.hasBaseline === false
      ? 'snapshot'
      : parsedDiff.files.length > 0 &&
        parsedDiff.files.every(
          (f) =>
            f.status === 'detected' ||
            (f.status === 'added' && f.deletions === 0 && !f.hunks.some((h) => h.oldLines > 0))
        )
      ? 'snapshot'
      : 'comparison');

  const hasBaseline = effectiveMode !== 'snapshot';

  const totalLinesAnalyzed =
    parsedDiff.totalLinesAnalyzed ||
    parsedDiff.files.reduce((sum, f) => sum + (f.linesAnalyzed || f.additions + f.deletions), 0);

  const warnings: AnalysisWarning[] = [...(parsedDiff.warnings || [])];

  const context: AnalysisContext = {
    mode: effectiveMode,
    hasBaseline,
    files: parsedDiff.files,
    totalFiles: parsedDiff.totalFiles,
    totalLinesAnalyzed,
    totalAdditions: hasBaseline ? parsedDiff.totalAdditions : 0,
    totalDeletions: hasBaseline ? parsedDiff.totalDeletions : 0,
    warnings,
  };

  // Run each rule on each file with graceful error isolation
  for (const file of parsedDiff.files) {
    for (const rule of ALL_RULES) {
      try {
        const fileFindings = rule.analyze(file, parsedDiff.files, effectiveMode, context);
        for (const f of fileFindings) {
          if (!seenIds.has(f.id)) {
            seenIds.add(f.id);
            rawFindings.push(f);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push({
          filePath: file.newPath,
          code: 'RULE_EXECUTION_ERROR',
          message: `Rule "${rule.name}" failed on ${file.newPath}: ${msg}`,
          recoverable: true,
        });
      }
    }
  }

  // Correlate and deduplicate findings across heuristic detectors
  const { uniqueFindings, totalSignals } = correlateAndDeduplicateFindings(rawFindings);

  // Extract structured dependency changes
  let dependencies: DependencyChange[] = [];
  try {
    dependencies = extractDependencyChanges(parsedDiff.files, effectiveMode);
  } catch (err) {
    warnings.push({
      code: 'DEPENDENCY_PARSE_ERROR',
      message: `Failed to extract dependencies: ${err instanceof Error ? err.message : String(err)}`,
      recoverable: true,
    });
  }

  // Compute breakdown
  const byPriority: Record<FindingPriority, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    REVIEW: 0,
  };

  const byCategory: Record<FindingCategory, number> = {
    api: 0,
    authorization: 0,
    authentication: 0,
    dependencies: 0,
    configuration: 0,
    database: 0,
    frontend: 0,
    backend: 0,
    tests: 0,
    security: 0,
    other: 0,
  };

  for (const f of uniqueFindings) {
    if (!f.isDismissed) {
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }
  }

  return {
    findings: uniqueFindings,
    dependencies,
    summary: {
      total: uniqueFindings.filter((f) => !f.isDismissed).length,
      totalSignals,
      byPriority,
      byCategory,
      reviewedCount: uniqueFindings.filter((f) => f.isReviewed).length,
    },
    context,
    warnings,
  };
}
