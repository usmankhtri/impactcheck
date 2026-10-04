import { DependencyChange, OSVAdvisory, OSVQueryResponse } from '../types/dependency';

// In-memory cache for the current session to avoid redundant lookups
const sessionCache = new Map<string, OSVAdvisory[]>();

function cleanVersionString(version: string): string {
  // Strip semver prefix characters like ^, ~, >=, <=, =
  return version.replace(/^[~^>=<\s]+/, '').trim();
}

function mapEcosystemToOsv(ecosystem: string): string {
  switch (ecosystem.toLowerCase()) {
    case 'npm':
      return 'npm';
    case 'pypi':
      return 'PyPI';
    case 'cargo':
      return 'crates.io';
    case 'composer':
      return 'Packagist';
    default:
      return 'npm';
  }
}

export async function lookupOsvVulnerability(
  packageName: string,
  version: string,
  ecosystem: 'npm' | 'pypi' | 'cargo' | 'go' | 'composer' | 'unknown' = 'npm'
): Promise<{ status: 'clean' | 'advisory_found' | 'error'; advisories: OSVAdvisory[]; message?: string }> {
  const cleanVer = cleanVersionString(version);
  const cacheKey = `${ecosystem}:${packageName}@${cleanVer}`;

  if (sessionCache.has(cacheKey)) {
    const cached = sessionCache.get(cacheKey)!;
    return {
      status: cached.length > 0 ? 'advisory_found' : 'clean',
      advisories: cached,
    };
  }

  const osvEcosystem = mapEcosystemToOsv(ecosystem);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package: {
          name: packageName,
          ecosystem: osvEcosystem,
        },
        version: cleanVer,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        sessionCache.set(cacheKey, []);
        return { status: 'clean', advisories: [] };
      }
      return {
        status: 'error',
        advisories: [],
        message: `OSV lookup returned HTTP ${response.status}`,
      };
    }

    const data: OSVQueryResponse = await response.json();
    const rawVulns = data.vulns || [];

    const advisories: OSVAdvisory[] = rawVulns.map((v) => {
      // Find fix version if available
      let fixedVer: string | undefined;
      if (v.affected) {
        for (const aff of v.affected) {
          if (aff.ranges) {
            for (const r of aff.ranges) {
              for (const ev of r.events) {
                if (ev.fixed) {
                  fixedVer = ev.fixed;
                  break;
                }
              }
            }
          }
        }
      }

      // External reference
      let refUrl = `https://osv.dev/vulnerability/${v.id}`;
      if (v.references && v.references.length > 0) {
        const advisoryRef = v.references.find((r) => r.type === 'ADVISORY' || r.type === 'WEB');
        if (advisoryRef) refUrl = advisoryRef.url;
      }

      return {
        id: v.id,
        summary: v.summary || 'Security advisory reported in OSV database',
        details: v.details,
        aliases: v.aliases || [],
        modified: v.modified,
        published: v.published,
        severity: v.database_specific?.severity,
        fixedVersions: fixedVer ? [fixedVer] : undefined,
        referenceUrl: refUrl,
      };
    });

    sessionCache.set(cacheKey, advisories);

    return {
      status: advisories.length > 0 ? 'advisory_found' : 'clean',
      advisories,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      status: 'error',
      advisories: [],
      message: isAbort ? 'Lookup request timed out' : 'Vulnerability lookup service unavailable',
    };
  }
}
