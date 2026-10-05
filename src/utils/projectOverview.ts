import { DiffFile } from '../types/diff';
import { DependencyChange } from '../types/dependency';

export interface ProjectOverviewData {
  totalFilesAnalyzed: number;
  totalLinesAnalyzed: number;
  dependenciesCount: number;
  apiRoutesCount: number;
  envVarsCount: number;
  authModulesCount: number;
  databaseMigrationsCount: number;
  testFilesCount: number;
  frontendFilesCount: number;
  configFilesCount: number;
  detectedRoutes?: string[];
  detectedEnvVars?: string[];
  detectedAuthModules?: string[];
  detectedMigrations?: string[];
}

const ROUTE_REGEX = /(?:app|router|server)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]|@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/i;
const ENV_REGEX = /process\.env\.([A-Z0-9_]+)|os\.environ(?:\[|(?:\.get)\()\s*['"]([A-Z0-9_]+)['"]/g;
const AUTH_FILE_PATTERNS = [
  /(\/auth\/|\/middleware\/auth|\/security\/|authService|authController|passport|guards?)/i,
];
const AUTH_KEYWORD_REGEX = /\b(requireAuth|requireAdmin|jwt\.verify|hasRole|passport\.authenticate|authMiddleware|checkAuth|isAuthenticated|requirePermission)\b/;
const DB_FILE_PATTERNS = [
  /(\/migrations?\/|\/schema\/|\.sql$|schema\.prisma|database\.ts|db\.ts)/i,
];
const TEST_FILE_PATTERNS = [
  /\.(test|spec)\.[jt]sx?$/i,
  /\/__tests__\//i,
  /\/tests?\/.*test_.*\.py$/i,
];
const FRONTEND_FILE_PATTERNS = [
  /\.(tsx|jsx|vue|svelte)$/i,
  /\/(?:components|pages|views|client|frontend)\/.*\.[jt]sx?$/i,
];
const CONFIG_FILE_PATTERNS = [
  /(?:vite\.config|next\.config|webpack\.config|tailwind\.config|tsconfig|Dockerfile|docker-compose|\.env)/i,
  /package\.json$/,
];

/**
 * Extracts a high-level Project Overview model across dependencies, API routes,
 * environment variables, security boundaries, database migrations, tests, and frontend areas.
 */
export function extractProjectOverview(
  files: DiffFile[],
  dependencies: DependencyChange[] = []
): ProjectOverviewData {
  const routesSet = new Set<string>();
  const envVarsSet = new Set<string>();
  const authFilesSet = new Set<string>();
  const dbFilesSet = new Set<string>();
  const testFilesSet = new Set<string>();
  const frontendFilesSet = new Set<string>();
  const configFilesSet = new Set<string>();

  let totalLines = 0;

  for (const file of files) {
    const content = file.afterContent || '';
    const lines = content ? content.split(/\r?\n/) : file.hunks.flatMap((h) => h.lines.map((l) => l.content));

    totalLines +=
      file.linesAnalyzed ||
      (lines.length > 0 ? lines.length : file.additions + file.deletions);

    const path = file.newPath;

    // Test files
    if (TEST_FILE_PATTERNS.some((pat) => pat.test(path))) {
      testFilesSet.add(path);
    }

    // Database migration files
    if (DB_FILE_PATTERNS.some((pat) => pat.test(path))) {
      dbFilesSet.add(path);
    }

    // Frontend files
    if (FRONTEND_FILE_PATTERNS.some((pat) => pat.test(path))) {
      frontendFilesSet.add(path);
    }

    // Config files
    if (CONFIG_FILE_PATTERNS.some((pat) => pat.test(path))) {
      configFilesSet.add(path);
    }

    let fileHasAuth = AUTH_FILE_PATTERNS.some((pat) => pat.test(path));

    for (const line of lines) {
      // API routes
      const routeMatch = ROUTE_REGEX.exec(line);
      if (routeMatch) {
        const method = (routeMatch[1] || routeMatch[3] || 'GET').toUpperCase();
        const routePath = routeMatch[2] || routeMatch[4] || '/';
        routesSet.add(`${method} ${routePath}`);
      }

      // Env vars
      ENV_REGEX.lastIndex = 0;
      let envMatch;
      while ((envMatch = ENV_REGEX.exec(line)) !== null) {
        const varName = envMatch[1] || envMatch[2];
        if (varName && varName !== 'NODE_ENV') {
          envVarsSet.add(varName);
        }
      }

      // Auth keywords
      if (!fileHasAuth && AUTH_KEYWORD_REGEX.test(line)) {
        fileHasAuth = true;
      }
    }

    if (fileHasAuth) {
      authFilesSet.add(path);
    }
  }

  let dependenciesCount = dependencies.length;
  if (dependenciesCount === 0) {
    const pkgFile = files.find((f) => f.newPath.endsWith('package.json'));
    if (pkgFile) {
      try {
        const raw =
          pkgFile.afterContent ||
          (pkgFile.hunks ? pkgFile.hunks.flatMap((h) => h.lines.map((l) => l.content)).join('\n') : '');
        if (raw) {
          const parsed = JSON.parse(raw);
          const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
          dependenciesCount = Object.keys(deps).length;
        }
      } catch {
        // Ignore JSON parse error in fallback
      }
    }
  }

  return {
    totalFilesAnalyzed: files.length,
    totalLinesAnalyzed: totalLines,
    dependenciesCount,
    apiRoutesCount: routesSet.size,
    envVarsCount: envVarsSet.size,
    authModulesCount: authFilesSet.size,
    databaseMigrationsCount: dbFilesSet.size,
    testFilesCount: testFilesSet.size,
    frontendFilesCount: frontendFilesSet.size,
    configFilesCount: configFilesSet.size,
    detectedRoutes: Array.from(routesSet),
    detectedEnvVars: Array.from(envVarsSet),
    detectedAuthModules: Array.from(authFilesSet),
    detectedMigrations: Array.from(dbFilesSet),
  };
}
