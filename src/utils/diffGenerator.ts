import {
  DiffFile,
  DiffHunk,
  DiffLine,
  FileStatus,
  ParsedDiff,
  AnalysisWarning,
} from '../types/diff';

/**
 * Computes a line-by-line diff between two text strings and formats it as DiffHunks.
 */
export function computeLineDiff(oldText: string, newText: string): {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
} {
  const oldLines = oldText ? oldText.split(/\r?\n/) : [];
  const newLines = newText ? newText.split(/\r?\n/) : [];

  // If old is empty, all new are additions
  if (oldLines.length === 0) {
    const lines: DiffLine[] = newLines.map((content, idx) => ({
      type: 'add',
      content,
      newLineNumber: idx + 1,
    }));
    return {
      hunks: [
        {
          header: `@@ -0,0 +1,${newLines.length} @@`,
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: newLines.length,
          lines,
        },
      ],
      additions: newLines.length,
      deletions: 0,
    };
  }

  // If new is empty, all old are deletions
  if (newLines.length === 0) {
    const lines: DiffLine[] = oldLines.map((content, idx) => ({
      type: 'delete',
      content,
      oldLineNumber: idx + 1,
    }));
    return {
      hunks: [
        {
          header: `@@ -1,${oldLines.length} +0,0 @@`,
          oldStart: 1,
          oldLines: oldLines.length,
          newStart: 0,
          newLines: 0,
          lines,
        },
      ],
      additions: 0,
      deletions: oldLines.length,
    };
  }

  // Simple Longest Common Subsequence (LCS) line diff for browser performance
  const lcs = computeLcsMatrix(oldLines, newLines);
  const diffOps = backtrackLcs(lcs, oldLines, newLines, oldLines.length, newLines.length);

  let additions = 0;
  let deletions = 0;
  for (const op of diffOps) {
    if (op.type === 'add') additions++;
    if (op.type === 'delete') deletions++;
  }

  // If identical, return empty hunks
  if (additions === 0 && deletions === 0) {
    return { hunks: [], additions: 0, deletions: 0 };
  }

  // Group diffOps into hunks with context lines
  const hunks = buildHunksFromOps(diffOps);

  return {
    hunks,
    additions,
    deletions,
  };
}

interface DiffOp {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function computeLcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  // If files are very large (> 2000 lines), use fast windowed comparison to keep browser responsive
  if (m * n > 4000000) {
    return computeFastMatrix(a, b);
  }

  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

function computeFastMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const windowSize = 50;

