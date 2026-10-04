import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { DependencyChange } from '../../types/dependency';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

function parseSemverMajor(versionStr: string): number | null {
  const clean = versionStr.replace(/^[~^>=<\s]+/, '');
  const match = clean.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const VALID_DEP_SECTIONS = new Set([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]);

const NON_DEP_SECTIONS = new Set([
  'scripts',
  'engines',
  'config',
  'overrides',
  'resolutions',
  'keywords',
  'bugs',
  'directories',
  'repository',
  'publishConfig',
  'os',
  'cpu',
  'packageManager',
  'workspaces',
]);

const SCRIPT_KEYS = new Set([
  'test',
  'build',
  'start',
  'dev',
  'lint',
  'preview',
  'clean',
  'format',
  'check',
  'serve',
  'typecheck',
  'prepare',
  'postinstall',
  'preinstall',
  'prebuild',
  'postbuild',
  'e2e',
]);

// Check if string looks like a valid npm/semver version specifier rather than a shell command
function isValidDependencyVersion(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  // CLI commands have spaces or flags
  if (trimmed.includes(' ') || trimmed.startsWith('-') || trimmed.includes('--')) return false;
  // Common CLI executables
  if (['vitest', 'jest', 'vite', 'tsc', 'eslint', 'prettier', 'rimraf', 'node', 'tsx', 'ts-node', 'next', 'webpack', 'rollup'].includes(trimmed)) {
    return false;
  }
  // Standard version pattern
  if (/^[\^~>=<*v0-9]/.test(trimmed)) return true;
  if (/^(npm:|workspace:|file:|link:|git\+|https?:|github:)/.test(trimmed)) return true;
  if (['latest', 'next', 'beta', 'alpha', 'rc', 'canary', '*'].includes(trimmed)) return true;
  return false;
}

export function extractDependencyChanges(allFiles: DiffFile[], mode: AnalysisMode = 'comparison'): DependencyChange[] {
  const changes: DependencyChange[] = [];
  const isSnapshot = mode === 'snapshot';

  for (const file of allFiles) {
    if (file.newPath.endsWith('package.json')) {
      const addedDeps = new Map<string, { version: string; line: number }>();
      const removedDeps = new Map<string, { version: string; line: number }>();

      // 1. If full beforeContent or afterContent is available, parse JSON structurally
      if (file.afterContent !== undefined || file.beforeContent !== undefined) {
        if (file.beforeContent) {
          try {
            const beforePkg = JSON.parse(file.beforeContent);
            if (beforePkg && typeof beforePkg === 'object') {
              for (const sec of VALID_DEP_SECTIONS) {
                if (beforePkg[sec] && typeof beforePkg[sec] === 'object') {
                  for (const [pkg, ver] of Object.entries(beforePkg[sec])) {
                    if (typeof ver === 'string') {
                      removedDeps.set(pkg, { version: ver, line: 1 });
                    }
                  }
                }
              }
            }
          } catch {
            // Ignore JSON parse errors in beforeContent
          }
        }

        if (file.afterContent) {
          try {
            const afterPkg = JSON.parse(file.afterContent);
            if (afterPkg && typeof afterPkg === 'object') {
              for (const sec of VALID_DEP_SECTIONS) {
                if (afterPkg[sec] && typeof afterPkg[sec] === 'object') {
                  for (const [pkg, ver] of Object.entries(afterPkg[sec])) {
                    if (typeof ver === 'string') {
                      addedDeps.set(pkg, { version: ver, line: 1 });
                    }
                  }
                }
              }
            }
          } catch {
            // Ignore JSON parse errors in afterContent
          }
        }
      } else {
        // 2. Parse hunks line-by-line with strict section tracking
        let currentSection: string | null = null;
        let braceDepth = 0;

        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            const content = line.content;

            // Track section opening: "scripts": { or "dependencies": {
            const secMatch = content.match(/"([^"]+)"\s*:\s*\{/);
            if (secMatch) {
              const secName = secMatch[1];
              currentSection = secName;
              braceDepth++;
              continue;
            }

            // Count opening braces
            if (content.includes('{')) {
              braceDepth++;
            }

            // Count closing braces
            if (content.includes('}')) {
              braceDepth = Math.max(0, braceDepth - 1);
              if (braceDepth === 0) {
                currentSection = null;
              }
            }

            const depMatch = content.match(/"([^"]+)"\s*:\s*"([^"]+)"/);
            if (depMatch) {
              const pkgName = depMatch[1];
              const versionVal = depMatch[2];

              // CRITICAL: If inside a non-dependency section (scripts, engines, config, etc.), NEVER extract as a dependency
              if (currentSection && NON_DEP_SECTIONS.has(currentSection)) {
                continue;
              }

              // CRITICAL: If in scripts or key is a known script name and value is not a semver version, NEVER extract
              if (SCRIPT_KEYS.has(pkgName.toLowerCase()) || !isValidDependencyVersion(versionVal)) {
                continue;
              }

              // Must be inside a valid dependency section or (if section is null) have valid version and non-script key
              const isConfirmedDep = currentSection ? VALID_DEP_SECTIONS.has(currentSection) : isValidDependencyVersion(versionVal);
              if (!isConfirmedDep) continue;

              if (line.type === 'add' || line.type === 'detected') {
                addedDeps.set(pkgName, { version: versionVal, line: line.newLineNumber || hunk.newStart });
              } else if (line.type === 'delete') {
                removedDeps.set(pkgName, { version: versionVal, line: line.oldLineNumber || hunk.oldStart });
              }
            }
          }
        }
      }

      // In snapshot mode, treat all present dependencies as detected observations
      if (isSnapshot) {
        for (const [pkg, addInfo] of addedDeps.entries()) {
          changes.push({
            id: `dep-${pkg}-${addInfo.version}`,
            name: pkg,
            ecosystem: 'npm',
            manifestFile: file.newPath,
            newVersion: addInfo.version,
            changeType: 'detected' as any,
            isMajorBump: false,
            osvStatus: 'idle',
          });
        }
        continue;
      }

      // Check updated deps in comparison / diff mode
      for (const [pkg, addInfo] of addedDeps.entries()) {
        const remInfo = removedDeps.get(pkg);
        if (remInfo) {
          const oldMajor = parseSemverMajor(remInfo.version);
          const newMajor = parseSemverMajor(addInfo.version);
          const isMajor = oldMajor !== null && newMajor !== null && newMajor !== oldMajor;

          changes.push({
            id: `dep-${pkg}-${addInfo.version}`,
            name: pkg,
            ecosystem: 'npm',
            manifestFile: file.newPath,
            oldVersion: remInfo.version,
            newVersion: addInfo.version,
            changeType: 'updated',
            isMajorBump: isMajor,
            osvStatus: 'idle',
          });
        } else {
          changes.push({
            id: `dep-${pkg}-${addInfo.version}`,
            name: pkg,
            ecosystem: 'npm',
            manifestFile: file.newPath,
            newVersion: addInfo.version,
            changeType: 'added',
            isMajorBump: false,
            osvStatus: 'idle',
          });
        }
      }

      for (const [pkg, remInfo] of removedDeps.entries()) {
        if (!addedDeps.has(pkg)) {
          changes.push({
            id: `dep-rem-${pkg}-${remInfo.version}`,
            name: pkg,
            ecosystem: 'npm',
            manifestFile: file.newPath,
            oldVersion: remInfo.version,
            changeType: 'removed',
            isMajorBump: false,
            osvStatus: 'idle',
          });
        }
      }
    } else if (file.newPath.endsWith('requirements.txt')) {
      const reqRegex = /^([a-zA-Z0-9_\-.]+)(?:==|>=|<=|~=)(.+)$/;
      const added = new Map<string, string>();
      const removed = new Map<string, string>();

      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add' || line.type === 'detected') {
            const match = line.content.trim().match(reqRegex);
            if (match) added.set(match[1], match[2]);
          } else if (line.type === 'delete') {
            const match = line.content.trim().match(reqRegex);
            if (match) removed.set(match[1], match[2]);
          }
        }
      }

      if (isSnapshot) {
        for (const [pkg, newVer] of added.entries()) {
          changes.push({
            id: `dep-py-${pkg}-${newVer}`,
            name: pkg,
            ecosystem: 'pypi',
            manifestFile: file.newPath,
            newVersion: newVer,
            changeType: 'detected' as any,
            isMajorBump: false,
            osvStatus: 'idle',
          });
        }
        continue;
      }

      for (const [pkg, newVer] of added.entries()) {
        const oldVer = removed.get(pkg);
        const oldMajor = oldVer ? parseSemverMajor(oldVer) : null;
        const newMajor = parseSemverMajor(newVer);
        const isMajor = oldMajor !== null && newMajor !== null && newMajor !== oldMajor;

        changes.push({
          id: `dep-py-${pkg}-${newVer}`,
          name: pkg,
          ecosystem: 'pypi',
          manifestFile: file.newPath,
          oldVersion: oldVer,
          newVersion: newVer,
          changeType: oldVer ? 'updated' : 'added',
          isMajorBump: isMajor,
          osvStatus: 'idle',
        });
      }

      for (const [pkg, oldVer] of removed.entries()) {
        if (!added.has(pkg)) {
          changes.push({
            id: `dep-py-rem-${pkg}-${oldVer}`,
            name: pkg,
            ecosystem: 'pypi',
            manifestFile: file.newPath,
            oldVersion: oldVer,
            changeType: 'removed',
            isMajorBump: false,
            osvStatus: 'idle',
          });
        }
      }
    }
  }

  return changes;
}

