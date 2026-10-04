import React from 'react';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import { ImpactCheckMark } from './ImpactCheckLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c0e12] py-8 text-xs text-neutral-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand statement */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ImpactCheckMark size={18} />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">ImpactCheck</span>
          </div>
          <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">·</span>
          <span className="text-neutral-500">
            Understand what your code changes could affect before you merge.
          </span>
        </div>

        {/* Cohesive links */}
        <div className="flex flex-wrap items-center justify-center gap-5 font-medium">
          <Link to="/app" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Analyze
          </Link>
          <Link to="/docs" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Docs
          </Link>
          <Link to="/security" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Security
          </Link>
          <Link to="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Privacy
          </Link>
          <Link to="/about" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            About
          </Link>
          <a
            href="https://github.com/promptility/impactcheck"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            aria-label="GitHub Repository"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
