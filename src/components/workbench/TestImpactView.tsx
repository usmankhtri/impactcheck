import React from 'react';
import { TestTube2, AlertCircle, CheckCircle, FileCode, ArrowRight } from 'lucide-react';
import { DiffFile } from '../../types/diff';
import { Finding } from '../../types/finding';

interface TestImpactViewProps {
  files: DiffFile[];
  findings: Finding[];
  onSelectFile: (filePath: string) => void;
}

export const TestImpactView: React.FC<TestImpactViewProps> = ({
  files,
  findings,
  onSelectFile,
}) => {
  const testFiles = files.filter(
    (f) => /(\.test\.|\.spec\.|__tests__|tests?\/)/i.test(f.newPath)
  );

  const testFindings = findings.filter(
    (f) => !f.isDismissed && f.category === 'tests'
  );

  const productionCodeWithoutTests = testFindings.map((f) => ({
    filePath: f.affectedFile,
    finding: f,
  }));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] overflow-y-auto p-4 space-y-6">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <TestTube2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Test Impact Analysis
          </h3>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
          Heuristic assessment of test coverage changes and production files modified without corresponding test edits.
        </p>
      </div>

      {/* Tests Changed Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>Test Files Modified in This Diff ({testFiles.length})</span>
          </span>
        </div>

        {testFiles.length === 0 ? (
          <div className="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs text-neutral-500">
            No test files were created or modified in this changeset.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {testFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.newPath)}
                className="w-full p-2.5 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
                  <span className="font-mono truncate text-neutral-800 dark:text-neutral-200">
                    {file.newPath}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>{' '}
                  <span className="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Implementation Changed Without Matching Test Files */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>Production Logic Without Matching Test Edits ({productionCodeWithoutTests.length})</span>
          </span>
        </div>

        {productionCodeWithoutTests.length === 0 ? (
          <div className="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs text-neutral-500">
            All touched core modules appear accompanied by matching test changes in this diff.
          </div>
        ) : (
          <div className="space-y-2">
            {productionCodeWithoutTests.map(({ filePath, finding }) => (
              <div
                key={finding.id}
                className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSelectFile(filePath)}
                    className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 hover:underline flex items-center gap-1"
                  >
                    <span>{filePath}</span>
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                  </button>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                    Review Recommended
                  </span>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-[11px]">
                  {finding.explanation}
                </p>
                <div className="text-[11px] text-neutral-500 italic">
                  Suggested Action: {finding.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500">
        <strong>Note:</strong> Static diff analysis only inspects files included in this changeset. Existing tests already present in the target repository branch may provide full functional coverage.
      </div>
    </div>
  );
};
