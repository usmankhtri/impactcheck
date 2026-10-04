export type FileStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'binary'
  | 'detected'
  | 'unchanged'
  | 'unknown';

export type AnalysisMode = 'snapshot' | 'comparison' | 'git-diff' | 'pasted-diff';

export type DiffLineType = 'add' | 'delete' | 'context' | 'detected';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffFile {
  id: string;
  oldPath: string;
  newPath: string;
  status: FileStatus;
  isBinary: boolean;
  isLockfile: boolean;
  additions: number;
  deletions: number;
  linesAnalyzed?: number;
  hunks: DiffHunk[];
  rawHeader: string[];
  beforeContent?: string;
  afterContent?: string;
}

export interface AnalysisWarning {
  filePath?: string;
  code: string;
  message: string;
  recoverable: boolean;
}

export interface AnalysisContext {
  mode: AnalysisMode;
  hasBaseline: boolean;
  projectName?: string;
  files: DiffFile[];
  totalFiles: number;
  totalLinesAnalyzed: number;
  totalAdditions: number;
  totalDeletions: number;
  warnings: AnalysisWarning[];
  beforeMap?: Map<string, string>;
  afterMap?: Map<string, string>;
  rawDiff?: string;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  totalLinesAnalyzed?: number;
  hasBinaryFiles: boolean;
  hasLockfiles: boolean;
  parsedAt: string;
  analysisMode: AnalysisMode;
  mode?: AnalysisMode;
  hasBaseline: boolean;
  warnings?: AnalysisWarning[];
}