export const dependencyRule: Rule = {
  id: 'rule-dependency-manifest',
  name: 'Dependency Manifest & Version Analysis',
  category: 'dependencies',
  description: 'Audits additions, removals, and major upgrades across package manifests and lockfiles with evidence-based severity.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    const isSnapshot = mode === 'snapshot';

    // Handle lockfiles: summarize instead of thousands of individual lines
    if (file.isLockfile) {
      if (!isSnapshot && (file.additions > 100 || file.deletions > 100)) {
        findings.push({
          id: `lockfile-churn-${file.id}`,
          ruleId: 'rule-dependency-manifest',
          title: `Substantial lockfile churn: ${file.newPath}`,
          category: 'dependencies',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Lockfile churn',
          affectedFile: file.newPath,
          changeSignature: `dep:lock:${file.newPath}`,
          evidence: {
            filePath: file.newPath,
            changeType: 'modification',
            snippet: `+${file.additions} lines / -${file.deletions} lines changed in lockfile`,
          },
          explanation: `High volume lockfile modifications detected. Routine dependency updates, deduplications, or tree resolution changes may have occurred.`,
          suggestedAction: 'Ensure this lockfile was generated automatically by your package manager and corresponds directly to package.json changes.',
        });
      }
      return findings;
    }

    if (!file.newPath.endsWith('package.json') && !file.newPath.endsWith('requirements.txt')) {
      return findings;
    }

    const changes = extractDependencyChanges([file], mode);

    if (isSnapshot) {
      // In snapshot mode, provide contextual dependency findings:
      // If there are many dependencies, provide a grouped summary observation to avoid flooding
      if (changes.length > 5) {
        findings.push({
          id: `dep-manifest-detected-${file.id}`,
          ruleId: 'rule-dependency-manifest',
          title: `Manifest dependencies detected: ${changes.length} packages declared in ${file.newPath}`,
          category: 'dependencies',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Dependencies declared',
          affectedFile: file.newPath,
          changeSignature: `dep:manifest:${file.newPath}`,
          detectionSignals: changes.map((c) => `${c.name}@${c.newVersion || 'latest'}`),
          evidence: {
            filePath: file.newPath,
            changeType: 'file_status',
            snippet: `${changes.length} dependencies declared in ${file.newPath}`,
            detectionSignals: changes.slice(0, 10).map((c) => `${c.name}@${c.newVersion || 'latest'}`),
          },
          explanation: `Project manifest ${file.newPath} declares ${changes.length} dependencies (${changes.slice(0, 5).map((c) => c.name).join(', ')}${changes.length > 5 ? '...' : ''}).`,
          suggestedAction: 'Audit dependencies for security advisories, vulnerability alerts, and licensing compliance.',
        });
      } else {
        for (const change of changes) {
          findings.push({
            id: `dep-detected-${change.name}-${file.id}`,
            ruleId: 'rule-dependency-manifest',
            title: `Dependency detected: ${change.name} (${change.newVersion || 'latest'})`,
            category: 'dependencies',
            priority: 'REVIEW',
            confidence: 'HIGH',
            changeType: 'Declared dependency',
            affectedFile: file.newPath,
            changeSignature: `dep:${change.name}`,
            evidence: {
              filePath: file.newPath,
              changeType: 'file_status',
              snippet: `"${change.name}": "${change.newVersion || 'latest'}"`,
              afterSnippet: `${change.name}@${change.newVersion || 'latest'}`,
            },
            explanation: `Manifest ${file.newPath} declares third-party dependency "${change.name}".`,
            suggestedAction: 'Verify package license, security status, and compatibility with the project runtime.',
          });
        }
      }
      return findings;
    }

    // Comparison / diff mode
    for (const change of changes) {
      if (change.changeType === 'updated' && change.isMajorBump) {
        findings.push({
          id: `dep-major-${change.name}-${file.id}`,
          ruleId: 'rule-dependency-manifest',
          title: `Major version upgrade: ${change.name} (${change.oldVersion} → ${change.newVersion})`,
          category: 'dependencies',
          priority: 'MEDIUM',
          confidence: 'HIGH',
          changeType: 'Major dependency version update',
          affectedFile: file.newPath,
          changeSignature: `dep:${change.name}`,
          detectionSignals: ['Major semver bump', `${change.oldVersion} → ${change.newVersion}`],
          evidence: {
            filePath: file.newPath,
            changeType: 'modification',
            snippet: `- "${change.name}": "${change.oldVersion}"\n+ "${change.name}": "${change.newVersion}"`,
            beforeSnippet: `${change.name}@${change.oldVersion}`,
            afterSnippet: `${change.name}@${change.newVersion}`,
          },
          explanation: `${file.newPath} updates ${change.name} across a major semver boundary (${change.oldVersion} to ${change.newVersion}). Major versions commonly introduce breaking API changes, dropped legacy support, or altered peer dependencies.`,
          suggestedAction: `Consult the upstream changelog or migration guide for ${change.name} and verify application test suites.`,
          limitations: 'Semver assumptions rely on package authors adhering to standard semver conventions.',
        });
      } else if (change.changeType === 'added') {
        findings.push({
          id: `dep-added-${change.name}-${file.id}`,
          ruleId: 'rule-dependency-manifest',
          title: `New dependency added: ${change.name} (${change.newVersion || 'latest'})`,
          category: 'dependencies',
          priority: 'MEDIUM',
          confidence: 'HIGH',
          changeType: 'Dependency added',
          affectedFile: file.newPath,
          changeSignature: `dep:${change.name}`,
          evidence: {
            filePath: file.newPath,
            changeType: 'addition',
            snippet: `+ "${change.name}": "${change.newVersion}"`,
            afterSnippet: `${change.name}@${change.newVersion}`,
          },
          explanation: `Introduces a new third-party dependency "${change.name}" to the project supply chain.`,
          suggestedAction: 'Verify package license compatibility, bundle weight, maintainer activity, and check for known OSV advisories.',
        });
      } else if (change.changeType === 'removed') {
        findings.push({
          id: `dep-removed-${change.name}-${file.id}`,
          ruleId: 'rule-dependency-manifest',
          title: `Dependency removed: ${change.name}`,
          category: 'dependencies',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Dependency removed',
          affectedFile: file.newPath,
          changeSignature: `dep:${change.name}`,
          evidence: {
            filePath: file.newPath,
            changeType: 'deletion',
            snippet: `- "${change.name}": "${change.oldVersion}"`,
            beforeSnippet: `${change.name}@${change.oldVersion}`,
          },
          explanation: `Dependency "${change.name}" was removed from ${file.newPath}.`,
          suggestedAction: 'Ensure no remaining code files, build scripts, or type imports reference this package.',
        });
      }
    }

    return findings;
  },
};
