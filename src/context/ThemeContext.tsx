import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (t: ResolvedTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'impactcheck_theme_mode';
const LEGACY_STORAGE_KEY = 'diffguard_theme_mode';
const LEGACY_KEY = 'diffguard_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved as ThemeMode;
      }
    } catch {
      // Storage unavailable
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Track system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme =
    themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;

  // Apply to DOM and persist
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    try {
      localStorage.setItem(STORAGE_KEY, themeMode);
      localStorage.setItem(LEGACY_KEY, resolvedTheme);
    } catch {
      // Ignore storage errors
    }
  }, [resolvedTheme, themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const setTheme = useCallback((t: ResolvedTheme) => {
    setThemeModeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      if (prev === 'system') {
        return systemIsDark ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [systemIsDark]);

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themeMode,
        toggleTheme,
        setTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
