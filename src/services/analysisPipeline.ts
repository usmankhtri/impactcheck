import {
  ParsedDiff,
  DiffFile,
  AnalysisMode,
  AnalysisContext,
  AnalysisWarning,
} from '../types/diff';
import { Finding, FindingsSummary, FindingCategory, FindingPriority } from '../types/finding';
import { DependencyChange } from '../types/dependency';
import { ReviewChecklistItem } from '../types/checklist';
import { ChangeMapData, buildChangeMap } from '../utils/changeMap';
import { BreakingChangeItem, extractBreakingWatchlist } from '../utils/breakingWatchlist';
import { generateChecklistFromFindings } from './checklistGenerator';
import {
  computeLineDiff,
  compareFileMaps,
  createSnapshotProject,
} from '../utils/diffGenerator';
import { parseGitDiff } from '../parser/diffParser';
import { ALL_RULES } from '../rules';
import { correlateAndDeduplicateFindings } from '../rules/correlation';
import { extractDependencyChanges } from '../rules/dependencies/dependencyRules';

export type AnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';

export type AnalysisStage =
  | 'preparing'
  | 'comparing'
  | 'parsing'
  | 'detecting'
  | 'correlating'
  | 'impact'
  | 'report';

export interface AnalysisStageInfo {
  stage: AnalysisStage;
  label: string;
  detail: string;
  stepIndex: number;
  totalSteps: number;
}

export type AnalysisInput =
  | {
      type: 'before-after-text';
      beforePath: string;
      beforeContent: string;
      afterPath: string;
      afterContent: string;
      projectName?: string;
    }
  | {
      type: 'before-after-projects';
      beforeName: string;
      afterName: string;
      beforeFiles: Map<string, string>;
      afterFiles: Map<string, string>;
    }
  | {
      type: 'git-diff';
      diffText: string;
      fileName?: string;
    }
  | {
      type: 'snapshot';
      projectName: string;
      files: Map<string, string>;
    }
  | {
      type: 'parsed-diff';
      parsed: ParsedDiff;
      rawDiffText?: string;
      projectName?: string;
    };

export interface PipelineResult {
  parsedDiff: ParsedDiff;
  findings: Finding[];
  summary: FindingsSummary;
  dependencies: DependencyChange[];
  changeMap: ChangeMapData;
  breakingWatchlist: BreakingChangeItem[];
  checklist: ReviewChecklistItem[];
  projectName: string;
  rawDiffText?: string;
  durationMs: number;
}

const TOTAL_STAGES = 7;

/**
 * Executes the real, authentic multi-stage analysis pipeline.
 * Real input is validated, parsed, diffed, classified, analyzed against rules,
 * correlated, and synthesized into impact findings.
 */
