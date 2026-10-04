import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

const FRONTEND_CLIENT_PATTERNS = [
  /apiClient/i,
  /api[._-]client/i,
  /services\/api/i,
  /fetcher/i,
  /axiosClient/i,
  /trpc/i,
  /graphqlClient/i,
];

const ROUTING_PATTERNS = [
  /<Route\s+path=/i,
  /createBrowserRouter/i,
  /useNavigate/i,
  /useRouter/i,
];

export const frontendRule: Rule = {
  id: 'rule-frontend-impact',
  name: 'Frontend Client & Routing Impact',
  category: 'frontend',
  description: 'Audits changes to shared API clients, client-side routing, and external state contracts.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';
    const isApiClient = FRONTEND_CLIENT_PATTERNS.some((pat) => pat.test(file.newPath));

    if (isApiClient && (isSnapshot || file.additions > 0 || file.deletions > 0)) {
      findings.push({
        id: `frontend-api-client-${file.id}`,
        ruleId: 'rule-frontend-impact',
        title: isSnapshot ? `Shared API client detected: ${file.newPath}` : `Shared API client modified: ${file.newPath}`,
        category: 'frontend',
        priority: 'MEDIUM',
        confidence: 'HIGH',
        changeType: isSnapshot ? 'API client detected' : 'API client modified',
        affectedFile: file.newPath,
        evidence: {
          filePath: file.newPath,
          changeType: isSnapshot ? 'file_status' : 'modification',
          snippet: isSnapshot ? file.newPath : `${file.additions} lines added, ${file.deletions} lines removed`,
        },
        explanation: isSnapshot
          ? `Shared API client definition identified in "${file.newPath}".`
          : `Modifications in shared API client "${file.newPath}". Changes to base URLs, default headers, error interceptors, or serialization can cascade across all consuming UI views and pages.`,
        suggestedAction: 'Check consumers of this client and verify error boundary behaviors in frontend components.',
      });
    }

    // Check for client routing changes
    let routeChanged = false;
    let snippet = '';
    let lineNum = 1;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' || line.type === 'delete' || line.type === 'detected') {
          for (const pat of ROUTING_PATTERNS) {
            if (pat.test(line.content)) {
              routeChanged = true;
              snippet = `${line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '} ${line.content.trim()}`;
              lineNum = line.newLineNumber || line.oldLineNumber || hunk.newStart;
              break;
            }
          }
        }
      }
      if (routeChanged) break;
    }

    if (routeChanged) {
      findings.push({
        id: `frontend-route-change-${file.id}-${lineNum}`,
        ruleId: 'rule-frontend-impact',
        title: isSnapshot ? `Frontend navigation route structure detected: ${file.newPath}` : `Frontend navigation or route structure modified: ${file.newPath}`,
        category: 'frontend',
        priority: 'REVIEW',
        confidence: 'HIGH',
        changeType: isSnapshot ? 'Frontend routing detected' : 'Frontend routing modified',
        affectedFile: file.newPath,
        evidence: {
          filePath: file.newPath,
          lineNumber: lineNum,
          snippet,
          changeType: isSnapshot ? 'file_status' : 'modification',
        },
        explanation: isSnapshot
          ? `Client-side routing definitions identified in ${file.newPath}.`
          : `Client-side routing definitions were altered in ${file.newPath}. May affect URL deep links, page redirection, or active navigation state.`,
        suggestedAction: 'Verify client navigation, browser back/forward history, and deep-link bookmarks.',
      });
    }

    return findings;
  },
};
