import { DiffFile } from '../types/diff';
import { Finding } from '../types/finding';

export interface BreakingChangeItem {
  id: string;
  title: string;
  category: 'api' | 'export' | 'database' | 'environment' | 'dependency' | 'interface';
  severity: 'HIGH' | 'MEDIUM';
  affectedFile: string;
  lineNumber?: number;
  snippet?: string;
  description: string;
  remediation: string;
}

export function extractBreakingWatchlist(files: DiffFile[], findings: Finding[]): BreakingChangeItem[] {
  const watchlist: BreakingChangeItem[] = [];

  // 1. Pull from High priority findings
  for (const f of findings) {
    if (f.isDismissed) continue;
    if (f.priority === 'HIGH') {
      let category: BreakingChangeItem['category'] = 'api';
      if (f.category === 'database') category = 'database';
      else if (f.category === 'dependencies') category = 'dependency';
      else if (f.category === 'configuration') category = 'environment';

      watchlist.push({
        id: `watchlist-${f.id}`,
        title: f.title,
        category,
        severity: 'HIGH',
        affectedFile: f.affectedFile,
        lineNumber: f.evidence.lineNumber,
        snippet: f.evidence.snippet,
        description: f.explanation,
        remediation: f.suggestedAction,
      });
    }
  }

  // 2. Detect removed exports in TypeScript/JavaScript files
  const EXPORT_REGEX = /^\s*export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/;

  for (const file of files) {
    if (file.isBinary || file.isLockfile) continue;
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file.newPath)) continue;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'delete') {
          const match = line.content.match(EXPORT_REGEX);
          if (match) {
            const exportName = match[1];
            // Check if it was just re-added in the same hunk
            const wasReAdded = hunk.lines.some(
              (l) => l.type === 'add' && l.content.includes(exportName)
            );

            if (!wasReAdded) {
              watchlist.push({
                id: `watchlist-export-${file.id}-${exportName}`,
                title: `Removed public export: ${exportName}`,
                category: 'export',
                severity: 'HIGH',
                affectedFile: file.newPath,
                lineNumber: line.oldLineNumber || hunk.oldStart,
                snippet: `- ${line.content.trim()}`,
                description: `Export "${exportName}" was removed from ${file.newPath}. External callers or consuming modules importing this identifier will encounter compile or runtime errors.`,
                remediation: `Verify all repository imports of "${exportName}" and deprecate with fallback shim before removal.`,
              });
            }
          }
        }
      }
    }
  }

  return watchlist;
}
