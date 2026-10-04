export interface DetectedProjectMetadata {
  name: string;
  totalFiles: number;
  totalDirectories: number;
  languages: Array<{ name: string; percentage: number; fileCount: number }>;
  packageManager?: string;
  framework?: string;
  projectType: string;
  isMonorepo: boolean;
  monorepoWorkspaces: string[];
  noiseFilesCount: number;
  recommendedExclusions: string[];
}

export const DEFAULT_EXCLUSION_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  'vendor/**',
  '__pycache__/**',
  'target/**',
  '.git/**',
  '.turbo/**',
  'out/**',
  '*.lock',
];

export function isNoisePath(path: string): boolean {
  return (
    path.includes('node_modules/') ||
    path.startsWith('dist/') ||
    path.startsWith('build/') ||
    path.includes('.next/') ||
    path.includes('coverage/') ||
    path.includes('vendor/') ||
    path.includes('__pycache__/') ||
    path.startsWith('target/') ||
    path.includes('.git/') ||
    path.endsWith('.lock') ||
    path.endsWith('package-lock.json') ||
    path.endsWith('pnpm-lock.yaml')
  );
}

export function detectProjectMetadata(
  filePaths: string[],
  fileContents?: Map<string, string>,
  inferredName = 'Project'
): DetectedProjectMetadata {
  const languageCounts = new Map<string, number>();
  const directories = new Set<string>();
  let noiseFilesCount = 0;
  let packageManager: string | undefined;
  let framework: string | undefined;
  let isMonorepo = false;
  const monorepoWorkspaces: string[] = [];

  for (const path of filePaths) {
    if (isNoisePath(path)) {
      noiseFilesCount++;
    }

    const parts = path.split('/');
    if (parts.length > 1) {
      directories.add(parts.slice(0, -1).join('/'));
    }

    // Monorepo detection
    if (path.startsWith('packages/') || path.startsWith('apps/') || path.startsWith('services/')) {
      isMonorepo = true;
      const workspaceName = parts.slice(0, 2).join('/');
      if (!monorepoWorkspaces.includes(workspaceName)) {
        monorepoWorkspaces.push(workspaceName);
      }
    }

    // Language identification
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        languageCounts.set('TypeScript', (languageCounts.get('TypeScript') || 0) + 1);
        break;
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        languageCounts.set('JavaScript', (languageCounts.get('JavaScript') || 0) + 1);
        break;
      case 'py':
        languageCounts.set('Python', (languageCounts.get('Python') || 0) + 1);
        break;
      case 'go':
        languageCounts.set('Go', (languageCounts.get('Go') || 0) + 1);
        break;
      case 'rs':
        languageCounts.set('Rust', (languageCounts.get('Rust') || 0) + 1);
        break;
      case 'java':
        languageCounts.set('Java', (languageCounts.get('Java') || 0) + 1);
        break;
      case 'php':
        languageCounts.set('PHP', (languageCounts.get('PHP') || 0) + 1);
        break;
      case 'rb':
        languageCounts.set('Ruby', (languageCounts.get('Ruby') || 0) + 1);
        break;
      case 'cs':
        languageCounts.set('C#', (languageCounts.get('C#') || 0) + 1);
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c':
      case 'h':
        languageCounts.set('C/C++', (languageCounts.get('C/C++') || 0) + 1);
        break;
      case 'vue':
        languageCounts.set('Vue', (languageCounts.get('Vue') || 0) + 1);
        break;
      case 'svelte':
        languageCounts.set('Svelte', (languageCounts.get('Svelte') || 0) + 1);
        break;
      case 'sql':
        languageCounts.set('SQL', (languageCounts.get('SQL') || 0) + 1);
        break;
      case 'html':
        languageCounts.set('HTML', (languageCounts.get('HTML') || 0) + 1);
        break;
      case 'css':
      case 'scss':
        languageCounts.set('CSS/SCSS', (languageCounts.get('CSS/SCSS') || 0) + 1);
        break;
    }

    // Package manager markers
    if (path.endsWith('pnpm-lock.yaml') || path.endsWith('pnpm-workspace.yaml')) packageManager = 'pnpm';
    else if (path.endsWith('yarn.lock') && !packageManager) packageManager = 'yarn';
    else if (path.endsWith('bun.lockb') || path.endsWith('bun.lock')) packageManager = 'bun';
    else if (path.endsWith('package-lock.json') && !packageManager) packageManager = 'npm';
    else if (path.endsWith('poetry.lock')) packageManager = 'poetry';
    else if (path.endsWith('Pipfile.lock') || path.endsWith('requirements.txt')) packageManager = packageManager || 'pip';
    else if (path.endsWith('Cargo.lock') || path.endsWith('Cargo.toml')) packageManager = 'cargo';
    else if (path.endsWith('go.mod')) packageManager = 'go modules';
  }

  // Inspect package.json or configs for frameworks if contents available
  if (fileContents) {
    const pkgJson = fileContents.get('package.json');
    if (pkgJson) {
      try {
        const parsed = JSON.parse(pkgJson);
        if (parsed.name && inferredName === 'Project') {
          inferredName = parsed.name;
        }
        if (parsed.workspaces) {
          isMonorepo = true;
        }
        const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
        if (allDeps['next']) framework = 'Next.js';
        else if (allDeps['react']) framework = 'React';
        else if (allDeps['vue']) framework = 'Vue';
        else if (allDeps['@nestjs/core']) framework = 'NestJS';
        else if (allDeps['express']) framework = 'Express';
        else if (allDeps['svelte']) framework = 'Svelte';
        else if (allDeps['fastify']) framework = 'Fastify';
      } catch {
        // Ignore JSON parse errors
      }
    }

    const pyProject = fileContents.get('pyproject.toml') || fileContents.get('requirements.txt');
    if (pyProject) {
      if (pyProject.includes('fastapi')) framework = 'FastAPI';
      else if (pyProject.includes('django')) framework = 'Django';
      else if (pyProject.includes('flask')) framework = 'Flask';
    }
  }

  // Calculate language distribution
  const totalLangFiles = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0);
  const languages = Array.from(languageCounts.entries())
    .map(([name, count]) => ({
      name,
      fileCount: count,
      percentage: totalLangFiles > 0 ? Math.round((count / totalLangFiles) * 100) : 0,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  // Determine Project Type description
  let projectType = 'Application';
  if (isMonorepo) projectType = 'Monorepo Workspace';
  else if (framework) projectType = `${framework} Application`;
  else if (languages[0]?.name === 'TypeScript' || languages[0]?.name === 'JavaScript') projectType = 'Node.js / Web Project';
  else if (languages[0]?.name === 'Python') projectType = 'Python Service';
  else if (languages[0]?.name === 'Go') projectType = 'Go Microservice';
  else if (languages[0]?.name === 'Rust') projectType = 'Rust Package';

  return {
    name: inferredName,
    totalFiles: filePaths.length,
    totalDirectories: directories.size,
    languages,
    packageManager,
    framework,
    projectType,
    isMonorepo,
    monorepoWorkspaces,
    noiseFilesCount,
    recommendedExclusions: DEFAULT_EXCLUSION_PATTERNS,
  };
}
