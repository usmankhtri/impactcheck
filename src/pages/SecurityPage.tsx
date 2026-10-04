import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  HardDrive,
  FileCode2,
  Lock,
  AlertTriangle,
  FolderArchive,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
            Security Architecture
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1">
            Security Model & Guarantees
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
            DiffGuard is designed with an adversarial posture toward inputs: all analyzed files are treated as untrusted data, and no code is ever executed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* 1. Untrusted Input */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>Untrusted Input Handling</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              All imported project archives, folders, and diff text are treated strictly as untrusted data. Input is parsed using purely functional lexical tokenizers.
            </p>
          </div>

          {/* 2. Zero Code Execution */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Lock className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>Zero Code Execution</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              DiffGuard does not execute JavaScript, TypeScript, Python, shell scripts, or build lifecycle hooks (<code className="font-mono">npm postinstall</code>) from uploaded files.
            </p>
          </div>

          {/* 3. ZIP Archive Safety */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <FolderArchive className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>ZIP Handling & Path Traversal</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              ZIP archives are processed in browser memory with strict path normalization. Entries containing directory traversal sequences (<code className="font-mono">../</code>) or absolute paths are rejected to prevent Zip-Slip vulnerabilities.
            </p>
          </div>

          {/* 4. External Network Lookups */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <Database className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>Minimal External Requests</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              When optional vulnerability checking is enabled, only package names and semver version strings are sent to the public OSV (Open Source Vulnerability) database. Source code, filenames, and diff contents are never transmitted.
            </p>
          </div>
        </div>

        {/* Browser Storage Section */}
        <section className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            <HardDrive className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <span>Browser Local Storage & Clearing</span>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            DiffGuard uses your browser's <code className="font-mono">localStorage</code> solely to preserve recent analysis snapshots and user preferences. No cookies, trackers, or external database persistence are involved. You can purge all stored history at any time from the <Link to="/settings" className="underline font-medium text-neutral-900 dark:text-neutral-100">Settings page</Link> or by clearing browser site data.
          </p>
        </section>

        {/* Limitations Notice */}
        <section className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Heuristic Static Analysis Scope & Limitations</span>
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            DiffGuard provides heuristic code review recommendations. It does not replace formal application security penetration tests, fuzz testing, compiler type checks, or unit test suites. Findings highlight code boundaries that warrant human inspection, but cannot guarantee the absence of runtime bugs or vulnerabilities.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};
