import { Finding, FindingPriority } from '../types/finding';

const PRIORITY_ORDER: Record<FindingPriority, number> = {
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  REVIEW: 1,
};

export interface CorrelatedFindingsResult {
  uniqueFindings: Finding[];
  totalSignals: number;
}

/**
 * Multi-stage architectural finding deduplication:
 * Raw signals -> Normalization -> Correlation -> Semantic change inference -> Deduplication -> Final findings
 */
export function correlateAndDeduplicateFindings(rawFindings: Finding[]): CorrelatedFindingsResult {
  let totalSignals = 0;

  // 1. RAW SIGNALS COUNTING
  for (const f of rawFindings) {
    totalSignals += f.detectionSignals && f.detectionSignals.length > 0 ? f.detectionSignals.length : 1;
  }

  // 2. NORMALIZATION & FILE GROUPING
  const fileGroups = new Map<string, Finding[]>();
  for (const f of rawFindings) {
    const list = fileGroups.get(f.affectedFile) || [];
    list.push(f);
    fileGroups.set(f.affectedFile, list);
  }

  const finalFindings: Finding[] = [];

  for (const [, fileFindings] of fileGroups.entries()) {
    // 3. SEMANTIC CHANGE INFERENCE & HIERARCHICAL FILTERING

    // Check specific detection presence in this file
    const specificRouteAuthFindings = fileFindings.filter(
      (f) => (f.id.startsWith('api-authz-change') || f.id.startsWith('api-middleware-change'))
    );
    const hasSpecificApiFindings = fileFindings.some(
      (f) => f.ruleId === 'rule-api-endpoint' && !f.id.startsWith('api-file-modified')
    );
    const hasSpecificAuthFindings = fileFindings.some(
      (f) => (f.category === 'authentication' || f.category === 'authorization') && !f.id.startsWith('auth-file-modified')
    );
    const hasSpecificDbFindings = fileFindings.some(
      (f) => f.ruleId === 'rule-database-migration' && !f.id.startsWith('db-migration-modified')
    );

    // Suppress coarse generic file-level findings when specific findings exist
    let candidates = fileFindings.filter((f) => {
      if (f.id.startsWith('api-file-modified') && hasSpecificApiFindings) return false;
      if (f.id.startsWith('auth-file-modified') && hasSpecificAuthFindings) return false;
      if (f.id.startsWith('db-migration-modified') && hasSpecificDbFindings) return false;
      return true;
    });

    // 4. CORRELATE ROUTE AUTHORIZATION CHANGES WITH LOW-LEVEL AUTH SIGNALS
    // When a specific route authorization change exists (e.g. DELETE /:id with requireAdmin removed),
    // low-level keyword detections in the same file (such as import line removal of requireAdmin or
    // pattern matches for the same guard) are detection signals of the same semantic change.
    if (specificRouteAuthFindings.length > 0) {
      // Collect all guards/middleware mentioned across route auth findings in this file
      const routeGuards = new Set<string>();
      for (const rf of specificRouteAuthFindings) {
        if (rf.detectionSignals) {
          for (const s of rf.detectionSignals) {
            routeGuards.add(s.toLowerCase());
          }
        }
      }

      candidates = candidates.filter((f) => {
        // If this is a keyword auth sensitivity finding
        if (f.ruleId === 'rule-auth-sensitivity') {
          const isImportStatement = /^\s*[-+]?\s*(import\b|const\s+.*=\s*require\b)/i.test(f.evidence.snippet || '');

          // Check if this finding's signals match any route guard or if it's on an import statement
          const matchesRouteGuard = f.detectionSignals?.some((sig) => {
            const sigLower = sig.toLowerCase();
            for (const rg of routeGuards) {
              if (sigLower.includes(rg) || rg.includes(sigLower)) return true;
            }
            return false;
          });

          // Check if snippet references any route guard
          const snippetMatchesRouteGuard = f.evidence.snippet && Array.from(routeGuards).some((rg) =>
            f.evidence.snippet!.toLowerCase().includes(rg)
          );

          if (isImportStatement || matchesRouteGuard || snippetMatchesRouteGuard) {
            // Correlate into the relevant route auth finding
            const targetRoute = specificRouteAuthFindings[0];
            const existingSignals = new Set(targetRoute.detectionSignals || []);
            if (f.detectionSignals) {
              for (const s of f.detectionSignals) existingSignals.add(s);
            } else {
              existingSignals.add(f.title);
            }
            targetRoute.detectionSignals = Array.from(existingSignals);
            return false; // Subsume generic signal finding
          }
        }
        return true;
      });
    }

    // 5. CORRELATE IMPORT-LEVEL AUTH SIGNALS WITH LOGICAL AUTH USAGE IN THE SAME FILE
    // If a file has an import line auth finding and a body usage auth finding for the same guard
    const authFindingsInFile = candidates.filter((f) => f.ruleId === 'rule-auth-sensitivity');
    if (authFindingsInFile.length > 1) {
      const nonImportAuthFindings = authFindingsInFile.filter(
        (f) => !/^\s*[-+]?\s*(import\b|const\s+.*=\s*require\b)/i.test(f.evidence.snippet || '')
      );
      if (nonImportAuthFindings.length > 0) {
        // Subsume import-only findings into the primary body finding
        candidates = candidates.filter((f) => {
          if (f.ruleId === 'rule-auth-sensitivity') {
            const isImport = /^\s*[-+]?\s*(import\b|const\s+.*=\s*require\b)/i.test(f.evidence.snippet || '');
            if (isImport) {
              const primary = nonImportAuthFindings[0];
              const sigs = new Set(primary.detectionSignals || []);
              if (f.detectionSignals) {
                for (const s of f.detectionSignals) sigs.add(s);
              }
              primary.detectionSignals = Array.from(sigs);
              return false;
            }
          }
          return true;
        });
      }
    }

    // 6. DEDUPLICATE MULTI-LINE / STATEMENT-LEVEL DATABASE MIGRATION FINDINGS
    // If a multi-line SQL statement spans across lines without a semicolon break, merge into 1 finding.
    const dbFindingsInFile = candidates.filter((f) => f.ruleId === 'rule-database-migration');
    if (dbFindingsInFile.length > 1) {
      const toRemove = new Set<string>();

      for (let i = 0; i < dbFindingsInFile.length; i++) {
        const f1 = dbFindingsInFile[i];
        if (toRemove.has(f1.id)) continue;

        for (let j = i + 1; j < dbFindingsInFile.length; j++) {
          const f2 = dbFindingsInFile[j];
          if (toRemove.has(f2.id)) continue;

          const line1 = f1.evidence.lineNumber || 0;
          const line2 = f2.evidence.lineNumber || 0;

          // Merge if same line, or if line1 does not terminate with semicolon and is adjacent
          const f1Snippet = f1.evidence.snippet || '';
          const isSameStatement = line1 === line2 || (!f1Snippet.includes(';') && Math.abs(line1 - line2) <= 1);

          if (isSameStatement) {
            const primary = PRIORITY_ORDER[f1.priority] >= PRIORITY_ORDER[f2.priority] ? f1 : f2;
            const secondary = primary === f1 ? f2 : f1;

            const sigs = new Set(primary.detectionSignals || []);
            if (secondary.detectionSignals) {
              for (const s of secondary.detectionSignals) sigs.add(s);
            } else {
              sigs.add(secondary.title);
            }
            primary.detectionSignals = Array.from(sigs);
            toRemove.add(secondary.id);
          }
        }
      }

      if (toRemove.size > 0) {
        candidates = candidates.filter((f) => !toRemove.has(f.id));
      }
    }

    // 7. LINE & SIGNATURE DEDUPLICATION WITHIN THE FILE
    const signatureMap = new Map<string, Finding>();

    for (const f of candidates) {
      const sig = f.changeSignature || `${f.category}:${f.evidence.lineNumber || 0}`;

      if (!signatureMap.has(sig)) {
        signatureMap.set(sig, {
          ...f,
          detectionSignals: f.detectionSignals ? [...f.detectionSignals] : [f.title],
          relatedFindingIds: [],
        });
      } else {
        const existing = signatureMap.get(sig)!;

        // Adopt higher priority or more specific title
        if (
          PRIORITY_ORDER[f.priority] > PRIORITY_ORDER[existing.priority] &&
          !existing.id.startsWith('api-authz-change')
        ) {
          existing.priority = f.priority;
          existing.title = f.title;
          existing.explanation = f.explanation;
          existing.suggestedAction = f.suggestedAction;
          existing.category = f.category;
          existing.changeType = f.changeType || existing.changeType;
        }

        // Merge snippets
        if (f.evidence.beforeSnippet && !existing.evidence.beforeSnippet) {
          existing.evidence.beforeSnippet = f.evidence.beforeSnippet;
        }
        if (f.evidence.afterSnippet && !existing.evidence.afterSnippet) {
          existing.evidence.afterSnippet = f.evidence.afterSnippet;
        }

        // Merge detection signals
        const signals = new Set(existing.detectionSignals || []);
        if (f.detectionSignals) {
          for (const s of f.detectionSignals) signals.add(s);
        } else {
          signals.add(f.title);
        }
        existing.detectionSignals = Array.from(signals);
      }
    }

    finalFindings.push(...Array.from(signatureMap.values()));
  }

  // 8. DEDUPLICATE PACKAGE DEPENDENCIES (1 finding per package)
  const majorDepNames = new Set(
    finalFindings.filter((f) => f.id.startsWith('dep-major-')).map((f) => f.changeSignature)
  );

  const deduplicated = finalFindings.filter((f) => {
    if ((f.id.startsWith('dep-added-') || f.id.startsWith('dep-removed-')) && majorDepNames.has(f.changeSignature)) {
      return false;
    }
    return true;
  });

  // 9. BUILD RELATIONSHIPS (for internal context, not for report noise)
  for (let i = 0; i < deduplicated.length; i++) {
    const fA = deduplicated[i];
    const related: string[] = [];

    for (let j = 0; j < deduplicated.length; j++) {
      if (i === j) continue;
      const fB = deduplicated[j];
      if (fA.affectedFile === fB.affectedFile) {
        related.push(fB.id);
      }
    }

    fA.relatedFindingIds = related;
  }

  return {
    uniqueFindings: deduplicated,
    totalSignals,
  };
}