export async function executeAnalysisPipeline(
  input: AnalysisInput,
  onProgress?: (info: AnalysisStageInfo) => void
): Promise<PipelineResult> {
  const startTime = performance.now();

  const report = async (
    stage: AnalysisStage,
    label: string,
    detail: string,
    stepIndex: number,
    yieldMs = 45
  ) => {
    if (onProgress) {
      onProgress({
        stage,
        label,
        detail,
        stepIndex,
        totalSteps: TOTAL_STAGES,
      });
    }
    // Allow the browser event loop to paint the progress state
    await new Promise((resolve) => setTimeout(resolve, yieldMs));
  };

  // --------------------------------------------------------------------------
  // 1. STAGE: PREPARING
  // --------------------------------------------------------------------------
  await report(
    'preparing',
    'Validating & preparing input',
    'Validating input changes and normalizing content…',
    1
  );

  let parsedDiff: ParsedDiff;
  let rawDiffText: string | undefined;
  let projectName = 'Project Changes';

  // --------------------------------------------------------------------------
  // 2. STAGE: COMPARING (Build project / diff representation)
  // --------------------------------------------------------------------------
  if (input.type === 'before-after-text') {
    const beforePath = input.beforePath.trim() || 'src/file.ts';
    const afterPath = input.afterPath.trim() || beforePath;
    const beforeContent = input.beforeContent;
    const afterContent = input.afterContent;

    if (!beforeContent && !afterContent) {
      throw new Error('Both Before and After inputs are empty. Please provide code to analyze.');
    }

    const { hunks, additions, deletions } = computeLineDiff(beforeContent, afterContent);
    const status = beforePath === afterPath ? 'modified' : 'renamed';
    const linesAnalyzed =
      (beforeContent ? beforeContent.split(/\r?\n/).length : 0) +
      (afterContent ? afterContent.split(/\r?\n/).length : 0);

    const diffFile: DiffFile = {
      id: `file-cmp-${Date.now()}`,
      oldPath: beforePath,
      newPath: afterPath,
      status,
      isBinary: false,
      isLockfile: false,
      additions,
      deletions,
      linesAnalyzed,
      hunks,
      rawHeader: [`diff --git a/${beforePath} b/${afterPath}`, `--- a/${beforePath}`, `+++ b/${afterPath}`],
      beforeContent,
      afterContent,
    };

    parsedDiff = {
      files: [diffFile],
      totalFiles: 1,
      totalAdditions: additions,
      totalDeletions: deletions,
      totalLinesAnalyzed: linesAnalyzed,
      hasBinaryFiles: false,
      hasLockfiles: false,
      parsedAt: new Date().toISOString(),
      analysisMode: 'comparison',
      hasBaseline: true,
    };

    projectName = input.projectName || afterPath.split('/').pop() || 'File Comparison';
    await report(
      'comparing',
      'Computing line diffs',
      `Computed line-by-line diff for ${afterPath} (+${additions} / -${deletions})…`,
      2
    );
  } else if (input.type === 'before-after-projects') {
    if (input.beforeFiles.size === 0 && input.afterFiles.size === 0) {
      throw new Error('Project directories are empty. Please select folders with files.');
    }

    parsedDiff = compareFileMaps(input.beforeFiles, input.afterFiles);
    parsedDiff.analysisMode = 'comparison';
    projectName = `${input.beforeName || 'Base'} → ${input.afterName || 'Target'}`;

    await report(
      'comparing',
      'Comparing file trees',
      `Comparing ${input.beforeFiles.size} baseline files with ${input.afterFiles.size} target files (${parsedDiff.totalFiles} modified)…`,
      2
    );
  } else if (input.type === 'git-diff') {
    const text = input.diffText.trim();
    if (!text) {
      throw new Error('Git diff or patch text is empty.');
    }

    parsedDiff = parseGitDiff(text);
    parsedDiff.analysisMode = 'git-diff';
    rawDiffText = text;
    projectName = input.fileName || parsedDiff.files[0]?.newPath || 'Git Diff';

    await report(
      'comparing',
      'Parsing git patch',
      `Extracted ${parsedDiff.totalFiles} changed files from git diff…`,
      2
    );
  } else if (input.type === 'snapshot') {
    if (input.files.size === 0) {
      throw new Error('Snapshot file map is empty.');
    }

    parsedDiff = createSnapshotProject(input.files);
    projectName = input.projectName || 'Project Snapshot';

    await report(
      'comparing',
      'Cataloging snapshot',
      `Indexed ${input.files.size} source files for baseline-free impact assessment…`,
      2
    );
  } else if (input.type === 'parsed-diff') {
    parsedDiff = input.parsed;
    rawDiffText = input.rawDiffText;
    projectName = input.projectName || parsedDiff.files[0]?.newPath || 'Diff Changes';

    await report(
      'comparing',
      'Analyzing diff structure',
      `Loaded ${parsedDiff.totalFiles} changed files in diff representation…`,
      2
    );
  } else {
    throw new Error('Unsupported analysis input format.');
  }

  // --------------------------------------------------------------------------
  // 3. STAGE: PARSING (Classify files and extract ASTs)
  // --------------------------------------------------------------------------
  const effectiveMode: AnalysisMode =
    (parsedDiff.mode ? parsedDiff.mode : parsedDiff.analysisMode) ||
    (parsedDiff.hasBaseline === false ? 'snapshot' : 'comparison');

  const calculateFileLines = (f: DiffFile): number => {
    if (f.linesAnalyzed && f.linesAnalyzed > 0) return f.linesAnalyzed;
    if (f.afterContent) return f.afterContent.split(/\r?\n/).length;
    if (f.hunks && f.hunks.length > 0) {
      return f.hunks.reduce((acc, h) => acc + h.lines.length, 0);
    }
    return f.additions + f.deletions;
  };

  const totalLinesAnalyzed =
    parsedDiff.totalLinesAnalyzed && parsedDiff.totalLinesAnalyzed > 0
      ? parsedDiff.totalLinesAnalyzed
      : parsedDiff.files.reduce((sum, f) => sum + calculateFileLines(f), 0);

  const warnings: AnalysisWarning[] = [...(parsedDiff.warnings || [])];

  const context: AnalysisContext = {
    mode: effectiveMode,
    hasBaseline: effectiveMode !== 'snapshot',
    files: parsedDiff.files,
    totalFiles: parsedDiff.totalFiles,
    totalLinesAnalyzed,
    totalAdditions: effectiveMode !== 'snapshot' ? parsedDiff.totalAdditions : 0,
    totalDeletions: effectiveMode !== 'snapshot' ? parsedDiff.totalDeletions : 0,
    warnings,
  };

  const fileCount = parsedDiff.files.length;
  await report(
    'parsing',
    'Classifying & parsing files',
    `Classified ${fileCount} file${fileCount === 1 ? '' : 's'} across language and configuration types…`,
    3
  );

  // --------------------------------------------------------------------------
  // 4. STAGE: DETECTING (Execute domain rules)
  // --------------------------------------------------------------------------
  const rawFindings: Finding[] = [];
  const seenIds = new Set<string>();

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

  await report(
    'detecting',
    'Detecting raw impact signals',
    `Evaluated ${ALL_RULES.length} domain rules across ${fileCount} files, detected ${rawFindings.length} change signals…`,
    4
  );

  // --------------------------------------------------------------------------
  // 5. STAGE: CORRELATING (Correlate, infer semantic changes, deduplicate)
  // --------------------------------------------------------------------------
  const { uniqueFindings, totalSignals } = correlateAndDeduplicateFindings(rawFindings);

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

  await report(
    'correlating',
    'Correlating & deduplicating signals',
    `Correlated ${totalSignals} detection signals into ${uniqueFindings.length} semantic findings…`,
    5
  );

  // --------------------------------------------------------------------------
  // 6. STAGE: IMPACT (Calculate impact matrix, breaking watchlist, checklist)
  // --------------------------------------------------------------------------
  const changeMap = buildChangeMap(parsedDiff.files, uniqueFindings);
  const breakingWatchlist = extractBreakingWatchlist(parsedDiff.files, uniqueFindings);
  const checklist = generateChecklistFromFindings(uniqueFindings);

  await report(
    'impact',
    'Calculating impact matrix',
    `Built architectural change map, identified ${breakingWatchlist.length} watchlist items, and ${checklist.length} review checks…`,
    6
  );

  // --------------------------------------------------------------------------
  // 7. STAGE: REPORT (Build canonical report & finalize)
  // --------------------------------------------------------------------------
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

  const summary: FindingsSummary = {
    total: uniqueFindings.filter((f) => !f.isDismissed).length,
    totalSignals,
    byPriority,
    byCategory,
    reviewedCount: uniqueFindings.filter((f) => f.isReviewed).length,
  };

  await report(
    'report',
    'Finalizing impact report',
    'Canonical report compiled and ready for review…',
    7,
    40
  );

  const durationMs = Math.round(performance.now() - startTime);

  return {
    parsedDiff,
    findings: uniqueFindings,
    summary,
    dependencies,
    changeMap,
    breakingWatchlist,
    checklist,
    projectName,
    rawDiffText,
    durationMs,
  };
}
