import { Finding, FindingsSummary } from './finding';
import { DependencyChange } from './dependency';
import { ReviewChecklistItem } from './checklist';
import { ProjectOverviewData } from '../utils/projectOverview';

export interface ImpactCheckReport {
  version: string;
  generatedAt: string;
  tool: {
    name: string;
    version: string;
    description: string;
    url?: string;
  };
  analysisMode?: 'snapshot' | 'comparison';
  projectOverview?: ProjectOverviewData;
  summary: {
    totalFilesChanged: number;
    totalAdditions: number;
    totalDeletions: number;
    findingsCount: number;
    signalsCount: number;
    checklistProgress: {
      total: number;
      completed: number;
      percentage: number;
    };
    breakdown: FindingsSummary;
  };
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
    findingsCount: number;
  }>;
  findings: Finding[];
  dependencies: DependencyChange[];
  checklist: ReviewChecklistItem[];
  disclaimers: string[];
}

// Backward-compatibility alias
export type DiffGuardReport = ImpactCheckReport;
