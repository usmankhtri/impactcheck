import { DiffFile } from '../types/diff';
import { Finding } from '../types/finding';

export interface ChangeMapNode {
  id: string;
  filePath: string;
  fileName: string;
  category: string;
  layer: 'api' | 'services' | 'database' | 'ui' | 'tests' | 'config' | 'other';
  findingsCount: number;
  additions: number;
  deletions: number;
}

export interface ChangeMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: 'imports' | 'tests' | 'calls' | 'uses_schema' | 'configures';
}

export interface ChangeMapData {
  nodes: ChangeMapNode[];
  edges: ChangeMapEdge[];
  layers: Record<string, ChangeMapNode[]>;
}

function determineLayer(filePath: string): ChangeMapNode['layer'] {
  if (/(api|routes|controllers|endpoints)/i.test(filePath)) return 'api';
  if (/(services|lib|utils|domain|logic)/i.test(filePath)) return 'services';
  if (/(migrations?|schema|models?|db|database|drizzle|prisma)/i.test(filePath)) return 'database';
  if (/(components|views|pages|hooks|styles|ui)/i.test(filePath)) return 'ui';
  if (/(test|spec|__tests__)/i.test(filePath)) return 'tests';
  if (/(config|env|package\.json|docker|\.github)/i.test(filePath)) return 'config';
  return 'other';
}

export function buildChangeMap(files: DiffFile[], findings: Finding[]): ChangeMapData {
  const nodes: ChangeMapNode[] = [];
  const edges: ChangeMapEdge[] = [];
  const nodeMap = new Map<string, ChangeMapNode>();

  for (const file of files) {
    const fileName = file.newPath.split('/').pop() || file.newPath;
    const fileFindings = findings.filter((f) => !f.isDismissed && f.affectedFile === file.newPath);

    const node: ChangeMapNode = {
      id: file.id,
      filePath: file.newPath,
      fileName,
      category: file.status,
      layer: determineLayer(file.newPath),
      findingsCount: fileFindings.length,
      additions: file.additions,
      deletions: file.deletions,
    };

    nodes.push(node);
    nodeMap.set(file.newPath, node);
  }

  // Detect import and dependency references from file hunks
  for (const file of files) {
    const fileContent = file.hunks
      .flatMap((h) => h.lines)
      .map((l) => l.content)
      .join('\n');

    // Test coverage relationships
    if (determineLayer(file.newPath) === 'tests') {
      const baseName = file.newPath
        .split('/')
        .pop()
        ?.replace(/(\.test|\.spec)/, '')
        .replace(/\.[a-zA-Z0-9]+$/, '');

      if (baseName) {
        for (const target of files) {
          if (target.id !== file.id && target.newPath.toLowerCase().includes(baseName.toLowerCase())) {
            edges.push({
              id: `edge-${file.id}-${target.id}`,
              source: file.id,
              target: target.id,
              label: 'Verifies / Tests',
              type: 'tests',
            });
          }
        }
      }
    }

    // Import statement detection
    for (const target of files) {
      if (target.id === file.id) continue;
      const targetBase = target.newPath.split('/').pop()?.replace(/\.[a-zA-Z0-9]+$/, '');
      if (!targetBase || targetBase.length < 3) continue;

      // Check if file imports target
      const importRegex = new RegExp(`['"](?:\\.\\/|\\.\\.\\/|@\\/|~\\/)[^'"]*${targetBase}(?:\\.[a-zA-Z0-9]+)?['"]`, 'i');
      if (importRegex.test(fileContent)) {
        edges.push({
          id: `edge-${file.id}-${target.id}`,
          source: file.id,
          target: target.id,
          label: 'Import relationship',
          type: 'imports',
        });
      }
    }
  }

  // Group by layers
  const layers: Record<string, ChangeMapNode[]> = {
    api: [],
    services: [],
    database: [],
    ui: [],
    tests: [],
    config: [],
    other: [],
  };

  for (const node of nodes) {
    layers[node.layer].push(node);
  }

  return {
    nodes,
    edges,
    layers,
  };
}
