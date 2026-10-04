export type FindingCategory =
  | 'api'
  | 'authorization'
  | 'authentication'
  | 'dependencies'
  | 'configuration'
  | 'database'
  | 'frontend'
  | 'backend'
  | 'tests'
  | 'security'
  | 'other';

export type FindingPriority = 'REVIEW' | 'LOW' | 'MEDIUM' | 'HIGH';
export type FindingConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FindingEvidence {
  filePath: string;
  lineNumber?: number;
  snippet?: string;
  changeType?: 'addition' | 'deletion' | 'modification' | 'file_rename' | 'file_status';
  beforeSnippet?: string;
  afterSnippet?: string;
  fallbackValue?: string;
  detectionSignals?: string[];
}

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  category: FindingCategory;
  priority: FindingPriority;
  confidence: FindingConfidence;
  changeType?: string;
  affectedFile: string;
  evidence: FindingEvidence;
  explanation: string;
  suggestedAction: string;
  limitations?: string;
  isReviewed?: boolean;
  isDismissed?: boolean;
  detectionSignals?: string[];
  relatedFindingIds?: string[];
  changeSignature?: string;
}

export interface FindingsSummary {
  total: number;
  totalSignals: number;
  byPriority: Record<FindingPriority, number>;
  byCategory: Record<FindingCategory, number>;
  reviewedCount: number;
}
