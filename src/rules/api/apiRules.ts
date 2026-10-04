import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

interface StructuredRoute {
  method: string;
  path: string;
  middleware: string[];
  rawLine: string;
  lineNumber: number;
}

// Router matching patterns (Express, Fastify, Next.js, Flask, Django, Spring)
const ROUTE_LINE_REGEX =
  /(?:router|app|api|server|route)\s*\.\s*(get|post|put|delete|patch|all|options|head)\s*\(\s*(['"`][^'"`]+['"`])\s*(?:,\s*([^)]+))?\)/i;

const PYTHON_ROUTE_REGEX =
  /@(?:app|api|router)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*(['"`][^'"`]+['"`])(?:\s*,\s*([^)]+))?\)/i;

const DJANGO_PATH_REGEX =
  /(?:path|re_path)\s*\(\s*(['"`][^'"`]+['"`])\s*,\s*([^,\s)]+)/i;

function cleanPathString(raw: string): string {
  return raw.replace(/['"`]/g, '').trim();
}

function parseMiddlewareTokens(argsStr?: string): string[] {
  if (!argsStr) return [];
  const tokens = argsStr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // The last token in express router.(method, path, ...middleware, handler) is usually the handler
  if (tokens.length > 1) {
    return tokens.slice(0, -1);
  }
  return [];
}

export function parseStructuredRoute(lineContent: string, lineNumber: number, _filePath?: string): StructuredRoute | null {
  const trimmed = lineContent.trim();

  // Express / Fastify / Node
  const expressMatch = trimmed.match(ROUTE_LINE_REGEX);
  if (expressMatch) {
    return {
      method: expressMatch[1].toUpperCase(),
      path: cleanPathString(expressMatch[2]),
      middleware: parseMiddlewareTokens(expressMatch[3]),
      rawLine: trimmed,
      lineNumber,
    };
  }

  // Python FastAPI / Flask
  const pyMatch = trimmed.match(PYTHON_ROUTE_REGEX);
  if (pyMatch) {
    return {
      method: pyMatch[1].toUpperCase(),
      path: cleanPathString(pyMatch[2]),
      middleware: parseMiddlewareTokens(pyMatch[3]),
      rawLine: trimmed,
      lineNumber,
    };
  }

  // Django urls
  const djangoMatch = trimmed.match(DJANGO_PATH_REGEX);
  if (djangoMatch) {
    return {
      method: 'ROUTE',
      path: cleanPathString(djangoMatch[1]),
      middleware: [],
      rawLine: trimmed,
      lineNumber,
    };
  }

  return null;
}

const AUTH_MIDDLEWARE_REGEX = /(auth|admin|permission|role|guard|token|jwt|session|protect)/i;

export const apiRule: Rule = {
  id: 'rule-api-endpoint',
  name: 'API Route & Interface Detection',
  category: 'api',
  description: 'Analyzes changes to API routes, endpoints, HTTP methods, and middleware contracts with structured route comparison.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';
    const isApiFile = /(\/api\/|\/routes\/|\/controllers\/|\/endpoints\/|route\.ts|route\.js|server\.ts|server\.js|app\.py|api\.py)/i.test(
      file.newPath
    );

    const addedRoutes: StructuredRoute[] = [];
    const removedRoutes: StructuredRoute[] = [];

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' || line.type === 'detected') {
          const parsed = parseStructuredRoute(line.content, line.newLineNumber || hunk.newStart, file.newPath);
          if (parsed) addedRoutes.push(parsed);
        } else if (line.type === 'delete') {
          const parsed = parseStructuredRoute(line.content, line.oldLineNumber || hunk.oldStart, file.oldPath);
          if (parsed) removedRoutes.push(parsed);
        }
      }
    }

    // ==========================================
    // SNAPSHOT MODE: Pure observations without baseline
    // ==========================================
    if (isSnapshot) {
      for (const route of addedRoutes) {
        const hasAuthMw = route.middleware.some((m) => AUTH_MIDDLEWARE_REGEX.test(m));
        let explanation: string;
        if (route.middleware.length > 0) {
          explanation = hasAuthMw
            ? `Router endpoint "${route.method} ${route.path}" detected with security middleware (${route.middleware.join(', ')}). Access is guarded by declared middleware.`
            : `Router endpoint "${route.method} ${route.path}" detected with middleware (${route.middleware.join(', ')}).`;
        } else {
          explanation = `Router endpoint "${route.method} ${route.path}" detected without route-level middleware declarations.`;
        }

        findings.push({
          id: `api-snapshot-${file.id}-${route.method}-${route.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          ruleId: 'rule-api-endpoint',
          title: `Router endpoint detected: ${route.method} ${route.path}`,
          category: hasAuthMw ? 'authorization' : 'api',
          priority: 'MEDIUM',
          confidence: 'HIGH',
          changeType: 'Router endpoint detected',
          affectedFile: file.newPath,
          changeSignature: `api:route:${route.method}:${route.path}`,
          detectionSignals: route.middleware.length > 0 ? route.middleware : undefined,
          evidence: {
            filePath: file.newPath,
            lineNumber: route.lineNumber,
            snippet: route.rawLine,
            afterSnippet: `${route.method} ${route.path}`,
            changeType: 'file_status',
            detectionSignals: [
              `HTTP Method: ${route.method}`,
              `Router-local path: ${route.path}`,
              ...(route.middleware.length > 0 ? [`Middleware: ${route.middleware.join(', ')}`] : []),
            ],
          },
          explanation,
          suggestedAction: 'Verify endpoint request validation, authentication expectations, and OpenAPI documentation.',
        });
      }
      return findings;
    }

    // ==========================================
    // COMPARISON / DIFF MODE: Real historical differences
    // ==========================================
    const pairedRemoved = new Set<number>();
    const pairedAdded = new Set<number>();

    // 1. Identify routes with identical method and path where MIDDLEWARE changed
    for (let rIdx = 0; rIdx < removedRoutes.length; rIdx++) {
      const rem = removedRoutes[rIdx];
      for (let aIdx = 0; aIdx < addedRoutes.length; aIdx++) {
        if (pairedAdded.has(aIdx)) continue;
        const add = addedRoutes[aIdx];

        if (rem.path === add.path && rem.method === add.method) {
          pairedRemoved.add(rIdx);
          pairedAdded.add(aIdx);

          const remMidStr = rem.middleware.join(', ');
          const addMidStr = add.middleware.join(', ');

          if (remMidStr !== addMidStr) {
            const removedAuthMiddleware = rem.middleware.filter(
              (m) => !add.middleware.includes(m) && AUTH_MIDDLEWARE_REGEX.test(m)
            );

            if (removedAuthMiddleware.length > 0) {
              findings.push({
                id: `api-authz-change-${file.id}-${add.method}-${add.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                ruleId: 'rule-api-endpoint',
                title: `Authorization requirement changed: ${add.method} ${add.path}`,
                category: 'authorization',
                priority: 'HIGH',
                confidence: 'HIGH',
                changeType: 'Authorization requirement changed',
                affectedFile: file.newPath,
                changeSignature: `api:authz:${add.method}:${add.path}`,
                detectionSignals: ['Middleware removed', ...removedAuthMiddleware],
                evidence: {
                  filePath: file.newPath,
                  lineNumber: add.lineNumber,
                  snippet: `- ${rem.rawLine}\n+ ${add.rawLine}`,
                  beforeSnippet: remMidStr || 'none',
                  afterSnippet: addMidStr || 'none',
                  changeType: 'modification',
                  detectionSignals: [
                    `Before middleware: ${remMidStr || 'none'}`,
                    `After middleware: ${addMidStr || 'none'}`,
                    ...removedAuthMiddleware,
                  ],
                },
                explanation: `The router endpoint ${add.method} ${add.path} remains present, but authorization middleware was removed (${removedAuthMiddleware.join(', ')}). Review whether access that was previously restricted is now exposed.`,
                suggestedAction: `Confirm intentional permission changes for ${add.method} ${add.path}. Ensure non-privileged users cannot access privileged operations.`,
                limitations: 'Static route parsing evaluates declared route middleware sequence without executing nested router pipelines.',
              });
            } else {
              // General middleware modification
              findings.push({
                id: `api-middleware-change-${file.id}-${add.method}-${add.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                ruleId: 'rule-api-endpoint',
                title: `Middleware modified on ${add.method} ${add.path}`,
                category: 'api',
                priority: 'MEDIUM',
                confidence: 'HIGH',
                changeType: 'Route middleware modified',
                affectedFile: file.newPath,
                changeSignature: `api:mid:${add.method}:${add.path}`,
                detectionSignals: add.middleware.length > 0 ? add.middleware : undefined,
                evidence: {
                  filePath: file.newPath,
                  lineNumber: add.lineNumber,
                  snippet: `- ${rem.rawLine}\n+ ${add.rawLine}`,
                  beforeSnippet: remMidStr || 'none',
                  afterSnippet: addMidStr || 'none',
                  changeType: 'modification',
                  detectionSignals: add.middleware.length > 0 ? add.middleware : undefined,
                },
                explanation: `Middleware pipeline changed for ${add.method} ${add.path}. Before: [${remMidStr || 'none'}], After: [${addMidStr || 'none'}].`,
                suggestedAction: 'Verify request validation, error interceptors, and CORS/logging middleware behavior.',
              });
            }
          }
        }
      }
    }

    // 2. Identify routes with identical path where HTTP METHOD changed
    for (let rIdx = 0; rIdx < removedRoutes.length; rIdx++) {
      if (pairedRemoved.has(rIdx)) continue;
      const rem = removedRoutes[rIdx];

      for (let aIdx = 0; aIdx < addedRoutes.length; aIdx++) {
        if (pairedAdded.has(aIdx)) continue;
        const add = addedRoutes[aIdx];

        if (rem.path === add.path && rem.method !== add.method) {
          pairedRemoved.add(rIdx);
          pairedAdded.add(aIdx);

          findings.push({
            id: `api-method-change-${file.id}-${rem.method}-${add.method}-${add.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            ruleId: 'rule-api-endpoint',
            title: `HTTP method changed on route: ${rem.method} -> ${add.method} ${add.path}`,
            category: 'api',
            priority: 'HIGH',
            confidence: 'HIGH',
            changeType: 'HTTP method swap',
            affectedFile: file.newPath,
            changeSignature: `api:method:${add.path}`,
            evidence: {
              filePath: file.newPath,
              lineNumber: add.lineNumber,
              snippet: `- ${rem.rawLine}\n+ ${add.rawLine}`,
              beforeSnippet: `${rem.method} ${rem.path}`,
              afterSnippet: `${add.method} ${add.path}`,
              changeType: 'modification',
            },
            explanation: `Endpoint handler for path "${add.path}" was swapped from HTTP ${rem.method} to ${add.method}. Existing client integrations sending ${rem.method} requests will encounter 405 Method Not Allowed errors.`,
            suggestedAction: `Check mobile and web clients calling ${add.path}. Update API contracts and maintain backward-compatible redirects or dual-method handlers if necessary.`,
            limitations: 'Static analysis verifies handler signatures within diff files without tracing client code call-sites.',
          });
        }
      }
    }

    // 3. Identify routes with identical method where PATH was modified
    for (let rIdx = 0; rIdx < removedRoutes.length; rIdx++) {
      if (pairedRemoved.has(rIdx)) continue;
      const rem = removedRoutes[rIdx];

      for (let aIdx = 0; aIdx < addedRoutes.length; aIdx++) {
        if (pairedAdded.has(aIdx)) continue;
        const add = addedRoutes[aIdx];

        if (rem.method === add.method && rem.path !== add.path && Math.abs(rem.lineNumber - add.lineNumber) < 4) {
          pairedRemoved.add(rIdx);
          pairedAdded.add(aIdx);

          findings.push({
            id: `api-path-change-${file.id}-${add.method}-${rem.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            ruleId: 'rule-api-endpoint',
            title: `API route path changed: ${add.method} ${rem.path} -> ${add.path}`,
            category: 'api',
            priority: 'HIGH',
            confidence: 'HIGH',
            changeType: 'API route rename',
            affectedFile: file.newPath,
            changeSignature: `api:path:${add.method}:${add.path}`,
            evidence: {
              filePath: file.newPath,
              lineNumber: add.lineNumber,
              snippet: `- ${rem.rawLine}\n+ ${add.rawLine}`,
              beforeSnippet: `${rem.method} ${rem.path}`,
              afterSnippet: `${add.method} ${add.path}`,
              changeType: 'modification',
            },
            explanation: `Route path changed from "${rem.path}" to "${add.path}" for method ${add.method}. Any downstream service invoking the old path will fail with 404 Not Found.`,
            suggestedAction: 'Ensure URL alias or 301/308 permanent redirect is implemented during deprecation window.',
          });
        }
      }
    }

    // 4. Remaining unpaired removed routes
    for (let rIdx = 0; rIdx < removedRoutes.length; rIdx++) {
      if (pairedRemoved.has(rIdx)) continue;
      const rem = removedRoutes[rIdx];

      findings.push({
        id: `api-removed-${file.id}-${rem.method}-${rem.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        ruleId: 'rule-api-endpoint',
        title: `API endpoint removed: ${rem.method} ${rem.path}`,
        category: 'api',
        priority: 'HIGH',
        confidence: 'HIGH',
        changeType: 'Route deleted',
        affectedFile: file.oldPath,
        changeSignature: `api:rem:${rem.method}:${rem.path}`,
        evidence: {
          filePath: file.oldPath,
          lineNumber: rem.lineNumber,
          snippet: rem.rawLine,
          beforeSnippet: `${rem.method} ${rem.path}`,
          changeType: 'deletion',
        },
        explanation: `Endpoint ${rem.method} ${rem.path} was deleted. Third-party integrations and internal callers will receive 404 responses.`,
        suggestedAction: 'Audit access logs for recent traffic to this endpoint before removing permanently.',
      });
    }

    // 5. Remaining unpaired added routes
    for (let aIdx = 0; aIdx < addedRoutes.length; aIdx++) {
      if (pairedAdded.has(aIdx)) continue;
      const add = addedRoutes[aIdx];

      const hasAuthMw = add.middleware.some((m) => AUTH_MIDDLEWARE_REGEX.test(m));
      let explanation: string;
      if (add.middleware.length > 0) {
        explanation = hasAuthMw
          ? `Router endpoint "${add.method} ${add.path}" declared with security middleware (${add.middleware.join(', ')}). Access is guarded by declared middleware.`
          : `Router endpoint "${add.method} ${add.path}" declared with middleware (${add.middleware.join(', ')}).`;
      } else {
        explanation = `Router endpoint "${add.method} ${add.path}" declared without route-level middleware declarations.`;
      }

      findings.push({
        id: `api-added-${file.id}-${add.method}-${add.path.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        ruleId: 'rule-api-endpoint',
        title: `Router endpoint introduced: ${add.method} ${add.path}`,
        category: hasAuthMw ? 'authorization' : 'api',
        priority: 'MEDIUM',
        confidence: 'HIGH',
        changeType: 'New API route',
        affectedFile: file.newPath,
        changeSignature: `api:add:${add.method}:${add.path}`,
        detectionSignals: add.middleware.length > 0 ? add.middleware : undefined,
        evidence: {
          filePath: file.newPath,
          lineNumber: add.lineNumber,
          snippet: add.rawLine,
          afterSnippet: `${add.method} ${add.path}`,
          changeType: 'addition',
          detectionSignals: add.middleware.length > 0 ? add.middleware : undefined,
        },
        explanation,
        suggestedAction: 'Verify authentication middleware, rate limiting, and OpenAPI/Swagger schema documentation.',
      });
    }

    // 6. Generic API file review ONLY if NO specific route changes were found in comparison mode
    if (isApiFile && findings.length === 0 && (file.additions > 0 || file.deletions > 0)) {
      findings.push({
        id: `api-file-modified-${file.id}`,
        ruleId: 'rule-api-endpoint',
        title: `API definition file modified: ${file.newPath}`,
        category: 'api',
        priority: 'REVIEW',
        confidence: 'MEDIUM',
        changeType: 'API definition file edited',
        affectedFile: file.newPath,
        evidence: {
          filePath: file.newPath,
          changeType: 'modification',
          snippet: `${file.additions} lines added, ${file.deletions} lines removed`,
        },
        explanation: `Modifications in ${file.newPath} may affect request validation, response payloads, or internal route handlers.`,
        suggestedAction: 'Review endpoint payload contracts and integration tests for potential breaking changes.',
      });
    }

    return findings;
  },
};
