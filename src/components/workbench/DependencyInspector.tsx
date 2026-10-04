import React, { useState } from 'react';
import {
  Package,
  ShieldAlert,
  ShieldCheck,
  Search,
  ExternalLink,
  AlertCircle,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { DependencyChange, OSVAdvisory } from '../../types/dependency';
import { lookupOsvVulnerability } from '../../services/osvService';

interface DependencyInspectorProps {
  dependencies: DependencyChange[];
  onUpdateDependencies?: (deps: DependencyChange[]) => void;
}

export const DependencyInspector: React.FC<DependencyInspectorProps> = ({
  dependencies,
  onUpdateDependencies,
}) => {
  const [depList, setDepList] = useState<DependencyChange[]>(dependencies);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [selectedAdvisory, setSelectedAdvisory] = useState<OSVAdvisory | null>(null);

  // Sync if prop changes
  React.useEffect(() => {
    setDepList(dependencies);
  }, [dependencies]);

  const checkSingleDep = async (dep: DependencyChange) => {
    const versionToCheck = dep.newVersion || dep.oldVersion;
    if (!versionToCheck) return;

    // Set checking status
    setDepList((prev) =>
      prev.map((d) => (d.id === dep.id ? { ...d, osvStatus: 'checking' } : d))
    );

    const result = await lookupOsvVulnerability(dep.name, versionToCheck, dep.ecosystem);

    setDepList((prev) => {
      const updated = prev.map((d) => {
        if (d.id === dep.id) {
          return {
            ...d,
            osvStatus: result.status,
            advisories: result.advisories,
          };
        }
        return d;
      });
      if (onUpdateDependencies) onUpdateDependencies(updated);
      return updated;
    });
  };

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    for (const dep of depList) {
      if (dep.changeType !== 'removed') {
        await checkSingleDep(dep);
      }
    }
    setIsCheckingAll(false);
  };

  if (depList.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400 dark:text-neutral-600">
        No third-party dependency manifests were modified in this diff.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] border-l border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[11px]">
            Dependency Intelligence ({depList.length})
          </span>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Manifest changes & optional public OSV advisory lookup.
          </p>
        </div>

        <button
          onClick={handleCheckAll}
          disabled={isCheckingAll}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isCheckingAll ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking OSV...</span>
            </>
          ) : (
            <>
              <Search className="h-3 w-3" />
              <span>Check All in OSV</span>
            </>
          )}
        </button>
      </div>

      {/* Privacy note */}
      <div className="bg-neutral-50 dark:bg-neutral-900/40 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
        <span>
          OSV queries send only package names and versions. Source code is never sent.
        </span>
      </div>

      {/* Dependency list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {depList.map((dep) => (
          <div
            key={dep.id}
            className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] p-3 space-y-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    {dep.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    {dep.ecosystem}
                  </span>
                  {dep.isMajorBump && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-semibold">
                      Major Bump
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  File: <span className="font-mono">{dep.manifestFile}</span>
                </div>
              </div>

              {/* Version delta badge */}
              <div className="text-right font-mono text-[11px]">
                {dep.changeType === 'added' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    + {dep.newVersion}
                  </span>
                )}
                {dep.changeType === 'removed' && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    - {dep.oldVersion}
                  </span>
                )}
                {dep.changeType === 'updated' && (
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-400 line-through">{dep.oldVersion}</span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {dep.newVersion}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* OSV advisory row */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              <div>
                {dep.osvStatus === 'checking' && (
                  <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Querying OSV database...</span>
                  </span>
                )}
                {dep.osvStatus === 'clean' && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>No matching OSV advisory found</span>
                  </span>
                )}
                {dep.osvStatus === 'advisory_found' && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>
                        {dep.advisories?.length} known advisory found in OSV
                      </span>
                    </span>
                    {dep.advisories && dep.advisories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {dep.advisories.map((adv) => (
                          <button
                            key={adv.id}
                            onClick={() => setSelectedAdvisory(adv)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{adv.id}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {dep.osvStatus === 'error' && (
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Vulnerability lookup unavailable</span>
                  </span>
                )}
                {(!dep.osvStatus || dep.osvStatus === 'idle') && (
                  <span className="text-[11px] text-neutral-400">
                    Vulnerability status unchecked
                  </span>
                )}
              </div>

              {dep.changeType !== 'removed' && (
                <button
                  onClick={() => checkSingleDep(dep)}
                  disabled={dep.osvStatus === 'checking'}
                  className="text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>{dep.osvStatus ? 'Re-check' : 'Check OSV'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Advisory Modal */}
      {selectedAdvisory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400">
                  {selectedAdvisory.id}
                </span>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                  {selectedAdvisory.summary}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAdvisory(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            {selectedAdvisory.details && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-h-48 overflow-y-auto">
                {selectedAdvisory.details}
              </p>
            )}

            {selectedAdvisory.fixedVersions && selectedAdvisory.fixedVersions.length > 0 && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                Fixed in: {selectedAdvisory.fixedVersions.join(', ')}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <a
                href={selectedAdvisory.referenceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
              >
                <span>View on OSV.dev</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                onClick={() => setSelectedAdvisory(null)}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
