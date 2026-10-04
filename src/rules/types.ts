import { DiffFile, AnalysisMode, AnalysisContext } from '../types/diff';
import { Finding, FindingCategory } from '../types/finding';

export interface Rule {
  id: string;
  name: string;
  category: FindingCategory;
  description: string;
  analyze: (
    file: DiffFile,
    allFiles: DiffFile[],
    mode: AnalysisMode,
    context: AnalysisContext
  ) => Finding[];
}