  for (let i = 1; i <= m; i++) {
    const minJ = Math.max(1, Math.floor((i / m) * n) - windowSize);
    const maxJ = Math.min(n, Math.floor((i / m) * n) + windowSize);
    for (let j = minJ; j <= maxJ; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

function backtrackLcs(
  matrix: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number
): DiffOp[] {
  const ops: DiffOp[] = [];
  let curI = i;
  let curJ = j;

  while (curI > 0 || curJ > 0) {
    if (curI > 0 && curJ > 0 && a[curI - 1] === b[curJ - 1]) {
      ops.unshift({
        type: 'context',
        content: a[curI - 1],
        oldLineNumber: curI,
        newLineNumber: curJ,
      });
      curI--;
      curJ--;
    } else if (curJ > 0 && (curI === 0 || matrix[curI][curJ - 1] >= matrix[curI - 1][curJ])) {
      ops.unshift({
        type: 'add',
        content: b[curJ - 1],
        newLineNumber: curJ,
      });
      curJ--;
    } else if (curI > 0 && (curJ === 0 || matrix[curI][curJ - 1] < matrix[curI - 1][curJ])) {
      ops.unshift({
        type: 'delete',
        content: a[curI - 1],
        oldLineNumber: curI,
      });
      curI--;
    } else {
      break;
    }
  }

  return ops;
}

const CONTEXT_LINES = 3;

function buildHunksFromOps(ops: DiffOp[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentLines: DiffLine[] = [];
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let inHunk = false;
  let trailingContextCount = 0;

  for (let idx = 0; idx < ops.length; idx++) {
    const op = ops[idx];

    if (op.type === 'add' || op.type === 'delete') {
      if (!inHunk) {
        // Collect leading context lines up to CONTEXT_LINES
        const leadingOps: DiffOp[] = [];
        let leadIdx = idx - 1;
        while (leadIdx >= 0 && ops[leadIdx].type === 'context' && leadingOps.length < CONTEXT_LINES) {
          leadingOps.unshift(ops[leadIdx]);
          leadIdx--;
        }

        currentLines = leadingOps.map((l) => ({
          type: 'context' as const,
          content: l.content,
          oldLineNumber: l.oldLineNumber,
          newLineNumber: l.newLineNumber,
        }));

        hunkOldStart = currentLines[0]?.oldLineNumber || op.oldLineNumber || 1;
        hunkNewStart = currentLines[0]?.newLineNumber || op.newLineNumber || 1;
        inHunk = true;
      }

      currentLines.push({
        type: op.type,
        content: op.content,
        oldLineNumber: op.oldLineNumber,
        newLineNumber: op.newLineNumber,
      });
      trailingContextCount = 0;
    } else if (inHunk) {
      currentLines.push({
        type: 'context',
        content: op.content,
        oldLineNumber: op.oldLineNumber,
        newLineNumber: op.newLineNumber,
      });
      trailingContextCount++;

      // If we accumulated enough context after changes, close hunk
      if (trailingContextCount >= CONTEXT_LINES * 2) {
        // Trim excess context
        const trimmed = currentLines.slice(0, currentLines.length - CONTEXT_LINES);
        hunks.push(createHunkFromLines(trimmed, hunkOldStart, hunkNewStart));
        currentLines = [];
        inHunk = false;
        trailingContextCount = 0;
      }
    }
  }

  if (inHunk && currentLines.length > 0) {
    hunks.push(createHunkFromLines(currentLines, hunkOldStart, hunkNewStart));
  }

  return hunks;
}

function createHunkFromLines(lines: DiffLine[], oldStart: number, newStart: number): DiffHunk {
  let oldCount = 0;
  let newCount = 0;
  for (const l of lines) {
    if (l.type === 'delete' || l.type === 'context') oldCount++;
    if (l.type === 'add' || l.type === 'context') newCount++;
  }

  return {
    header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    oldStart,
    oldLines: oldCount,
    newStart,
    newLines: newCount,
    lines,
  };
}

/**
 * Creates a canonical snapshot representation of a standalone project (e.g. single ZIP or folder).
 *
 * CRITICAL RULE:
 * A standalone snapshot has NO historical baseline.
 * Files are marked 'detected' (NOT 'added').
 * Additions and deletions are 0 (NOT +N / -0).
 * Total lines analyzed is tracked accurately.
 */
export function createSnapshotProject(
  filesMap: Map<string, string>,
  exclusions: string[] = [],
  warnings: AnalysisWarning[] = []
): ParsedDiff {
  const isExcluded = (path: string) => {
    return exclusions.some((pattern) => {
      const cleanPat = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      const reg = new RegExp(`^${cleanPat}$`);
      return reg.test(path) || path.includes(pattern.replace(/\*+/g, ''));
    });
  };

  const files: DiffFile[] = [];
  let fileIndex = 0;
  let totalLinesAnalyzed = 0;

  for (const [path, content] of Array.from(filesMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    if (isExcluded(path)) continue;

    const rawLines = content ? content.split(/\r?\n/) : [];
    totalLinesAnalyzed += rawLines.length;

    const isLockfile = /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock|bun\.lock)$/.test(path);

    // In a snapshot, all lines are observed in the detected project state
    const lines: DiffLine[] = rawLines.map((lineContent, idx) => ({
      type: 'detected',
      content: lineContent,
      newLineNumber: idx + 1,
    }));

    const hunk: DiffHunk = {
      header: `@@ -0,0 +1,${rawLines.length} (detected in snapshot) @@`,
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: rawLines.length,
      lines,
    };

    files.push({
      id: `file-snap-${fileIndex++}-${path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      oldPath: path,
      newPath: path,
      status: 'detected', // NEVER 'added' in snapshot mode!
      isBinary: false,
      isLockfile,
      additions: 0, // No lines were added historically
      deletions: 0, // No lines were deleted historically
      linesAnalyzed: rawLines.length,
      hunks: [hunk],
      rawHeader: [`# Project snapshot: ${path}`],
      afterContent: content,
    });
  }

  return {
    files,
    totalFiles: files.length,
    totalAdditions: 0, // Snapshot mode has 0 historical additions
    totalDeletions: 0, // Snapshot mode has 0 historical deletions
    totalLinesAnalyzed,
    hasBinaryFiles: false,
    hasLockfiles: files.some((f) => f.isLockfile),
    parsedAt: new Date().toISOString(),
    analysisMode: 'snapshot',
    hasBaseline: false, // NO baseline exists in snapshot
    warnings,
  };
}

const STANDARD_SOURCE_ROOT_DIRS = new Set([
  'src', 'lib', 'app', 'pages', 'components', 'test', 'tests', 'bin', 'scripts', 'public',
  'server', 'client', 'backend', 'frontend', 'common', 'core', 'utils', 'internal', 'pkg',
  'api', 'config', 'models', 'controllers', 'routes', 'views'
]);

function stripCommonRootDirectory(map: Map<string, string>): Map<string, string> {
  const keys = Array.from(map.keys());
  if (keys.length === 0) return map;
  const firstWithSlash = keys.find((k) => k.includes('/'));
  if (!firstWithSlash) return map;
  const rootDirName = firstWithSlash.split('/')[0];
  if (STANDARD_SOURCE_ROOT_DIRS.has(rootDirName.toLowerCase())) {
    return map;
  }
  const candidate = rootDirName + '/';
  if (keys.every((k) => k.startsWith(candidate))) {
    const stripped = new Map<string, string>();
    for (const [k, v] of map.entries()) {
      stripped.set(k.slice(candidate.length), v);
    }
    return stripped;
  }
  return map;
}

/**
 * Compares two directory file maps and outputs a complete normalized ParsedDiff.
 */
export function compareFileMaps(
  beforeMap: Map<string, string>,
  afterMap: Map<string, string>,
  exclusions: string[] = []
): ParsedDiff {
  // If there is NO baseline (beforeMap is empty), this is a STANDALONE SNAPSHOT!
  if (beforeMap.size === 0 && afterMap.size > 0) {
    return createSnapshotProject(afterMap, exclusions);
  }

  // Normalize root prefixes if entire archives share a single top-level directory
  const normBefore = stripCommonRootDirectory(beforeMap);
  const normAfter = stripCommonRootDirectory(afterMap);

  const isExcluded = (path: string) => {
    return exclusions.some((pattern) => {
      const cleanPat = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      const reg = new RegExp(`^${cleanPat}$`);
      return reg.test(path) || path.includes(pattern.replace(/\*+/g, ''));
    });
  };

  const allPaths = new Set<string>();
  for (const p of normBefore.keys()) if (!isExcluded(p)) allPaths.add(p);
  for (const p of normAfter.keys()) if (!isExcluded(p)) allPaths.add(p);

  // Identify deleted and added files for actual rename detection
  const deletedCandidates: string[] = [];
  const addedCandidates: string[] = [];
  for (const path of Array.from(allPaths).sort()) {
    const b = normBefore.get(path);
    const a = normAfter.get(path);
    if (b !== undefined && a === undefined) {
      deletedCandidates.push(path);
    } else if (b === undefined && a !== undefined) {
      addedCandidates.push(path);
    }
  }

  // Map of addedPath -> deletedPath for verified renames
  const renamedPairs = new Map<string, string>();
  const claimedDeleted = new Set<string>();

  // Pass 1: Exact content match across renamed paths
  for (const addedPath of addedCandidates) {
    const aContent = normAfter.get(addedPath);
    if (!aContent || aContent.trim().length === 0) continue;

    for (const delPath of deletedCandidates) {
      if (claimedDeleted.has(delPath)) continue;
      const bContent = normBefore.get(delPath);
      if (bContent !== undefined && bContent === aContent) {
        renamedPairs.set(addedPath, delPath);
        claimedDeleted.add(delPath);
        break;
      }
    }
  }

  // Pass 2: Base filename matches with high similarity
  for (const addedPath of addedCandidates) {
    if (renamedPairs.has(addedPath)) continue;
    const aContent = normAfter.get(addedPath);
    if (!aContent) continue;
    const addedBase = addedPath.split('/').pop();

    for (const delPath of deletedCandidates) {
      if (claimedDeleted.has(delPath)) continue;
      const bContent = normBefore.get(delPath);
      if (!bContent) continue;
      const delBase = delPath.split('/').pop();

      if (addedBase === delBase) {
        const { additions, deletions } = computeLineDiff(bContent, aContent);
        const avgLines = (bContent.split(/\r?\n/).length + aContent.split(/\r?\n/).length) / 2;
        if (avgLines > 0 && additions + deletions < avgLines * 1.5) {
          renamedPairs.set(addedPath, delPath);
          claimedDeleted.add(delPath);
          break;
        }
      }
    }
  }

  const files: DiffFile[] = [];
  let fileIndex = 0;
  let totalLinesAnalyzed = 0;

  for (const path of Array.from(allPaths).sort()) {
    if (claimedDeleted.has(path)) {
      // Subsumed by rename pairing under the new path
      continue;
    }

    const isRenamed = renamedPairs.has(path);
    const oldPath = isRenamed ? renamedPairs.get(path)! : path;
    const newPath = path;

    const beforeContent = normBefore.get(oldPath);
    const afterContent = normAfter.get(newPath);

    let status: FileStatus = 'modified';
    if (isRenamed) {
      status = 'renamed';
    } else if (beforeContent === undefined && afterContent !== undefined) {
      status = 'added';
    } else if (beforeContent !== undefined && afterContent === undefined) {
      status = 'deleted';
    } else if (beforeContent === afterContent) {
      // Unchanged file - omit from diff
      continue;
    }

    const { hunks, additions, deletions } = computeLineDiff(
      beforeContent || '',
      afterContent || ''
    );

    // If no additions and no deletions, file was identical
    if (hunks.length === 0 && status === 'modified') continue;

    const isLockfile = /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock|bun\.lock)$/.test(newPath);
    const fileLinesAnalyzed =
      (afterContent ? afterContent.split(/\r?\n/).length : 0) +
      (beforeContent ? beforeContent.split(/\r?\n/).length : 0);
    totalLinesAnalyzed += fileLinesAnalyzed;

    const rawHeader = isRenamed
      ? [
          `diff --git a/${oldPath} b/${newPath}`,
          `rename from ${oldPath}`,
          `rename to ${newPath}`,
          `--- a/${oldPath}`,
          `+++ b/${newPath}`,
        ]
      : [`diff --git a/${oldPath} b/${newPath}`, `--- a/${oldPath}`, `+++ b/${newPath}`];

    files.push({
      id: `file-cmp-${fileIndex++}-${newPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      oldPath,
      newPath,
      status,
      isBinary: false,
      isLockfile,
      additions,
      deletions,
      linesAnalyzed: fileLinesAnalyzed,
      hunks,
      rawHeader,
      beforeContent,
      afterContent,
    });
  }

  let totalAdditions = 0;
  let totalDeletions = 0;
  for (const f of files) {
    totalAdditions += f.additions;
    totalDeletions += f.deletions;
  }

  return {
    files,
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    totalLinesAnalyzed,
    hasBinaryFiles: false,
    hasLockfiles: files.some((f) => f.isLockfile),
    parsedAt: new Date().toISOString(),
    analysisMode: 'comparison',
    hasBaseline: true, // Baseline exists in before vs after comparison
  };
}
