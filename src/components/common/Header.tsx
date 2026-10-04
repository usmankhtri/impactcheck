import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor, Github, Menu, X, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ImpactCheckMark } from './ImpactCheckLogo';

export const Header: React.FC = () => {
  const { theme, themeMode, setThemeMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname.startsWith('/app');
    }
    return location.pathname === path;
  };

  const navLinks = [
    { label: 'Analyze', path: '/app' },
    { label: 'History', path: '/history' },
    { label: 'Docs', path: '/docs' },
    { label: 'Security', path: '/security' },
    { label: 'Privacy', path: '/privacy' },
  ];

  // Cycle theme: system -> light -> dark -> system
  const handleCycleTheme = () => {
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const getThemeIcon = () => {
    if (themeMode === 'system') {
      return <Monitor className="h-3.5 w-3.5" />;
    }
    return theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />;
  };

  const getThemeTitle = () => {
    if (themeMode === 'system') {
      return `Theme: System (${theme}) - Click to switch to Light`;
    }
    if (themeMode === 'light') {
      return 'Theme: Light - Click to switch to Dark';
    }
    return 'Theme: Dark - Click to switch to System';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0c0e12]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Zone */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <ImpactCheckMark size={24} />
          <span className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
            Impact<span className="font-normal text-neutral-600 dark:text-neutral-400">Check</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors hover:text-neutral-950 dark:hover:text-white ${
                isActive(link.path)
                  ? 'text-neutral-950 dark:text-white font-semibold'
                  : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <a
            href="https://github.com/promptility/impactcheck"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
            aria-label="GitHub Repository"
            title="GitHub Repository"
          >
            <Github className="h-3.5 w-3.5" />
          </a>

          {/* Theme Selector Button */}
          <button
            onClick={handleCycleTheme}
            aria-label={getThemeTitle()}
            title={getThemeTitle()}
            className="flex h-8 items-center gap-1.5 px-2 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer text-xs"
          >
            {getThemeIcon()}
            <span className="text-[11px] capitalize font-medium hidden lg:inline">
              {themeMode}
            </span>
          </button>

          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs whitespace-nowrap ml-1"
          >
            <span>Analyze changes</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={handleCycleTheme}
            aria-label={getThemeTitle()}
            title={getThemeTitle()}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            {getThemeIcon()}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md">
          <nav className="flex flex-col space-y-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md transition-colors ${
                  isActive(link.path)
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
              <span>Theme Appearance:</span>
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    themeMode === 'light'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    themeMode === 'dark'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setThemeMode('system')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    themeMode === 'system'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            <Link
              to="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md shadow-2xs transition-colors"
            >
              <span>Analyze changes</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
