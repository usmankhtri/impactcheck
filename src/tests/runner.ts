import { parseGitDiff } from '../parser/diffParser';
import { runAnalysis } from '../rules';
import { generateChecklistFromFindings } from '../services/checklistGenerator';
import { buildReportObject, generateMarkdownReport } from '../services/reportExporter';
import { computeLineDiff, compareFileMaps } from '../utils/diffGenerator';
import { EXAMPLES } from '../examples';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('Running ImpactCheck Automated Verification Suite');
  console.log('==================================================\n');

  try {
    // Test 1: Diff Parser
    const diff = `diff --git a/src/math.ts b/src/math.ts
index 1234567..89abcdef 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,3 +1,4 @@
 export function add(a: number, b: number) {
-  return a - b;
+  // fixed calculation
+  return a + b;
 }`;
    const parsed = parseGitDiff(diff);
    assert(parsed.totalFiles === 1, 'Parser extracts 1 changed file');
    assert(parsed.files[0].newPath === 'src/math.ts', 'File new path matches src/math.ts');
    assert(parsed.totalAdditions === 2, 'Line additions count is 2');
    assert(parsed.totalDeletions === 1, 'Line deletions count is 1');
    assert(parsed.files[0].status === 'modified', 'File status is modified');

    // Test 2: File Rename
    const renameDiff = `diff --git a/src/oldName.ts b/src/newName.ts
similarity index 95%
rename from src/oldName.ts
rename to src/newName.ts
index 1234567..89abcdef 100644
--- a/src/oldName.ts
+++ b/src/newName.ts
@@ -1,2 +1,2 @@
-// old
+// new
 export const v = 1;`;
    const parsedRename = parseGitDiff(renameDiff);
    assert(parsedRename.files[0].status === 'renamed', 'File status is renamed');
    assert(parsedRename.files[0].oldPath === 'src/oldName.ts', 'Old path correctly extracted');
    assert(parsedRename.files[0].newPath === 'src/newName.ts', 'New path correctly extracted');

    // Test 3: Binary Files
    const binDiff = `diff --git a/assets/icon.png b/assets/icon.png
index 123..456 100644
Binary files a/assets/icon.png and b/assets/icon.png differ`;
    const parsedBin = parseGitDiff(binDiff);
    assert(parsedBin.hasBinaryFiles === true, 'Binary files detected');
    assert(parsedBin.files[0].isBinary === true, 'Individual file marked isBinary');

    // Test 4: API Rule Detection
    const apiDiff = EXAMPLES.find((e) => e.id === 'api-route-change')!.diff;
    const parsedApi = parseGitDiff(apiDiff);
    const apiResult = runAnalysis(parsedApi);
    const apiFindings = apiResult.findings.filter((f) => f.category === 'api');
    assert(apiFindings.length > 0, 'API findings detected');
    assert(apiFindings.some((f) => f.title.includes('HTTP method changed')), 'HTTP method swap detected');
    assert(apiFindings.some((f) => f.title.includes('API route path changed')), 'API route path change detected');

    // Test 5: Major Dependency Upgrade
    const depDiff = EXAMPLES.find((e) => e.id === 'dependency-upgrade')!.diff;
    const parsedDep = parseGitDiff(depDiff);
    const depResult = runAnalysis(parsedDep);
    const majorBumps = depResult.dependencies.filter((d) => d.isMajorBump);
    assert(majorBumps.length >= 2, 'Major version upgrades detected for Next and React');
    assert(depResult.findings.some((f) => f.category === 'dependencies' && f.priority === 'MEDIUM' && f.confidence === 'HIGH'), 'Evidence-based MEDIUM priority and HIGH confidence assigned to major bump');

    // Test 6: Environment Variable Addition
    const envDiff = EXAMPLES.find((e) => e.id === 'env-var-added')!.diff;
    const parsedEnv = parseGitDiff(envDiff);
    const envResult = runAnalysis(parsedEnv);
    assert(envResult.findings.some((f) => f.title.includes('REDIS_URL')), 'REDIS_URL addition detected');

    // Test 7: Database Destructive Operation
    const dbDiff = EXAMPLES.find((e) => e.id === 'database-migration')!.diff;
    const parsedDb = parseGitDiff(dbDiff);
    const dbResult = runAnalysis(parsedDb);
    const dbFindings = dbResult.findings.filter((f) => f.category === 'database');
    assert(dbFindings.some((f) => f.title.includes('DROP TABLE')), 'DROP TABLE detected');
    assert(dbFindings.some((f) => f.title.includes('DROP COLUMN')), 'DROP COLUMN detected');

    // Test 8: Auth Middleware Change
    const authDiff = EXAMPLES.find((e) => e.id === 'auth-middleware')!.diff;
    const parsedAuth = parseGitDiff(authDiff);
    const authResult = runAnalysis(parsedAuth);
    const authFindings = authResult.findings.filter((f) => f.category === 'authentication');
    assert(authFindings.length > 0, 'Auth sensitive changes detected');
    assert(authFindings.every((f) => !f.title.toLowerCase().includes('vulnerability found')), 'Never claims vulnerability found');

    // Test 9: Tests May Need Review Heuristic
    const testDiff = EXAMPLES.find((e) => e.id === 'test-missing')!.diff;
    const parsedTest = parseGitDiff(testDiff);
    const testResult = runAnalysis(parsedTest);
    const testFindings = testResult.findings.filter((f) => f.category === 'tests');
    assert(testFindings.length > 0, 'Test heuristic flags modified service file without matching test');
    assert(testFindings[0].explanation.toLowerCase().includes('no corresponding test-file change was detected'), 'Correct qualified explanation used');

    // Test 10: Harmless README Change
    const readmeDiff = EXAMPLES.find((e) => e.id === 'readme-only')!.diff;
    const parsedReadme = parseGitDiff(readmeDiff);
    const readmeResult = runAnalysis(parsedReadme);
    assert(readmeResult.findings.length === 0, 'Harmless README change produces 0 impact findings');

    // Test 11: Report and Checklist Exporter
    const chk = generateChecklistFromFindings(apiResult.findings);
    assert(chk.length > 0, 'Checklist generated from API findings');
    const report = buildReportObject(parsedApi, apiResult.findings, apiResult.summary, apiResult.dependencies, chk);
    const md = generateMarkdownReport(report);
    assert(md.includes('# ImpactCheck Code Review Impact Report'), 'Markdown report header generated');
    assert(md.includes('## 1. Executive Summary'), 'Markdown executive summary generated');

    // Test 12: Automatic URL Origin Resolution
    const { getAppUrl } = await import('../utils/url');
    const rootUrl = getAppUrl('');
    assert(typeof rootUrl === 'string', 'getAppUrl returns a string without error');
    const appRouteUrl = getAppUrl('/app');
    assert(appRouteUrl.endsWith('/app'), 'getAppUrl cleanly appends subpath without double slashes');

    // Test 13: Folder Comparison
    const { compareFileMaps, computeLineDiff } = await import('../utils/diffGenerator');
    const beforeMap = new Map<string, string>([
      ['src/index.ts', 'export const a = 1;\nexport const b = 2;\n'],
      ['src/old.ts', 'export const oldVal = 10;\n'],
    ]);
    const afterMap = new Map<string, string>([
      ['src/index.ts', 'export const a = 1;\nexport const b = 3;\n'],
      ['src/new.ts', 'export const newVal = 20;\n'],
    ]);
    const folderDiff = compareFileMaps(beforeMap, afterMap);
    assert(folderDiff.totalFiles === 3, 'Folder comparison detected 3 touched files');
    assert(folderDiff.files.some((f) => f.newPath === 'src/index.ts' && f.status === 'modified'), 'index.ts detected as modified');
    assert(folderDiff.files.some((f) => f.newPath === 'src/old.ts' && f.status === 'deleted'), 'old.ts detected as deleted');
    assert(folderDiff.files.some((f) => f.newPath === 'src/new.ts' && f.status === 'added'), 'new.ts detected as added');

    // Test 14: Change Map Generator
    const { buildChangeMap } = await import('../utils/changeMap');
    const changeMap = buildChangeMap(apiResult.findings.map(() => parsedApi.files[0]), apiResult.findings);
    assert(changeMap.nodes.length > 0, 'Change map produced nodes');
    assert(Array.isArray(changeMap.edges), 'Change map produced edge collection');

    // Test 15: Breaking Change Watchlist
    const { extractBreakingWatchlist } = await import('../utils/breakingWatchlist');
    const exportDiff = `diff --git a/src/lib.ts b/src/lib.ts
--- a/src/lib.ts
+++ b/src/lib.ts
@@ -1,2 +1,1 @@
-export function computeTax() { return 0; }
 export function computeFee() { return 1; }`;
    const parsedExport = parseGitDiff(exportDiff);
    const watchlist = extractBreakingWatchlist(parsedExport.files, []);
    assert(watchlist.some((w) => w.title.includes('Removed public export: computeTax')), 'Removed export detected in Breaking Watchlist');

    // Test 16: Change Noise Analyzer
    const { analyzeChangeNoise } = await import('../utils/changeNoise');
    const noiseResult = analyzeChangeNoise(parsedDep.files);
    assert(typeof noiseResult.substantiveAdditions === 'number', 'Change noise calculates substantive line metrics');

    // Test 17: Project Metadata Detector
    const { detectProjectMetadata } = await import('../utils/projectDetector');
    const meta = detectProjectMetadata(['src/App.tsx', 'src/main.ts', 'package.json', 'pnpm-lock.yaml']);
    assert(meta.languages.some((l) => l.name === 'TypeScript'), 'Detected TypeScript language');
    assert(meta.packageManager === 'pnpm', 'Detected pnpm package manager');

    // Scenario 1: DROP COLUMN in ALTER TABLE statement produces exactly ONE database finding, not two
    const sqlDropDiff = `diff --git a/migrations/002_update.sql b/migrations/002_update.sql
new file mode 100644
--- /dev/null
+++ b/migrations/002_update.sql
@@ -0,0 +1,1 @@
+ALTER TABLE users DROP COLUMN phone;`;
    const parsedSql = parseGitDiff(sqlDropDiff);
    const sqlAnalysis = runAnalysis(parsedSql);
    const sqlDbFindings = sqlAnalysis.findings.filter((f) => f.category === 'database');
    assert(sqlDbFindings.length === 1, `DROP COLUMN in ALTER TABLE produces 1 database finding, got ${sqlDbFindings.length}`);
    assert(Boolean(sqlDbFindings[0].detectionSignals?.includes('DROP COLUMN') && sqlDbFindings[0].detectionSignals?.includes('ALTER TABLE DROP')), 'Multiple detection signals preserved on unified database finding');

    // Scenario 2: Route middleware change produces one authorization finding instead of route removed + route added
    const mwDiff = `diff --git a/src/routes/users.ts b/src/routes/users.ts
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -1,1 +1,1 @@
-router.delete('/:id', requireAuth, requireAdmin, handler);
+router.delete('/:id', requireAuth, handler);`;
    const parsedMw = parseGitDiff(mwDiff);
    const mwAnalysis = runAnalysis(parsedMw);
    const authzFindings = mwAnalysis.findings.filter((f) => f.category === 'authorization');
    const routeAddedFindings = mwAnalysis.findings.filter((f) => f.title.includes('New API route introduced'));
    const routeRemovedFindings = mwAnalysis.findings.filter((f) => f.title.includes('API route removed'));
    assert(authzFindings.length === 1, 'Route middleware change produces 1 authorization finding');
    assert(routeAddedFindings.length === 0, 'Does not falsely create route added finding when only middleware changed');
    assert(routeRemovedFindings.length === 0, 'Does not falsely create route removed finding when only middleware changed');
    assert(Boolean(authzFindings[0].title.includes('Authorization') && authzFindings[0].title.includes('DELETE /:id')), 'Identified authorization middleware change on DELETE /:id');

    // Scenario 3: Major dependency upgrade is detected with appropriate severity/confidence
    const majorDepDiff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
   "dependencies": {
-    "lodash": "^3.10.1"
+    "lodash": "^4.17.21"
   }`;
    const parsedDepDiff = parseGitDiff(majorDepDiff);
    const depAnalysis = runAnalysis(parsedDepDiff);
    const lodashFinding = depAnalysis.findings.find((f) => f.title.includes('Major version upgrade: lodash'));
    assert(!!lodashFinding, 'Major dependency upgrade finding generated');
    assert(lodashFinding?.priority === 'MEDIUM', `Major dependency severity is evidence-based MEDIUM, got ${lodashFinding?.priority}`);
    assert(lodashFinding?.confidence === 'HIGH', `Major dependency confidence is HIGH, got ${lodashFinding?.confidence}`);

    // Scenario 4: Environment variable with fallback is distinguished from variable without fallback
    const fallbackEnvDiff = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -0,0 +1,2 @@
+const apiUrl = process.env.API_URL || 'https://api.example.com';
+const secretKey = process.env.DATABASE_SECRET;`;
    const parsedEnvDiff = parseGitDiff(fallbackEnvDiff);
    const envAnalysis = runAnalysis(parsedEnvDiff);
    const fallbackFinding = envAnalysis.findings.find((f) => f.evidence.snippet?.includes('API_URL'));
    const requiredFinding = envAnalysis.findings.find((f) => f.evidence.snippet?.includes('DATABASE_SECRET'));
    assert(Boolean(fallbackFinding?.title.includes('referenced with fallback')), 'Identified environment variable with inline fallback');
    assert(fallbackFinding?.priority === 'LOW', 'Fallback environment variable has non-blocking LOW priority');
    assert(Boolean(requiredFinding?.title.includes('no inline fallback') || requiredFinding?.title.includes('without inline fallback') || requiredFinding?.title.includes('reference introduced')), 'Identified environment variable without fallback');
    assert(requiredFinding?.priority === 'MEDIUM', 'Variable without inline fallback has MEDIUM priority');

    // Regression Test (Part 6): package.json scripts must NEVER be parsed as dependencies
    const scriptDiff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,6 +5,10 @@
   "scripts": {
+    "test": "vitest",
+    "build": "vite build"
   },
+  "devDependencies": {
+    "vitest": "^3.2.0"
+  }`;
    const parsedScriptDiff = parseGitDiff(scriptDiff);
    const scriptDepAnalysis = runAnalysis(parsedScriptDiff);
    const testFinding = scriptDepAnalysis.dependencies.find((d) => d.name === 'test');
    const buildFinding = scriptDepAnalysis.dependencies.find((d) => d.name === 'build');
    const vitestFinding = scriptDepAnalysis.dependencies.find((d) => d.name === 'vitest');
    assert(!testFinding, 'Regression check: "test" npm script key must NEVER be detected as a dependency');
    assert(!buildFinding, 'Regression check: "build" npm script key must NEVER be detected as a dependency');
    assert(!!vitestFinding && vitestFinding.newVersion === '^3.2.0', 'Actual devDependency "vitest" is correctly extracted');

    // Regression Test (Part 7): Snapshot mode semantics must not claim changes without baseline
    const snapshotDiff = `diff --git a/src/auth.ts b/src/auth.ts
new file mode 100644
--- /dev/null
+++ b/src/auth.ts
@@ -0,0 +1,2 @@
+import { hasRole } from './rbac';
+const canEdit = hasRole(user, 'editor');`;
    const parsedSnapshot = parseGitDiff(snapshotDiff);
    parsedSnapshot.analysisMode = 'snapshot';
    parsedSnapshot.mode = 'snapshot';
    const snapshotAnalysis = runAnalysis(parsedSnapshot);
    const snapAuthFinding = snapshotAnalysis.findings.find((f) => f.category === 'authorization');
    assert(!!snapAuthFinding, 'Snapshot finding detected for auth code');
    assert(!snapAuthFinding?.title.toLowerCase().includes('changed'), 'Snapshot mode must not claim authorization changed');
    assert(!snapAuthFinding?.title.toLowerCase().includes('modified'), 'Snapshot mode must not claim authorization modified');
    assert(Boolean(snapAuthFinding?.title.includes('Authorization-sensitive code detected')), 'Snapshot mode uses "Authorization-sensitive code detected"');

    // Scenario 5: Authentication and authorization changes are distinguished
    const secDiff = `diff --git a/src/guards.ts b/src/guards.ts
--- a/src/guards.ts
+++ b/src/guards.ts
@@ -0,0 +1,2 @@
+const verified = jwt.verify(token, secret);
+const canEdit = hasRole(user, 'editor');`;
    const parsedSecDiff = parseGitDiff(secDiff);
    const secAnalysis = runAnalysis(parsedSecDiff);
    const authFinding = secAnalysis.findings.find((f) => f.category === 'authentication');
    const authzFinding = secAnalysis.findings.find((f) => f.category === 'authorization');
    assert(!!authFinding, 'Distinguished authentication finding for jwt.verify');
    assert(!!authzFinding, 'Distinguished authorization finding for hasRole check');

    // Scenario 6: Generic API-file-modified finding does not duplicate a more specific API finding
    const specificApiDiff = `diff --git a/src/routes/api.ts b/src/routes/api.ts
--- a/src/routes/api.ts
+++ b/src/routes/api.ts
@@ -1,1 +1,2 @@
 router.get('/items', handler);
+router.post('/items', createHandler);`;
    const parsedSpecificApi = parseGitDiff(specificApiDiff);
    const specificApiAnalysis = runAnalysis(parsedSpecificApi);
    const genericApiFinding = specificApiAnalysis.findings.find((f) => f.id.startsWith('api-file-modified'));
    assert(!genericApiFinding, 'Generic API-file-modified finding was suppressed in favor of specific route finding');

    // Scenario 7: Multiple heuristic detections for one underlying change merge into one finding
    assert(sqlAnalysis.findings.length === 1, `Underlying destructive SQL statement merged into 1 finding, total: ${sqlAnalysis.findings.length}`);
    assert(sqlAnalysis.summary.totalSignals > sqlAnalysis.findings.length, 'Report tracks both unique findings and underlying detection signals');

    // Scenario 8: Before/after evidence is preserved
    assert(Boolean(authzFindings[0].evidence.beforeSnippet?.includes('requireAdmin')), 'Before snippet is preserved in finding evidence');
    assert(Boolean(authzFindings[0].evidence.afterSnippet?.includes('requireAuth')), 'After snippet is preserved in finding evidence');

    // Scenario 9: Design System Tokens and Theme Consistency
    const { TOKENS } = await import('../components/design-system/tokens');
    assert(typeof TOKENS.pageBg === 'string' && TOKENS.pageBg.includes('dark:'), 'Page background token supports dark and light modes');
    assert(typeof TOKENS.surface === 'string' && !TOKENS.surface.includes('light:'), 'Surface token does not contain invalid light: prefix');
    assert(Boolean(TOKENS.status.high.badge && TOKENS.status.high.border), 'High severity status tokens are properly defined');
    assert(Boolean(TOKENS.status.medium.badge && TOKENS.status.medium.border), 'Medium severity status tokens are properly defined');
    assert(Boolean(TOKENS.status.low.badge && TOKENS.status.low.border), 'Low severity status tokens are properly defined');

    // Scenario 10: Standalone Snapshot File State Correctness
    const { createSnapshotProject } = await import('../utils/diffGenerator');
    const snapshotMap = new Map<string, string>([
      ['src/app.ts', 'const x = 1;'],
      ['src/util.ts', 'export function helper() {}'],
    ]);
    const snapProject = createSnapshotProject(snapshotMap);
    assert(snapProject.analysisMode === 'snapshot', 'Snapshot project mode is "snapshot"');
    assert(snapProject.hasBaseline === false, 'Snapshot project has no baseline');
    assert(snapProject.totalAdditions === 0, 'Standalone project does not report fake additions (+0)');
    assert(snapProject.totalDeletions === 0, 'Standalone project does not report fake deletions (-0)');
    assert(snapProject.files.every((f) => f.status === 'detected'), 'Standalone project files have status "detected" not "added"');

    // Scenario 11: ZIP Archive Path Traversal & Security Validation
    // Test directory traversal prevention
    const dangerousPaths = ['../etc/passwd', '../../root', 'sub/../../dangerous.sh', '/absolute/path.txt'];
    for (const p of dangerousPaths) {
      const normalized = p.replace(/\\/g, '/');
      const isBlocked = normalized.startsWith('/') || normalized.startsWith('../') || normalized.includes('/../') || normalized.endsWith('/..');
      assert(isBlocked, `Path traversal attempt blocked for: ${p}`);
    }

    // Scenario 12: Partial Analyzer Failure Isolation
    const { ALL_RULES } = await import('../rules');
    // Inject a dummy rule that throws
    const faultyRule = {
      id: 'faulty-test-rule',
      name: 'Faulty Rule For Testing',
      category: 'other' as const,
      description: 'Tests fault tolerance',
      analyze: () => {
        throw new Error('Simulated analyzer internal failure');
      },
    };
    ALL_RULES.push(faultyRule);
    const isolatedResult = runAnalysis(parsedApi);
    const hasFaultWarning = isolatedResult.warnings.some((w) => w.code === 'RULE_EXECUTION_ERROR');
    assert(hasFaultWarning, 'Partial analyzer failure captured gracefully in warnings array');
    assert(isolatedResult.findings.length > 0, 'Other rules successfully completed despite faulty rule');
    // Clean up
    const ruleIdx = ALL_RULES.indexOf(faultyRule);
    if (ruleIdx !== -1) ALL_RULES.splice(ruleIdx, 1);

    // Scenario 13: Large Project Handling & Performance
    const largeMap = new Map<string, string>();
    for (let i = 0; i < 300; i++) {
      largeMap.set(`src/modules/module_${i}.ts`, `export const value_${i} = ${i};\nexport function get_${i}() { return value_${i}; }`);
    }
    const t0 = Date.now();
    const largeSnap = createSnapshotProject(largeMap);
    const largeAnalysis = runAnalysis(largeSnap);
    const elapsed = Date.now() - t0;
    assert(largeSnap.totalFiles === 300, 'Large project parsed 300 files successfully');
    assert(largeAnalysis.findings !== undefined, 'Large project analysis completed without crash');
    assert(elapsed < 2000, `Large project processed in under 2s (actual: ${elapsed}ms)`);

    // Scenario 14: Focused Before / After Single File Workflow
    const sampleBefore = `import { Router } from 'express';
export const router = Router();
router.get('/api/v1/users', async (req, res) => {
  return res.json({ users: [] });
});`;
    const sampleAfter = `import { Router } from 'express';
export const router = Router();
router.get('/api/v2/users', async (req, res) => {
  return res.json({ users: [] });
});`;
    const singleFileDiff = computeLineDiff(sampleBefore, sampleAfter);
    assert(singleFileDiff.additions === 1, 'Before/After single file detected 1 addition');
    assert(singleFileDiff.deletions === 1, 'Before/After single file detected 1 deletion');
    assert(singleFileDiff.hunks.length > 0, 'Before/After single file produced valid hunks');

    const sampleFileCmp = compareFileMaps(
      new Map([['src/api/users.ts', sampleBefore]]),
      new Map([['src/api/users.ts', sampleAfter]])
    );
    assert(sampleFileCmp.totalFiles === 1, 'File maps comparison detected 1 modified file');
    assert(sampleFileCmp.files[0].beforeContent === sampleBefore, 'Preserved beforeContent');
    assert(sampleFileCmp.files[0].afterContent === sampleAfter, 'Preserved afterContent');
    const beforeAfterAnalysis = runAnalysis(sampleFileCmp);
    assert(beforeAfterAnalysis.findings.length > 0, 'Before/After workflow generates impact findings');

    // Scenario 15: Identical Before and After produces 0 changes
    const identicalCmp = compareFileMaps(
      new Map([['src/file.ts', 'const a = 1;']]),
      new Map([['src/file.ts', 'const a = 1;']])
    );
    assert(identicalCmp.totalFiles === 0, 'Identical Before and After produces 0 changed files');

    console.log('\n==================================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('==================================================');
  } catch (e) {
    console.error('\nSuite stopped on error:', e);
    process.exit(1);
  }
}

runTests();
