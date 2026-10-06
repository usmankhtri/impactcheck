import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

const NON_CODE_EXTENSIONS = [
  /\.md$/i,
  /\.txt$/i,
  /\.json$/i,
  /\.lock$/i,
  /\.ya?ml$/i,
  /\.css$/i,
  /\.scss$/i,
  /\.svg$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.ico$/i,
];

function isTestFilePath(filePath: string): boolean {
  return /(\.test\.|\.spec\.|__tests__|tests?\/)/i.test(filePath);
}

function getBaseNameWithoutExt(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.[a-zA-Z0-9]+$/, '');
}

export const testRule: Rule = {
  id: 'rule-test-impact',
  name: 'Test Impact & Verification Heuristic',
  category: 'tests',
  description: 'Evaluates whether production code modifications have corresponding test modifications present in the diff.',
  analyze: (
    file: DiffFile,
    allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    // In standalone snapshot mode, diff comparison heuristics for test parity do not apply
    if (mode === 'snapshot') return findings;

    // If this is a test file itself
    if (isTestFilePath(file.newPath) || isTestFilePath(file.oldPath)) {
      if (file.status === 'deleted') {
        findings.push({
          id: `test-file-deleted-${file.id}`,
          ruleId: 'rule-test-impact',
          title: `Test suite or test file removed: ${file.oldPath || file.newPath}`,
          category: 'tests',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Test suite deleted',
          affectedFile: file.oldPath || file.newPath,
          changeSignature: `test:deleted:${file.oldPath || file.newPath}`,
          evidence: {
            filePath: file.oldPath || file.newPath,
            changeType: 'deletion',
            snippet: `${file.deletions} lines deleted in test file`,
          },
          explanation: `Test file "${file.oldPath || file.newPath}" was removed in this changeset. Deleting test coverage can mask regressions in related components.`,
          suggestedAction: 'Confirm whether tests were intentionally retired, consolidated into another test file, or deleted by mistake.',
        });
      }
      return findings;
    }

    // Skip non-code assets
    if (NON_CODE_EXTENSIONS.some((ext) => ext.test(file.newPath))) return findings;

    // Skip config / root dotfiles
    if (/^\.[a-zA-Z0-9]+/.test(file.newPath) || /config\.[a-z0-9]+$/i.test(file.newPath)) {
      return findings;
    }

    // Only inspect files with meaningful line changes or in core service/api folders
    const isCoreCode = /(\/services\/|\/api\/|\/controllers\/|\/utils\/|\/lib\/|\/src\/core\/)/i.test(file.newPath);
    if (!isCoreCode && file.additions + file.deletions < 8) {
      return findings;
    }

    const baseName = getBaseNameWithoutExt(file.newPath);

    // Look for matching test file among all files in the diff
    const matchingTest = allFiles.find((f) => {
      if (!isTestFilePath(f.newPath)) return false;
      return f.newPath.toLowerCase().includes(baseName.toLowerCase());
    });

    if (!matchingTest) {
      findings.push({
        id: `test-unmatched-${file.id}`,
        ruleId: 'rule-test-impact',
        title: `No test change detected for this modified file: ${file.newPath}`,
        category: 'tests',
        priority: 'REVIEW',
        confidence: 'MEDIUM',
        changeType: 'Untested production code modification',
        affectedFile: file.newPath,
        changeSignature: `test:unmatched:${file.newPath}`,
        evidence: {
          filePath: file.newPath,
          changeType: 'modification',
          snippet: `${file.additions} lines added, ${file.deletions} lines removed`,
        },
        explanation: `No corresponding test-file change was detected for this modified file (${file.newPath}) in the analyzed changeset. This is a heuristic based on files included in the analysis.`,
        suggestedAction: 'Verify that existing test suites still pass and assess whether new unit or integration test cases are warranted.',
        limitations: 'Heuristic analyzer only checks files included in this specific diff; existing tests in the main repository may already cover this logic.',
      });
    }

    return findings;
  },
};
