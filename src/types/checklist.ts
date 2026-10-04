export interface ReviewChecklistItem {
  id: string;
  findingId?: string;
  category: string;
  title: string;
  completed: boolean;
  isCustom?: boolean;
}
