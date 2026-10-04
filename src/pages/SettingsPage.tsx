import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Shield,
  History,
  Keyboard,
  Sliders,
  Check,
  Trash2,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { ConfirmDialog } from '../components/design-system/ConfirmDialog';
import { useToast } from '../components/design-system/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { clearAllHistory } from '../services/historyService';
import { getSettings, saveSettings } from '../services/settingsService';

export const SettingsPage: React.FC = () => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { success, info } = useToast();

  const [settings, setSettingsState] = useState(() => getSettings());
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>(settings.diffMode);
  const [contextLines, setContextLines] = useState<number>(settings.contextLines);
  const [osvLookup, setOsvLookup] = useState<boolean>(settings.osvLookup);
  const [saveHistory, setSaveHistory] = useState<boolean>(settings.saveHistory);
  const [reducedMotion, setReducedMotion] = useState<boolean>(settings.reducedMotion);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = () => {
    clearAllHistory();
    setShowClearConfirm(false);
    info('Local history cleared');
  };

  const handleSave = () => {
    const updated = saveSettings({
      diffMode,
      contextLines,
      osvLookup,
      saveHistory,
      reducedMotion,
    });
    setSettingsState(updated);
    success('Preferences saved');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Configure workbench preferences and analysis behavior.
          </p>
        </div>

        {/* 1. Appearance */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Appearance
          </h2>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Theme Appearance
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Select light, dark, or automatic system appearance.
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-xs ${
                    themeMode === 'light'
                      ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  aria-label="Set light theme"
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-xs ${
                    themeMode === 'dark'
                      ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                  aria-label="Set dark theme"
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-xs ${
                    themeMode === 'system'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                  aria-label="Set system theme"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Respect Reduced Motion
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Disable UI transitions and pulse animations.
                </div>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 accent-neutral-900"
              />
            </div>
          </div>
        </section>

        {/* 2. Analysis & Diff */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Analysis & Diff Viewer
          </h2>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Default Diff Presentation
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Choose between unified inline diffs and split side-by-side view.
                </div>
              </div>
              <select
                value={diffMode}
                onChange={(e) => setDiffMode(e.target.value as 'unified' | 'split')}
                className="px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 text-xs"
              >
                <option value="unified">Unified</option>
                <option value="split">Split</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Unchanged Context Lines
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Number of unchanged context lines surrounding added or deleted code.
                </div>
              </div>
              <select
                value={contextLines}
                onChange={(e) => setContextLines(Number(e.target.value))}
                className="px-2.5 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 text-xs font-mono"
              >
                <option value={2}>2 lines</option>
                <option value={3}>3 lines (default)</option>
                <option value={5}>5 lines</option>
                <option value={10}>10 lines</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Dependencies & Public Lookups */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Dependencies & Intelligence
          </h2>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Public OSV Vulnerability Lookup
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5 max-w-md">
                  When enabled, queries public Open Source Vulnerability database for known CVEs. Transmits only package names and versions; source files are never transmitted.
                </div>
              </div>
              <input
                type="checkbox"
                checked={osvLookup}
                onChange={(e) => setOsvLookup(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 accent-neutral-900"
              />
            </div>
          </div>
        </section>

        {/* 4. History & Privacy */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            History & Local Storage
          </h2>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Save Recent Analyses in Browser
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Preserve recent project snapshots in localStorage on this device.
                </div>
              </div>
              <input
                type="checkbox"
                checked={saveHistory}
                onChange={(e) => setSaveHistory(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 accent-neutral-900"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Clear Stored Local Data
                </div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Permanently remove all cached snapshots and history.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear history</span>
              </button>
            </div>
          </div>
        </section>

        {/* 5. Keyboard Navigation Reference */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
            Keyboard Shortcuts
          </h2>
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] divide-y divide-neutral-100 dark:divide-neutral-850 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Next finding</span>
              <kbd className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[11px]">j / ↓</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Previous finding</span>
              <kbd className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[11px]">k / ↑</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Switch to unified diff</span>
              <kbd className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[11px]">u</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Switch to split diff</span>
              <kbd className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[11px]">s</kbd>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Open shortcuts reference</span>
              <kbd className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-[11px]">?</kbd>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </main>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear local history?"
        message="All saved analysis snapshots stored in this browser will be permanently deleted."
        confirmLabel="Clear All"
        isDestructive={true}
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
      />

      <Footer />
    </div>
  );
};
