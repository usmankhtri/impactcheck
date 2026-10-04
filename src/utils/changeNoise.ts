import { DiffFile } from '../types/diff';

export interface NoiseAnalysis {
  substantiveFiles: DiffFile[];
  noiseFiles: DiffFile[];
  noiseAdditions: number;
  noiseDeletions: number;
  substantiveAdditions: number;
  substantiveDeletions: number;
  noiseCategories: Array<{
    name: string;
    fileCount: number;
    description: string;
  }>;
}

export function analyzeChangeNoise(files: DiffFile[]): NoiseAnalysis {
  const substantiveFiles: DiffFile[] = [];
  const noiseFiles: DiffFile[] = [];

  let noiseAdditions = 0;
  let noiseDeletions = 0;
  let substantiveAdditions = 0;
  let substantiveDeletions = 0;

  const categoryMap = new Map<string, number>();

  for (const file of files) {
    let isNoise = false;
    let reason = '';

    if (file.isLockfile) {
      isNoise = true;
      reason = 'Dependency Lockfile';
    } else if (file.newPath.endsWith('.map') || file.newPath.endsWith('.min.js') || file.newPath.endsWith('.min.css')) {
      isNoise = true;
      reason = 'Generated Bundles / Source Maps';
    } else if (file.newPath.includes('/vendor/') || file.newPath.includes('/third_party/')) {
      isNoise = true;
      reason = 'Vendored Code';
    } else if (file.newPath.endsWith('.d.ts') && (file.additions > 200 || file.deletions > 200)) {
      isNoise = true;
      reason = 'Auto-Generated Type Declarations';
    }

    if (isNoise) {
      noiseFiles.push(file);
      noiseAdditions += file.additions;
      noiseDeletions += file.deletions;
      categoryMap.set(reason, (categoryMap.get(reason) || 0) + 1);
    } else {
      substantiveFiles.push(file);
      substantiveAdditions += file.additions;
      substantiveDeletions += file.deletions;
    }
  }

  const noiseCategories = Array.from(categoryMap.entries()).map(([name, fileCount]) => ({
    name,
    fileCount,
    description: `Contains ${fileCount} files that represent machine artifacts or routine churn rather than business logic.`,
  }));

  return {
    substantiveFiles,
    noiseFiles,
    noiseAdditions,
    noiseDeletions,
    substantiveAdditions,
    substantiveDeletions,
    noiseCategories,
  };
}
