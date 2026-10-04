export type DependencyChangeType = 'added' | 'removed' | 'updated' | 'downgraded' | 'lockfile_churn';

export interface DependencyChange {
  id: string;
  name: string;
  ecosystem: 'npm' | 'pypi' | 'cargo' | 'go' | 'composer' | 'unknown';
  manifestFile: string;
  oldVersion?: string;
  newVersion?: string;
  changeType: DependencyChangeType;
  isMajorBump: boolean;
  osvStatus?: 'idle' | 'checking' | 'clean' | 'advisory_found' | 'error';
  advisories?: OSVAdvisory[];
}

export interface OSVAdvisory {
  id: string;
  summary: string;
  details?: string;
  aliases?: string[];
  modified?: string;
  published?: string;
  severity?: string;
  fixedVersions?: string[];
  referenceUrl?: string;
}

export interface OSVQueryResponse {
  vulns?: Array<{
    id: string;
    summary?: string;
    details?: string;
    aliases?: string[];
    modified?: string;
    published?: string;
    database_specific?: {
      severity?: string;
    };
    affected?: Array<{
      package?: {
        name: string;
        ecosystem: string;
      };
      ranges?: Array<{
        type: string;
        events: Array<{
          introduced?: string;
          fixed?: string;
        }>;
      }>;
      versions?: string[];
    }>;
    references?: Array<{
      type: string;
      url: string;
    }>;
  }>;
}
