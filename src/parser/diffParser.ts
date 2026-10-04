import { DiffFile, DiffHunk, DiffLine, FileStatus, ParsedDiff } from '../types/diff';

const LOCKFILE_PATTERNS = [
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /Cargo\.lock$/,
  /poetry\.lock$/,
  /Gemfile\.lock$/,
  /composer\.lock$/,
  /bun\.lock$/,
  /bun\.lockb$/,
];

export function isLockfilePath(filePath: string): boolean {
  return LOCKFILE_PATTERNS.some((pat) => pat.test(filePath));
}

export function parseGitDiff(diffText: string): ParsedDiff {
  if (!diffText || typeof diffText !== 'string' || !diffText.trim()) {
    throw new Error('Empty diff provided. Paste a valid Git diff or upload a .patch file.');
  }

  const lines = diffText.split(/\r?\n/);
  const files: DiffFile[] = [];

  let currentFile: Partial<DiffFile> | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;
  let fileIndex = 0;

  const commitCurrentFile = () => {
    if (currentFile) {
      if (currentHunk) {
        currentFile.hunks = currentFile.hunks || [];
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }

      const filePath = currentFile.newPath || currentFile.oldPath || 'unknown';
      const cleanPath = filePath.replace(/^[ab]\//, '');
      const oldCleanPath = (currentFile.oldPath || '').replace(/^[ab]\//, '');

      const isLock = isLockfilePath(cleanPath) || isLockfilePath(oldCleanPath);

      files.push({
        id: `file-${fileIndex++}-${cleanPath}`,
        oldPath: oldCleanPath || cleanPath,
        newPath: cleanPath,
        status: currentFile.status || 'modified',
        isBinary: !!currentFile.isBinary,
        isLockfile: isLock,
        additions: currentFile.additions || 0,
        deletions: currentFile.deletions || 0,
        hunks: currentFile.hunks || [],
        rawHeader: currentFile.rawHeader || [],
      });
      currentFile = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file header start: "diff --git a/... b/..."
    if (line.startsWith('diff --git ')) {
      commitCurrentFile();

      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = {
        oldPath: match ? match[1] : '',
        newPath: match ? match[2] : '',
        status: 'modified',
        isBinary: false,
        additions: 0,
        deletions: 0,
        hunks: [],
        rawHeader: [line],
      };
      continue;
    }

    // Fallback detection for raw patches without "diff --git"
    if (!currentFile && (line.startsWith('--- ') || line.startsWith('+++ '))) {
      commitCurrentFile();
      currentFile = {
        oldPath: '',
        newPath: '',
        status: 'modified',
        isBinary: false,
        additions: 0,
        deletions: 0,
        hunks: [],
        rawHeader: [line],
      };
    }

    if (!currentFile) {
      // Lines before first file diff (e.g. commit message or email headers in git format-patch)
      continue;
    }

    // Process file metadata headers
    if (line.startsWith('new file mode ')) {
      currentFile.status = 'added';
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('deleted file mode ')) {
      currentFile.status = 'deleted';
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('similarity index ')) {
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('rename from ')) {
      currentFile.status = 'renamed';
      currentFile.oldPath = line.substring('rename from '.length).trim();
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('rename to ')) {
      currentFile.status = 'renamed';
      currentFile.newPath = line.substring('rename to '.length).trim();
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('--- ')) {
      currentFile.rawHeader?.push(line);
      const rawOld = line.substring(4).trim();
      if (rawOld === '/dev/null') {
        currentFile.status = 'added';
      } else {
        const cleaned = rawOld.replace(/^[ab]\//, '');
        if (!currentFile.oldPath || currentFile.oldPath === 'unknown') {
          currentFile.oldPath = cleaned;
        }
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      currentFile.rawHeader?.push(line);
      const rawNew = line.substring(4).trim();
      if (rawNew === '/dev/null') {
        currentFile.status = 'deleted';
      } else {
        const cleaned = rawNew.replace(/^[ab]\//, '');
        if (!currentFile.newPath || currentFile.newPath === 'unknown') {
          currentFile.newPath = cleaned;
        }
      }
      continue;
    }

    // Binary file diff check
    if (line.includes('Binary files ') && line.includes(' differ')) {
      currentFile.isBinary = true;
      currentFile.status = currentFile.status || 'binary';
      currentFile.rawHeader?.push(line);
      continue;
    }

    if (line.startsWith('GIT binary patch')) {
      currentFile.isBinary = true;
      currentFile.status = currentFile.status || 'binary';
      currentFile.rawHeader?.push(line);
      continue;
    }

    // Hunk header check: "@@ -oldStart,oldLen +newStart,newLen @@"
    if (line.startsWith('@@ ')) {
      if (currentHunk) {
        currentFile.hunks = currentFile.hunks || [];
        currentFile.hunks.push(currentHunk);
      }

      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (match) {
        const oldStart = parseInt(match[1], 10);
        const oldLines = match[2] !== undefined ? parseInt(match[2], 10) : 1;
        const newStart = parseInt(match[3], 10);
        const newLines = match[4] !== undefined ? parseInt(match[4], 10) : 1;

        oldLineCounter = oldStart;
        newLineCounter = newStart;

        currentHunk = {
          header: line,
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };
      } else {
        currentHunk = {
          header: line,
          oldStart: 1,
          oldLines: 0,
          newStart: 1,
          newLines: 0,
          lines: [],
        };
      }
      continue;
    }

    // Inside a hunk
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentFile.additions = (currentFile.additions || 0) + 1;
        const diffLine: DiffLine = {
          type: 'add',
          content: line.substring(1),
          newLineNumber: newLineCounter++,
        };
        currentHunk.lines.push(diffLine);
      } else if (line.startsWith('-')) {
        currentFile.deletions = (currentFile.deletions || 0) + 1;
        const diffLine: DiffLine = {
          type: 'delete',
          content: line.substring(1),
          oldLineNumber: oldLineCounter++,
        };
        currentHunk.lines.push(diffLine);
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.substring(1),
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
        };
        currentHunk.lines.push(diffLine);
      } else if (line.startsWith('\\ No newline at end of file')) {
        // ignore or note
      } else if (line === '') {
        // empty context line or end of hunk
        const diffLine: DiffLine = {
          type: 'context',
          content: '',
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
        };
        currentHunk.lines.push(diffLine);
      } else {
        // Could be raw un-prefixed line in loose diffs
        currentFile.rawHeader?.push(line);
      }
    } else {
      currentFile.rawHeader?.push(line);
    }
  }

  commitCurrentFile();

  if (files.length === 0) {
    throw new Error(
      'Could not detect any changed files in the provided text. Ensure your diff starts with standard git diff or patch headers (e.g., "diff --git", "--- a/...", "+++ b/...").'
    );
  }

  let totalAdditions = 0;
  let totalDeletions = 0;
  let hasBinaryFiles = false;
  let hasLockfiles = false;

  for (const file of files) {
    totalAdditions += file.additions;
    totalDeletions += file.deletions;
    if (file.isBinary) hasBinaryFiles = true;
    if (file.isLockfile) hasLockfiles = true;
  }

  return {
    files,
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    totalLinesAnalyzed: totalAdditions + totalDeletions,
    hasBinaryFiles,
    hasLockfiles,
    parsedAt: new Date().toISOString(),
    analysisMode: 'git-diff',
    hasBaseline: true,
  };
}
