import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

const DB_FILE_PATTERNS = [
  /migrations?\//i,
  /db\/migrate/i,
  /\.sql$/i,
  /schema\.prisma$/i,
  /schema\.ts$/i,
  /schema\.json$/i,
  /drizzle\//i,
  /alembic\//i,
];

interface DestructivePattern {
  pattern: RegExp;
  label: string;
  rank: number; // Higher rank means higher precedence in title
  priority: 'HIGH' | 'MEDIUM';
  description: string;
}

const DESTRUCTIVE_SQL_PATTERNS: DestructivePattern[] = [
  { pattern: /\bDROP\s+TABLE\b/i, label: 'DROP TABLE', rank: 10, priority: 'HIGH', description: 'Destructive table removal' },
  { pattern: /\bTRUNCATE\b/i, label: 'TRUNCATE', rank: 9, priority: 'HIGH', description: 'Data truncation' },
  { pattern: /\bDROP\s+COLUMN\b/i, label: 'DROP COLUMN', rank: 8, priority: 'HIGH', description: 'Column removal' },
  { pattern: /\bALTER\s+TABLE\s+.+?\bDROP\b/i, label: 'ALTER TABLE DROP', rank: 7, priority: 'HIGH', description: 'Schema constraint or column drop' },
  { pattern: /\bDELETE\s+FROM\s+\w+(?!\s+WHERE\b)/i, label: 'DELETE without WHERE', rank: 6, priority: 'HIGH', description: 'Unbounded row deletion' },
  { pattern: /\bALTER\s+COLUMN\b/i, label: 'ALTER COLUMN', rank: 5, priority: 'MEDIUM', description: 'Column type or attribute modification' },
  { pattern: /\bRENAME\s+COLUMN\b/i, label: 'RENAME COLUMN', rank: 4, priority: 'MEDIUM', description: 'Column renaming' },
];

export const databaseRule: Rule = {
  id: 'rule-database-migration',
  name: 'Database Schema & Migration Safety',
  category: 'database',
  description: 'Audits database migrations and SQL schema files for potentially destructive operations with unified signal correlation.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';
    const isDbFile = DB_FILE_PATTERNS.some((pat) => pat.test(file.newPath));
    if (!isDbFile) return findings;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' || line.type === 'detected') {
          const matchedSignals: DestructivePattern[] = [];
          for (const item of DESTRUCTIVE_SQL_PATTERNS) {
            if (item.pattern.test(line.content)) {
              matchedSignals.push(item);
            }
          }

          if (matchedSignals.length > 0) {
            // Sort by rank so the most specific/destructive pattern names the finding
            matchedSignals.sort((a, b) => b.rank - a.rank);
            const primarySignal = matchedSignals[0];
            const signalLabels = matchedSignals.map((s) => s.label);

            const lineNumber = line.newLineNumber || hunk.newStart;

            findings.push({
              id: `db-${file.id}-${lineNumber}-${primarySignal.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              ruleId: 'rule-database-migration',
              title: isSnapshot
                ? `Potentially destructive database statement detected: ${primarySignal.label}`
                : `Potentially destructive database change detected: ${primarySignal.label}`,
              category: 'database',
              priority: primarySignal.priority,
              confidence: 'HIGH',
              changeType: isSnapshot ? 'Destructive schema statement detected' : 'Destructive schema modification',
              affectedFile: file.newPath,
              detectionSignals: signalLabels,
              changeSignature: `db:${file.newPath}:${lineNumber}`,
              evidence: {
                filePath: file.newPath,
                lineNumber,
                snippet: isSnapshot ? line.content.trim() : `${line.type === 'add' ? '+' : ' '} ${line.content.trim()}`,
                changeType: isSnapshot ? 'file_status' : 'addition',
                detectionSignals: signalLabels,
              },
              explanation: isSnapshot
                ? `Statement in ${file.newPath} triggers destructive signals (${signalLabels.join(', ')}). Dropping or truncating tables and columns irreversibly destroys persistent data.`
                : `Migration statement in ${file.newPath} triggers destructive signals (${signalLabels.join(', ')}). Dropping or truncating tables and columns irreversibly destroys persistent data and breaks older application replicas during rolling deployments.`,
              suggestedAction: 'Check migration rollback behavior and ensure a backward-compatible expand-and-contract deployment strategy is followed.',
              limitations: 'Static keyword detection does not establish transaction boundary safety or existence of backup snapshots.',
            });
          }
        }
      }
    }

    // General migration file finding only if NO destructive SQL was flagged on this file (comparison mode only)
    if (!isSnapshot && findings.length === 0 && (file.additions > 0 || file.deletions > 0)) {
      findings.push({
        id: `db-migration-modified-${file.id}`,
        ruleId: 'rule-database-migration',
        title: `Migration file added or modified: ${file.newPath}`,
        category: 'database',
        priority: 'REVIEW',
        confidence: 'HIGH',
        changeType: 'Schema migration file modified',
        affectedFile: file.newPath,
        changeSignature: `db:file:${file.newPath}`,
        evidence: {
          filePath: file.newPath,
          changeType: 'modification',
          snippet: `${file.additions} lines added, ${file.deletions} lines removed`,
        },
        explanation: `Schema migration modified in ${file.newPath}. Migrations alter persistent database tables, indices, and constraints.`,
        suggestedAction: 'Review database migrations with a DBA or peer reviewer before running against staging or production databases.',
      });
    }

    return findings;
  },
};
