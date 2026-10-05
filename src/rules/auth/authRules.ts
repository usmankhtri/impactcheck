import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding, FindingCategory } from '../../types/finding';
import { Rule } from '../types';

const AUTH_FILE_PATTERNS = [
  /auth/i,
  /session/i,
  /jwt/i,
  /token/i,
  /oauth/i,
  /permission/i,
  /rbac/i,
  /passport/i,
  /guard/i,
  /middleware\/verify/i,
];

interface SecurityPattern {
  pattern: RegExp;
  name: string;
  category: 'authentication' | 'authorization';
  priority: 'HIGH' | 'MEDIUM';
  description: string;
}

const SECURITY_KEYWORD_PATTERNS: SecurityPattern[] = [
  // Authorization (Role & Permission Checks)
  {
    pattern: /(?:hasRole|checkPermission|requireRole|isAdmin|canAccess|allowList|requireAdmin|isAllowed|user\.role)/,
    name: 'Authorization role or permission check',
    category: 'authorization',
    priority: 'HIGH',
    description: 'Role-based access control, permission guard, or admin authorization boundary',
  },
  // Authentication (Identity, Token, Credentials)
  {
    pattern: /(?:jwt\.verify|jwt\.sign|verifyToken|authenticate|passport\.authenticate)/,
    name: 'Token verification or identity handshake',
    category: 'authentication',
    priority: 'HIGH',
    description: 'JWT token signing, cryptographic verification, or identity provider middleware',
  },
  {
    pattern: /(?:bcrypt|argon2|scrypt|crypto\.pbkdf2|hashPassword)/,
    name: 'Password hashing or credential routine',
    category: 'authentication',
    priority: 'HIGH',
    description: 'Password hashing, key derivation, or credential storage',
  },
  {
    pattern: /(?:session\.destroy|req\.session|cookie\(['"]token|sameSite|httpOnly)/,
    name: 'Session or cookie security configuration',
    category: 'authentication',
    priority: 'HIGH',
    description: 'Session lifecycle, authentication cookies, or transport security attributes',
  },
  {
    pattern: /(?:OAuth2|oauth_callback|client_secret|grant_type)/,
    name: 'OAuth handshake parameters',
    category: 'authentication',
    priority: 'HIGH',
    description: 'Third-party OAuth exchange, callback handling, or token grants',
  },
];

export const authRule: Rule = {
  id: 'rule-auth-sensitivity',
  name: 'Authentication & Authorization Sensitivity',
  category: 'authentication',
  description: 'Distinguishes changes to identity authentication versus permission authorization guards with concrete evidence.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';
    if (isSnapshot) {
      // In snapshot mode, authentication and authorization boundaries populate Project Overview
      // metadata rather than generating noisy findings simply because security modules exist.
      return findings;
    }

    const isAuthFile = AUTH_FILE_PATTERNS.some((pat) => pat.test(file.newPath));

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' || line.type === 'delete' || line.type === 'detected') {
          const matchedPatterns: SecurityPattern[] = [];
          for (const item of SECURITY_KEYWORD_PATTERNS) {
            if (item.pattern.test(line.content)) {
              matchedPatterns.push(item);
            }
          }

          if (matchedPatterns.length > 0) {
            const isAuthz = matchedPatterns.some((p) => p.category === 'authorization');
            const primary = isAuthz
              ? matchedPatterns.find((p) => p.category === 'authorization')!
              : matchedPatterns[0];

            const category: FindingCategory = isAuthz ? 'authorization' : 'authentication';
            const signalNames = matchedPatterns.map((p) => p.name);
            const lineNumber = line.newLineNumber || line.oldLineNumber || hunk.newStart;

            // Strict evidence-based titles and changeTypes
            let title: string;
            let changeType: string;

            if (isSnapshot) {
              title = isAuthz
                ? `Authorization-sensitive code detected: ${primary.name}`
                : `Authentication-sensitive module detected: ${primary.name}`;
              changeType = `${category === 'authorization' ? 'Authorization' : 'Authentication'}-sensitive code detected`;
            } else if (line.type === 'delete') {
              title = isAuthz
                ? `Authorization requirement changed: ${primary.name}`
                : `Authentication logic changed: ${primary.name}`;
              changeType = `${category === 'authorization' ? 'Authorization' : 'Authentication'} requirement changed`;
            } else {
              title = isAuthz
                ? `Authorization guard introduced: ${primary.name}`
                : `Authentication logic changed: ${primary.name}`;
              changeType = `${category === 'authorization' ? 'Authorization' : 'Authentication'} boundary referenced`;
            }

            findings.push({
              id: `sec-${category}-${file.id}-${lineNumber}-${primary.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              ruleId: 'rule-auth-sensitivity',
              title,
              category,
              priority: primary.priority,
              confidence: 'HIGH',
              changeType,
              affectedFile: file.newPath,
              detectionSignals: signalNames,
              changeSignature: `sec:${category}:${file.newPath}:${lineNumber}`,
              evidence: {
                filePath: file.newPath,
                lineNumber,
                snippet: isSnapshot ? line.content.trim() : `${line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '} ${line.content.trim()}`,
                changeType: isSnapshot ? 'file_status' : (line.type === 'add' ? 'addition' : 'deletion'),
                detectionSignals: signalNames,
              },
              explanation: isSnapshot
                ? `Detected concrete ${category} boundary signals (${signalNames.join(', ')}) in ${file.newPath}. This code directly defines access privileges or identity validation.`
                : `Detected concrete ${category} signals (${signalNames.join(', ')}) in ${file.newPath}. Changes to this code directly impact access privileges or identity validation.`,
              suggestedAction: isAuthz
                ? 'Review role matrix, verify permission boundaries across user tiers, and ensure privilege escalation is prevented.'
                : 'Confirm cryptographic parameters, token expiration routines, and secret management safety.',
              limitations: 'Static pattern detection flags security-sensitive boundaries; it does not simulate runtime session stores or token revocation.',
            });
          }
        }
      }
    }

    // Generic file-level review finding ONLY if NO specific keyword findings were flagged
    if (isAuthFile && findings.length === 0) {
      if (isSnapshot) {
        findings.push({
          id: `auth-file-detected-${file.id}`,
          ruleId: 'rule-auth-sensitivity',
          title: `Authentication-sensitive module detected: ${file.newPath}`,
          category: 'authentication',
          priority: 'REVIEW',
          confidence: 'HIGH',
          changeType: 'Security module detected',
          affectedFile: file.newPath,
          evidence: {
            filePath: file.newPath,
            changeType: 'file_status',
            snippet: file.newPath,
          },
          explanation: `File ${file.newPath} is categorized as an authentication or authorization module in the project snapshot.`,
          suggestedAction: 'Check token issuance, role validation, session expiration, and error handling for unauthorized requests.',
        });
      } else if (file.additions > 0 || file.deletions > 0) {
        findings.push({
          id: `auth-file-modified-${file.id}`,
          ruleId: 'rule-auth-sensitivity',
          title: `Authentication-sensitive file modified: ${file.newPath}`,
          category: 'authentication',
          priority: 'MEDIUM',
          confidence: 'MEDIUM',
          changeType: 'Security module modified',
          affectedFile: file.newPath,
          evidence: {
            filePath: file.newPath,
            changeType: 'modification',
            snippet: `${file.additions} lines added, ${file.deletions} lines removed`,
          },
          explanation: `File ${file.newPath} is categorized as an authentication or authorization module. Modifications deserve human inspection to guarantee security boundaries remain intact.`,
          suggestedAction: 'Check token issuance, role validation, session expiration, and error handling for unauthorized requests.',
        });
      }
    }

    return findings;
  },
};
