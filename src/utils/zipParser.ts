import JSZip from 'jszip';
import { AnalysisWarning } from '../types/diff';

export interface ExtractedProject {
  name: string;
  files: Map<string, string>;
  totalFiles: number;
  totalBytes: number;
  skippedBinaryCount: number;
  warnings: AnalysisWarning[];
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'svg',
  'pdf', 'zip', 'tar', 'gz', 'bz2', '7z',
  'mp3', 'mp4', 'mov', 'avi', 'wav',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso',
  'woff', 'woff2', 'ttf', 'eot',
  'pyc', 'class', 'o', 'obj',
]);

const IGNORED_PATH_PATTERNS = [
  /__MACOSX/,
  /\.DS_Store$/,
  /Thumbs\.db$/,
  /\.git\//,
];

const STANDARD_SOURCE_ROOT_DIRS = new Set([
  'src', 'lib', 'app', 'pages', 'components', 'test', 'tests', 'bin', 'scripts', 'public',
  'server', 'client', 'backend', 'frontend', 'common', 'core', 'utils', 'internal', 'pkg',
  'api', 'config', 'models', 'controllers', 'routes', 'views'
]);

function isBinaryPath(path: string): boolean {
  const parts = path.split('.');
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1].toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function sanitizeZipPath(rawPath: string): { path: string | null; warning?: string } {
  // Guard against Zip Slip and null byte injection
  if (rawPath.includes('\0')) {
    return { path: null, warning: 'File path contained invalid null byte characters.' };
  }

  const normalized = rawPath.replace(/\\/g, '/');

  if (
    normalized.startsWith('/') ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    normalized === '..'
  ) {
    return { path: null, warning: `Path traversal attempt detected and blocked: "${rawPath}".` };
  }

  return { path: normalized };
}

export async function extractZipArchive(
  file: File,
  onProgress?: (percent: number, currentFile: string) => void
): Promise<ExtractedProject> {
  const zip = new JSZip();
  let loaded: JSZip;

  try {
    loaded = await zip.loadAsync(file);
  } catch (err) {
    throw new Error(
      `Corrupted or unsupported archive format: ${err instanceof Error ? err.message : 'Invalid ZIP file.'}`
    );
  }

  const filesMap = new Map<string, string>();
  const warnings: AnalysisWarning[] = [];
  let totalBytes = 0;
  let skippedBinaryCount = 0;

  const entries = Object.keys(loaded.files);
  const totalEntries = entries.length;
  let processed = 0;

  if (totalEntries === 0) {
    throw new Error('ZIP archive is empty. No files were found inside.');
  }

  // Detect if all files share a common single root directory (e.g. "my-project-main/")
  let commonPrefix = '';
  const firstPath = entries.find((e) => !loaded.files[e].dir);
  if (firstPath && firstPath.includes('/')) {
    const rootCandidate = firstPath.split('/')[0];
    if (!STANDARD_SOURCE_ROOT_DIRS.has(rootCandidate.toLowerCase())) {
      const candidatePrefix = rootCandidate + '/';
      const allShare = entries.every(
        (e) => e.startsWith(candidatePrefix) || e === candidatePrefix.slice(0, -1)
      );
      if (allShare) {
        commonPrefix = candidatePrefix;
      }
    }
  }

  for (const rawName of entries) {
    processed++;
    if (onProgress && processed % 50 === 0) {
      onProgress(Math.round((processed / totalEntries) * 100), rawName);
    }

    const zipEntry = loaded.files[rawName];
    if (zipEntry.dir) continue;

    // Skip OS metadata files
    if (IGNORED_PATH_PATTERNS.some((p) => p.test(rawName))) {
      continue;
    }

    const { path: safePath, warning } = sanitizeZipPath(rawName);
    if (warning) {
      warnings.push({
        filePath: rawName,
        code: 'SECURITY_PATH_TRAVERSAL',
        message: warning,
        recoverable: true,
      });
      continue;
    }

    if (!safePath) continue;

    let relativePath = safePath;
    if (commonPrefix && relativePath.startsWith(commonPrefix)) {
      relativePath = relativePath.slice(commonPrefix.length);
    }
    if (!relativePath) continue;

    if (isBinaryPath(relativePath)) {
      skippedBinaryCount++;
      continue;
    }

    try {
      const content = await zipEntry.async('string');
      // Limit file size to 2MB to keep browser memory responsive
      if (content.length <= 2000000) {
        filesMap.set(relativePath, content);
        totalBytes += content.length;
      } else {
        warnings.push({
          filePath: relativePath,
          code: 'FILE_TOO_LARGE',
          message: `File exceeds 2MB limit (${(content.length / 1024 / 1024).toFixed(1)}MB). Skipped for memory safety.`,
          recoverable: true,
        });
      }
    } catch (readErr) {
      skippedBinaryCount++;
      warnings.push({
        filePath: relativePath,
        code: 'READ_ERROR',
        message: `Failed to decode file content: ${readErr instanceof Error ? readErr.message : 'encoding error'}.`,
        recoverable: true,
      });
    }
  }

  const projectName = file.name.replace(/\.zip$/i, '') || 'Uploaded Project';

  return {
    name: projectName,
    files: filesMap,
    totalFiles: filesMap.size,
    totalBytes,
    skippedBinaryCount,
    warnings,
  };
}
