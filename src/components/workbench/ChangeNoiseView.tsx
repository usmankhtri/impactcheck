import React from 'react';
import { VolumeX, FileCode, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { analyzeChangeNoise } from '../../utils/changeNoise';
import { DiffFile } from '../../types/diff';

interface ChangeNoiseViewProps {
  files: DiffFile[];
  onSelectFile: (filePath: string) => void;
}

export const ChangeNoiseView: React.FC<ChangeNoiseViewProps> = ({ files, onSelectFile }) => {
  const noise = analyzeChangeNoise(files);

  const totalLines =
    noise.substantiveAdditions +
    noise.substantiveDeletions +
    noise.noiseAdditions +
    noise.noiseDeletions;

  const noisePercentage =
    totalLines > 0
      ? Math.round(((noise.noiseAdditions + noise.noiseDeletions) / totalLines) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] overflow-y-auto p-4 space-y-6">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <VolumeX className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Change Noise & Machine Artifacts
          </h3>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
          Separates machine-generated churn (lockfiles, bundles, build artifacts) from human-written application logic.
        </p>
      </div>

      {/* Noise Ratio Card */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            Changeset Noise Composition
          </span>
          <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
            {noisePercentage}% estimated churn
          </span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-neutral-900 dark:bg-neutral-100 h-full"
            style={{ width: `${100 - noisePercentage}%` }}
            title="Substantive Application Code"
          />
          <div
            className="bg-amber-500 h-full"
            style={{ width: `${noisePercentage}%` }}
            title="Machine Churn / Lockfiles"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <div className="text-[11px] text-neutral-500">Substantive Code</div>
            <div className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {noise.substantiveFiles.length} files (+{noise.substantiveAdditions} / -{noise.substantiveDeletions})
            </div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-500">Machine / Lockfile Churn</div>
            <div className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {noise.noiseFiles.length} files (+{noise.noiseAdditions} / -{noise.noiseDeletions})
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {noise.noiseCategories.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Detected Noise Categories
          </div>
          <div className="space-y-2">
            {noise.noiseCategories.map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-neutral-100">
                  <span>{cat.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {cat.fileCount} files
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtered noise file list */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Noise & Artifact Files ({noise.noiseFiles.length})
        </div>

        {noise.noiseFiles.length === 0 ? (
          <div className="p-4 rounded border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500">
            No machine artifacts or lockfile churn detected. All files represent primary source files.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {noise.noiseFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => onSelectFile(f.newPath)}
                className="w-full p-2.5 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100" />
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 truncate">
                    {f.newPath}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 shrink-0">
                  +{f.additions} / -{f.deletions}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
