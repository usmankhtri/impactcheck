import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

export const renameRule: Rule = {
  id: 'rule-file-rename',
  name: 'File Rename & Structural Move',
  category: 'other',
  description: 'Flags renamed or relocated source files that require updating imports and references.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (mode === 'snapshot') return findings;

    if (file.status === 'renamed' || (file.oldPath && file.newPath && file.oldPath !== file.newPath)) {
      findings.push({
        id: `rename-${file.id}`,
        ruleId: 'rule-file-rename',
        title: `File moved or renamed: ${file.oldPath} → ${file.newPath}`,
        category: 'other',
        priority: 'REVIEW',
        confidence: 'HIGH',
        affectedFile: file.newPath,
        evidence: {
          filePath: file.newPath,
          changeType: 'file_rename',
          snippet: `old: ${file.oldPath}\nnew: ${file.newPath}`,
        },
        explanation: `The file was moved or renamed from "${file.oldPath}" to "${file.newPath}". Relocated files often cause broken import statements or stale references if not all call sites were updated.`,
        suggestedAction: 'Check imports, references, tests, package exports, and tooling configuration across the repository.',
      });
    }

    return findings;
  },
};
