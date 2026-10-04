import { getSettings } from './settingsService';

export interface HistoryEntry {
  id: string;
  name: string;
  timestamp: string;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  findingsCount: number;
  highPriorityCount: number;
  projectType?: string;
  diffText?: string;
}

const PRIMARY_STORAGE_KEY = 'impactcheck_recent_history';
const LEGACY_STORAGE_KEY = 'diffguard_recent_history';
const MAX_ENTRIES = 12;

export function getHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // Check user preference
  const settings = getSettings();
  if (!settings.saveHistory) {
    return newEntry;
  }

  const current = getHistory();
  // Filter out duplicate entries with same name or identical diff content
  const updated = [
    newEntry,
    ...current.filter((e) => e.name !== entry.name && !(entry.diffText && e.diffText === entry.diffText)),
  ].slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Quota exceeded: trim diffText
    const trimmed = updated.map((u) => ({ ...u, diffText: undefined }));
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore
    }
  }
  return newEntry;
}

export function renameHistoryEntry(id: string, newName: string): HistoryEntry[] {
  const current = getHistory();
  const updated = current.map((item) => (item.id === id ? { ...item, name: newName } : item));
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const current = getHistory();
  const updated = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(PRIMARY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
