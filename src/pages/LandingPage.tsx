import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  FileCode2,
  Lock,
  Database,
  Layers,
  Terminal,
  Server,
  FolderArchive,
  FolderGit2,
  GitCompare,
  FileText,
  ClipboardPaste,
  Network,
  AlertOctagon,
  TestTube2,
  VolumeX,
  CheckSquare,
  HardDrive,
  Eye,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-16 pb-14 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400 mb-6 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-900 dark:text-neutral-100" />
            <span>Code change impact analysis</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-950 dark:text-white max-w-3xl mx-auto text-balance">
            Understand what your code changes could affect before you merge.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed text-balance">
            Analyze diffs and project changes to identify review areas across APIs, dependencies, configuration, databases, authentication, tests, and more.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
            >
              <span>Analyze changes</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-300 dark:border-neutral-700 shadow-2xs"
            >
              <span>View documentation</span>
            </Link>
          </div>

          <div className="mt-6 text-xs text-neutral-500 flex items-center justify-center gap-4">
            <span>Runs locally in browser</span>
            <span>·</span>
            <span>Zero code execution</span>
            <span>·</span>
            <span>No account required</span>
          </div>
        </section>

        {/* Product Visual Centerpiece */}
        <section className="px-4 sm:px-6 max-w-6xl mx-auto mb-20">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0e1117] shadow-xl overflow-hidden">
            {/* Visual Header Window Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#12151c]/80 backdrop-blur-xs text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                <span className="text-neutral-400 font-mono text-[11px] ml-2">
                  release/v2.4.0 · 3 files changed (+28 / -6) · 3 unique findings
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  Unified Diff
                </span>
              </div>
            </div>

            {/* 3-Panel Visual Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800 text-xs">
              {/* Panel 1: File Tree (3 cols) */}
              <div className="lg:col-span-3 p-3 bg-white dark:bg-[#0c0e12] space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1">
                  Changed Files (3)
                </div>
                <div className="space-y-1">
                  <div className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-l-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-between">
                    <div className="truncate font-mono text-[11px] text-neutral-900 dark:text-neutral-100 font-semibold">routes/users.ts</div>
                    <span className="text-[10px] font-mono px-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      1 high
                    </span>
                  </div>
                  <div className="p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                    <div className="truncate font-mono text-[11px]">migrations/002_drop.sql</div>
                    <span className="text-[10px] font-mono px-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      1 high
                    </span>
                  </div>
                  <div className="p-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                    <div className="truncate font-mono text-[11px]">package.json</div>
                    <span className="text-[10px] font-mono px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      1 med
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Code Diff (5 cols) */}
              <div className="lg:col-span-5 p-3 bg-white dark:bg-[#0d0f14] font-mono text-[11px] leading-relaxed overflow-x-auto space-y-2">
                <div className="text-[10px] text-neutral-400 font-sans uppercase font-bold">
                  routes/users.ts
                </div>
                <div className="rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-[#101217]">
                  <div className="px-3 py-1 bg-neutral-100 dark:bg-[#151921] text-neutral-500 text-[10px]">
                    @@ -18,3 +18,3 @@ export const router = Router();
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="text-neutral-500 px-1">
                      &nbsp;&nbsp;router.get('/:id', requireAuth, getUserHandler);
                    </div>
                    <div className="bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1 rounded">
                      - router.delete('/:id', requireAuth, requireAdmin, deleteHandler);
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1 rounded">
                      + router.delete('/:id', requireAuth, deleteHandler);
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 3: Findings & Impact (4 cols) */}
              <div className="lg:col-span-4 p-3.5 bg-neutral-50/50 dark:bg-[#0e1116] space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  Review Findings (1)
                </div>

                <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#14171e] text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                      HIGH
                    </span>
                    <span className="text-[10px] font-mono px-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                      HIGH Conf
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500 capitalize">
                      authorization
                    </span>
                  </div>

                  <h5 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                    Authorization middleware changed on DELETE /:id
                  </h5>

                  <div className="rounded bg-neutral-100 dark:bg-neutral-900 p-2 font-mono text-[10px] space-y-0.5">
                    <div className="text-rose-600 dark:text-rose-400">
                      Before: requireAuth, requireAdmin
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      After: requireAuth
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    The endpoint remains present, but administrative guard middleware was removed. Review whether access is now broadened to all authenticated users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-14 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0c0e12]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Workflow
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1.5">
                How ImpactCheck works
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                A structured four-step review workflow designed for engineers before opening or approving changes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
                <div className="font-mono text-xs font-bold text-neutral-400">01</div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Add your project or changes
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Import a project ZIP, pick a local directory, compare before/after folders, or paste a Git diff directly.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
                <div className="font-mono text-xs font-bold text-neutral-400">02</div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  ImpactCheck maps the changes
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Statically classifies modified files into architectural layers and correlates relationships between routes, services, schemas, and tests.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
                <div className="font-mono text-xs font-bold text-neutral-400">03</div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Review potential impact
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Inspect deduplicated findings with exact before/after evidence, confidence ratings, and breaking contract signals.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
                <div className="font-mono text-xs font-bold text-neutral-400">04</div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Follow the review checklist
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Convert detected findings into an interactive checklist and export shareable Markdown, JSON, or HTML review summaries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Input Methods Section */}
        <section className="py-14 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Input flexibility
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1.5">
                Work with changes your way
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                You do not need to generate manual patch files. ImpactCheck accepts projects and directories directly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-8">
              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-2">
                <FolderArchive className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Project ZIP
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Upload a compressed project archive. Unzipped safely in browser memory.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-2">
                <FolderGit2 className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Project Folder
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Select a local folder directly from your computer via directory upload.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-2">
                <GitCompare className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Compare Folders
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Select before and after directories to compute recursive line-level file diffs.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-2">
                <FileText className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Git Diff / Patch
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Upload standard unified .diff or .patch files generated by Git.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419] space-y-2">
                <ClipboardPaste className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  Paste Diff
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Paste raw unified diff text from your terminal or pull request review.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Section */}
        <section className="py-14 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#0c0e12]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Core Capabilities
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1.5">
                Targeted review intelligence
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                Focused heuristics evaluate boundary changes without generic marketing bloat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <Network className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Change Map</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  See potential relationships between changed files across routes, controllers, databases, and tests.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>Breaking Change Watchlist</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Find changes that may affect callers, contracts, dropped exports, or removed database columns.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <Layers className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Dependency Impact</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Review dependency additions, removals, and major semver bumps with optional public OSV checks.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <TestTube2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Test Impact</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  See where core implementation changes may need corresponding test updates in the changeset.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <VolumeX className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Change Noise</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Separate meaningful business changes from routine lockfile churn and generated machine artifacts.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  <CheckSquare className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Review Checklist</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Turn detected findings into concrete, trackable verification steps prior to merging.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-14 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Privacy and Local-First Architecture
                </h3>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
                Core static analysis runs in your browser memory. Uploaded files are treated as untrusted data, and ImpactCheck never executes uploaded source code, scripts, or binaries. Optional vulnerability checks only transmit package names and versions to the public OSV API; source code is never sent.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span>· In-memory processing</span>
                <span>· Zip-Slip path sanitization</span>
                <span>· Local browser storage only</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-[#0c0e12] text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Review changes with more context.
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Start analyzing your projects, directories, or diffs in seconds with zero configuration.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                <span>Analyze changes</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/docs"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-300 dark:border-neutral-700 shadow-2xs"
              >
                <span>Read the docs</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
