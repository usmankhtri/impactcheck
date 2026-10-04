export interface DiffGuardSettings {
  diffMode: 'unified' | 'split';
  contextLines: number;
  osvLookup: boolean;
  saveHistory: boolean;
  reducedMotion: boolean;
  excludeNoise: boolean;
}

const SETTINGS_KEY = 'diffguard_user_settings';

export const DEFAULT_SETTINGS: DiffGuardSettings = {
  diffMode: 'unified',
  contextLines: 3,
  osvLookup: true,
  saveHistory: true,
  reducedMotion: false,
  excludeNoise: true,
};

export function getSettings(): DiffGuardSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(partial: Partial<DiffGuardSettings>): DiffGuardSettings {
  const current = getSettings();
  const updated: DiffGuardSettings = { ...current, ...partial };
  
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  // Apply reduced motion class to root
  if (typeof document !== 'undefined') {
    if (updated.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.classList.remove('reduced-motion');
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }

  return updated;
}
