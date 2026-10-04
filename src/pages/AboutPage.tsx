import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Cpu, Layers, GitBranch, Target } from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
            Product Philosophy
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1">
            About DiffGuard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
            DiffGuard was created to answer one practical question before merging: "What concrete system boundaries could this changeset impact?"
          </p>
        </div>

        <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {/* 1. The Problem */}
          <section className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              The Code Review Blindspot
            </h2>
            <p>
              In modern software development, code changes frequently cross multiple architectural layers in a single commit or pull request. A simple feature addition might touch API route definitions, modify role-based middleware, alter database schema columns, upgrade a shared npm dependency, and reference new environment variables.
            </p>
            <p>
              Traditional diff viewers display added and removed lines chronologically or alphabetically by file path. Reviewers are left to mentally reconstruct the cross-cutting systemic impact of those lines. Subtle breaking changes—such as an inadvertently removed authorization middleware or an altered database column—often go unnoticed until deployment.
            </p>
          </section>

          {/* 2. What DiffGuard Does */}
          <section className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Deterministic Static Review Intelligence
            </h2>
            <p>
              DiffGuard analyzes changesets using deterministic static heuristics. Rather than generating vague prose or hallucinated security warnings, it normalizes code structures and evaluates concrete patterns:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Structured Route Comparison</div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Evaluates HTTP methods, path strings, and middleware sequences to identify route modifications, removed authorization guards, or contract breaks.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Schema & Migration Safety</div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Correlates destructive SQL keywords (DROP TABLE, DROP COLUMN, TRUNCATE) into unified, actionable review findings.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Dependency Semver Analysis</div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Highlights major version leaps across npm and PyPI manifests, isolating substantive changes from lockfile noise.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Architectural Change Mapping</div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Statically maps cross-file import and verification relationships across routes, services, schemas, and tests.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Who It Is For */}
          <section className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Who DiffGuard is For
            </h2>
            <p>
              DiffGuard is built for software engineers, tech leads, and code reviewers who want more context before merging code into staging or production branches. It works seamlessly for quick local audits before opening a pull request, or as an in-depth review companion during peer review.
            </p>
          </section>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800">
          <Link
            to="/docs"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2"
          >
            Read the Documentation
          </Link>

          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs"
          >
            <span>Open Workbench</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
