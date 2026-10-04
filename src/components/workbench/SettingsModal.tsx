import React, { useState } from 'react';
import { Settings, X, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_EXCLUSION_PATTERNS } from '../../utils/projectDetector';
import { getSettings, saveSettings } from '../../services/settingsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenShortcuts,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const [defaultDiffMode, setDefaultDiffMode] = useState<'unified' | 'split'>(() => getSettings().diffMode);
  const [saveHistory, setSaveHistory] = useState<boolean>(() => getSettings().saveHistory);

  // Keyboard Escape and body scroll lock
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    saveSettings({
      diffMode: defaultDiffMode,
      saveHistory,
    });
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111419] shadow-2xl p-4 sm:p-6 space-y-5 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              DiffGuard Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Theme */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Theme Appearance</div>
              <div className="text-neutral-500 text-[11px]">Choose between light, dark, or system workstation theme.</div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${
                  themeMode === 'light'
                    ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Light"
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${
                  themeMode === 'dark'
                    ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-200'
                }`}
                title="Dark"
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('system')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs ${
                  themeMode === 'system'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="System"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Auto</span>
              </button>
            </div>
          </div>

          {/* Diff Mode */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Default Diff Mode</div>
              <div className="text-neutral-500 text-[11px]">Select preferred default view when opening files.</div>
            </div>
            <select
              value={defaultDiffMode}
              onChange={(e) => setDefaultDiffMode(e.target.value as 'unified' | 'split')}
              className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs"
            >
              <option value="unified">Unified</option>
              <option value="split">Split</option>
            </select>
          </div>

          {/* Local History */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Browser Local History</div>
              <div className="text-neutral-500 text-[11px]">Save recent project analyses in browser localStorage.</div>
            </div>
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => setSaveHistory(e.target.checked)}
              className="rounded"
            />
          </div>

          {/* Keyboard Shortcuts Trigger */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
            <div>
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Keyboard Navigation</div>
              <div className="text-neutral-500 text-[11px]">View available developer keybindings.</div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              View Shortcuts
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer shadow-2xs"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
