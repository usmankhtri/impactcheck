import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

const CONFIG_PATTERNS = [
  { pattern: /^\.github\/workflows\//, label: 'GitHub Actions workflow pipeline' },
  { pattern: /Dockerfile|docker-compose/i, label: 'Containerization / Docker setup' },
  { pattern: /tsconfig(?:\.[a-z0-9]+)?\.json$/i, label: 'TypeScript compiler configuration' },
  { pattern: /vite\.config|webpack\.config|rollup\.config|next\.config/i, label: 'Build bundler configuration' },
  { pattern: /eslint|\.prettier/i, label: 'Linter or code formatting rules' },
  { pattern: /nginx|caddy|apache/i, label: 'Web server or reverse proxy configuration' },
];

export const configRule: Rule = {
  id: 'rule-config-impact',
  name: 'Build, CI/CD & Infrastructure Configuration',
  category: 'configuration',
  description: 'Audits changes to CI workflows, build bundlers, containers, and deployment scripts.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';

    for (const item of CONFIG_PATTERNS) {
      if (item.pattern.test(file.newPath)) {
        findings.push({
          id: `config-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${file.id}`,
          ruleId: 'rule-config-impact',
          title: isSnapshot ? `Configuration file detected: ${item.label}` : `Configuration change: ${item.label}`,
          category: 'configuration',
          priority: 'REVIEW',
          confidence: 'HIGH',
          affectedFile: file.newPath,
          evidence: {
            filePath: file.newPath,
            changeType: isSnapshot ? 'file_status' : 'modification',
            snippet: isSnapshot ? file.newPath : `${file.additions} lines added, ${file.deletions} lines removed`,
          },
          explanation: isSnapshot
            ? `${file.newPath} provides ${item.label.toLowerCase()}.`
            : `Modifications in ${file.newPath} alter ${item.label.toLowerCase()}. Changes here can affect build targets, environment injection, or CI pipeline pass/fail status.`,
          suggestedAction: 'Verify that CI pipelines trigger properly, build output assets are generated, and production deployment targets are unaffected.',
        });
        break;
      }
    }

    // Check package.json scripts changes ONLY when comparing against a baseline (comparison mode)
    if (!isSnapshot && file.newPath.endsWith('package.json')) {
      let scriptChanged = false;
      let lineNum = 1;
      let snippet = '';

      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add' || line.type === 'delete') {
            if (/scripts\s*":|"(?:build|start|dev|test|deploy|prepare)"\s*:/.test(line.content)) {
              scriptChanged = true;
              lineNum = line.newLineNumber || line.oldLineNumber || hunk.newStart;
              snippet = `${line.type === 'add' ? '+' : '-'} ${line.content.trim()}`;
              break;
            }
          }
        }
        if (scriptChanged) break;
      }

      if (scriptChanged) {
        findings.push({
          id: `pkg-scripts-changed-${file.id}-${lineNum}`,
          ruleId: 'rule-config-impact',
          title: 'Package script altered',
          category: 'configuration',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Package script modified',
          affectedFile: file.newPath,
          evidence: {
            filePath: file.newPath,
            lineNumber: lineNum,
            snippet,
            changeType: 'modification',
          },
          explanation: `A build, test, or lifecycle script in ${file.newPath} was altered. This directly influences local development command execution and automated CI/CD runners.`,
          suggestedAction: 'Verify the script behavior locally and test CI/CD pipeline compatibility.',
        });
      }
    }

    return findings;
  },
};
