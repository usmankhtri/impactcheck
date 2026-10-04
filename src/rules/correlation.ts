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

export function correlateAndDeduplicateFindings(rawFindings: Finding[]): CorrelatedFindingsResult {
  let totalSignals = 0;

  // Count all detection signals
  for (const f of rawFindings) {
    totalSignals += f.detectionSignals && f.detectionSignals.length > 0 ? f.detectionSignals.length : 1;
  }

  // 1. Group findings by affectedFile
  const fileGroups = new Map<string, Finding[]>();
  for (const f of rawFindings) {
    const list = fileGroups.get(f.affectedFile) || [];
    list.push(f);
    fileGroups.set(f.affectedFile, list);
  }

  const mergedFindings: Finding[] = [];

  for (const [filePath, fileFindings] of fileGroups.entries()) {
    // Check if this file has specific findings (non-generic)
    const hasSpecificApiFindings = fileFindings.some(
      (f) => f.ruleId === 'rule-api-endpoint' && !f.id.startsWith('api-file-modified')
    );
    const hasSpecificAuthFindings = fileFindings.some(
      (f) => (f.category === 'authentication' || f.category === 'authorization') && !f.id.startsWith('auth-file-modified')
    );
    const hasSpecificDbFindings = fileFindings.some(
      (f) => f.ruleId === 'rule-database-migration' && !f.id.startsWith('db-migration-modified')
    );

    // Filter out redundant generic file-modified findings when specific findings exist
    const filtered = fileFindings.filter((f) => {
      if (f.id.startsWith('api-file-modified') && hasSpecificApiFindings) {
        return false;
      }
      if (f.id.startsWith('auth-file-modified') && hasSpecificAuthFindings) {
        return false;
      }
      if (f.id.startsWith('db-migration-modified') && hasSpecificDbFindings) {
        return false;
      }
      return true;
    });

    // 2. Identify structured route authorization findings and merge with any keyword auth findings on the same line
    const structuredRouteAuthzLines = new Set<number>();
    for (const f of filtered) {
      if (f.id.startsWith('api-authz-change') || f.id.startsWith('api-middleware-change')) {
        if (f.evidence.lineNumber) {
          structuredRouteAuthzLines.add(f.evidence.lineNumber);
        }
      }
    }

    // Deduplicate statement/line overlaps within the file
    const signatureMap = new Map<string, Finding>();

    for (const f of filtered) {
      let sig = f.changeSignature || `${f.category}:${f.evidence.lineNumber || 0}`;

      // If this is a keyword auth finding on a line that already has a structured route authz change,
      // route it to the structured route signature so they merge!
      if (
        f.ruleId === 'rule-auth-sensitivity' &&
        f.evidence.lineNumber &&
        structuredRouteAuthzLines.has(f.evidence.lineNumber)
      ) {
        // Map to the structured route finding on this line
        const routeFinding = filtered.find(
          (rf) =>
            (rf.id.startsWith('api-authz-change') || rf.id.startsWith('api-middleware-change')) &&
            rf.evidence.lineNumber === f.evidence.lineNumber
        );
        if (routeFinding) {
          sig = routeFinding.changeSignature || sig;
        }
      }

      if (!signatureMap.has(sig)) {
        signatureMap.set(sig, {
          ...f,
          detectionSignals: f.detectionSignals ? [...f.detectionSignals] : [f.title],
          relatedFindingIds: [],
        });
      } else {
        // Merge with existing finding
        const existing = signatureMap.get(sig)!;

        // If new finding has higher priority, adopt its priority/title unless existing is structured route finding
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

        // Merge snippets if before/after are present
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

    mergedFindings.push(...Array.from(signatureMap.values()));
  }

  // 3. Deduplicate package dependencies: if a dep-major exists for package X, suppress dep-added / dep-removed for same package
  const majorDepNames = new Set(
    mergedFindings.filter((f) => f.id.startsWith('dep-major-')).map((f) => f.changeSignature)
  );

  const deduplicated = mergedFindings.filter((f) => {
    if ((f.id.startsWith('dep-added-') || f.id.startsWith('dep-removed-')) && majorDepNames.has(f.changeSignature)) {
      return false;
    }
    return true;
  });

  // 4. Build Relationships between findings
  for (let i = 0; i < deduplicated.length; i++) {
    const fA = deduplicated[i];
    const related: string[] = [];

    for (let j = 0; j < deduplicated.length; j++) {
      if (i === j) continue;
      const fB = deduplicated[j];

      // Related if same file
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
