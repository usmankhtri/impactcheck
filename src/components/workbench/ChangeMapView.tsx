import React from 'react';
import { Network, ArrowRight, Layers, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ChangeMapData, ChangeMapNode } from '../../utils/changeMap';

interface ChangeMapViewProps {
  changeMap: ChangeMapData;
  onSelectFile: (filePath: string) => void;
}

export const ChangeMapView: React.FC<ChangeMapViewProps> = ({ changeMap, onSelectFile }) => {
  const layerOrder = ['api', 'services', 'database', 'ui', 'tests', 'config', 'other'] as const;

  const layerTitles: Record<string, string> = {
    api: 'API & Routing Layer',
    services: 'Services & Business Logic',
    database: 'Data & Persistence',
    ui: 'Components & UI State',
    tests: 'Tests & Verification',
    config: 'Build & Environment Configuration',
    other: 'General Files',
  };

  if (changeMap.nodes.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        No files available to map relationships.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0e12] overflow-y-auto p-4 space-y-6">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            System Change Map
          </h3>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
          Statically mapped import and verification relationships across touched architectural boundaries.
        </p>
      </div>

      {/* Detected Relationships Summary */}
      {changeMap.edges.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 p-3.5 space-y-2">
          <div className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            Direct Cross-File Connections ({changeMap.edges.length})
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            {changeMap.edges.map((edge) => {
              const srcNode = changeMap.nodes.find((n) => n.id === edge.source);
              const tgtNode = changeMap.nodes.find((n) => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              return (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-white dark:bg-[#14171d] border border-neutral-200 dark:border-neutral-800 text-[11px]"
                >
                  <button
                    onClick={() => onSelectFile(srcNode.filePath)}
                    className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline truncate max-w-[140px]"
                  >
                    {srcNode.fileName}
                  </button>
                  <div className="text-neutral-400 flex items-center gap-1 text-[10px] shrink-0 font-sans">
                    <ArrowRight className="h-3 w-3" />
                    <span>{edge.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <button
                    onClick={() => onSelectFile(tgtNode.filePath)}
                    className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline truncate max-w-[140px]"
                  >
                    {tgtNode.fileName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Layer-by-layer architectural clusters */}
      <div className="space-y-4">
        {layerOrder.map((layerKey) => {
          const layerNodes = changeMap.layers[layerKey];
          if (!layerNodes || layerNodes.length === 0) return null;

          return (
            <div key={layerKey} className="space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-neutral-100 dark:border-neutral-800/80 pb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{layerTitles[layerKey]}</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {layerNodes.length} {layerNodes.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {layerNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => onSelectFile(node.filePath)}
                    className="text-left p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-[#111419] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:underline truncate">
                        {node.fileName}
                      </span>
                      {node.findingsCount > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shrink-0">
                          {node.findingsCount} findings
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                      {node.filePath}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-neutral-500">
                      <span className="text-emerald-600 dark:text-emerald-400">+{node.additions}</span>
                      <span className="text-rose-600 dark:text-rose-400">-{node.deletions}</span>
                      <span>·</span>
                      <span className="uppercase">{node.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
