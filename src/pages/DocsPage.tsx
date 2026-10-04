import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCode,
  Shield,
  Layers,
  Terminal,
  Database,
  Lock,
  GitBranch,
  CheckSquare,
  FileText,
  AlertOctagon,
  Network,
  TestTube2,
  VolumeX,
  FolderArchive,
  FolderGit2,
  GitCompare,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const DocsPage: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navSections = [
    {
      title: 'Getting Started',
      items: [
        { id: 'intro', label: 'What is ImpactCheck?' },
        { id: 'quickstart', label: 'Quick Start' },
        { id: 'understanding-findings', label: 'Understanding Findings' },
      ],
    },
    {
      title: 'Input Methods',
      items: [
        { id: 'input-zip', label: 'Project ZIP Archives' },
        { id: 'input-folders', label: 'Local Project Folders' },
        { id: 'input-compare', label: 'Comparing Two Folders' },
        { id: 'input-git-diff', label: 'Git Diffs & Patches' },
      ],
    },
    {
      title: 'Analysis Engine',
      items: [
        { id: 'analysis-api', label: 'API & Route Changes' },
        { id: 'analysis-authz', label: 'Auth & Permission Guards' },
        { id: 'analysis-db', label: 'Database Migrations' },
        { id: 'analysis-deps', label: 'Dependency Auditing' },
        { id: 'analysis-env', label: 'Environment Variables' },
        { id: 'analysis-tests', label: 'Test Coverage Impact' },
        { id: 'analysis-noise', label: 'Change Noise Filtering' },
      ],
    },
    {
      title: 'Reports & Export',
      items: [
        { id: 'reports-export', label: 'Markdown, JSON & HTML' },
        { id: 'reports-checklist', label: 'Review Checklist' },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        { id: 'privacy-local', label: 'Local-First Execution' },
        { id: 'security-untrusted', label: 'Untrusted Code Handling' },
        { id: 'security-osv', label: 'OSV Advisory Lookups' },
      ],
    },
  ];

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Mobile TOC Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span>Documentation Index</span>
            </button>
          </div>

          {/* Left Navigation Sidebar */}
          <aside
            className={`${
              mobileNavOpen ? 'block' : 'hidden'
            } lg:block lg:col-span-3 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 space-y-6 text-xs border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 pb-6 lg:pb-0`}
          >
            {navSections.map((sec) => (
              <div key={sec.title} className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {sec.title}
                </div>
                <ul className="space-y-1">
                  {sec.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="text-left py-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer w-full truncate"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* Main Article Content */}
          <article className="lg:col-span-9 max-w-3xl space-y-12 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
            {/* Header intro */}
            <div id="intro" className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
                Documentation
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">
                ImpactCheck Technical Guide
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                ImpactCheck is a deterministic code review assistant designed to analyze changesets before merge. It inspects touched code boundaries across APIs, authentication guards, dependencies, database schemas, and test coverage to flag review focus areas.
              </p>
            </div>

            {/* Quickstart */}
            <section id="quickstart" className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Quick Start
              </h2>
              <p>
                To evaluate code changes, open the <Link to="/app" className="underline font-medium text-neutral-950 dark:text-white">Analyzer Workbench</Link> and provide changes via any supported input method:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419]">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">Upload Project ZIP</div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Upload an uncompressed project or repository archive for automatic framework and change detection.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#111419]">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">Paste Unified Diff</div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Run <code className="font-mono text-neutral-800 dark:text-neutral-200">git diff main...HEAD</code> in your terminal and paste the raw text.
                  </p>
                </div>
              </div>
            </section>

            {/* Understanding Findings */}
            <section id="understanding-findings" className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Understanding Review Findings
              </h2>
              <p>
                Findings represent concrete detection signals that warrant deliberate human inspection before merging. Each finding provides:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong className="text-neutral-900 dark:text-neutral-100">Severity:</strong> Evidence-based priority (HIGH, MEDIUM, REVIEW, LOW) reflecting potential impact severity.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Confidence:</strong> How strongly concrete syntax patterns (e.g. structured route normalization vs generic file touches) establish the detection.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Before & After Evidence:</strong> Concise snippets showing exact removed and added tokens.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Why It Matters:</strong> Plain explanation of potential runtime consequences.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Suggested Action:</strong> Actionable steps to verify before approval.</li>
              </ul>
            </section>

            {/* Input Methods */}
            <section id="input-zip" className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Input Methods
              </h2>

              <div className="space-y-3">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  1. Project ZIP Archives
                </h3>
                <p>
                  ImpactCheck extracts ZIP files entirely in-browser using WebAssembly/JavaScript memory buffers. Built-in Zip-Slip path sanitization prevents directory traversal attacks, and files larger than 2MB or containing binary media are ignored to preserve browser performance.
                </p>

                <h3 id="input-folders" className="font-semibold text-neutral-900 dark:text-neutral-100 pt-2">
                  2. Local Project Folders
                </h3>
                <p>
                  Select a directory tree via the standard browser Directory API (<code className="font-mono">webkitdirectory</code>). ImpactCheck automatically detects framework structure, primary languages, and filters out noise directories (<code className="font-mono">node_modules</code>, <code className="font-mono">dist</code>, <code className="font-mono">.git</code>).
                </p>

                <h3 id="input-compare" className="font-semibold text-neutral-900 dark:text-neutral-100 pt-2">
                  3. Comparing Before & After Folders
                </h3>
                <p>
                  Provide two folders representing the "Before" baseline and "After" state. ImpactCheck computes recursive file tree maps and generates line-level unified diffs using the Myers / Longest Common Subsequence (LCS) diffing algorithm.
                </p>

                <h3 id="input-git-diff" className="font-semibold text-neutral-900 dark:text-neutral-100 pt-2">
                  4. Git Diffs & Patches
                </h3>
                <p>
                  Upload or paste standard unified Git diffs:
                </p>
                <div className="p-3 rounded-lg bg-[#090b0e] text-neutral-200 font-mono text-[11px] space-y-1 border border-neutral-800">
                  <div className="text-neutral-500"># Diff against target branch:</div>
                  <div>git diff origin/main...HEAD &gt; review.diff</div>
                  <div className="text-neutral-500 pt-1"># Diff of last commit:</div>
                  <div>git show HEAD &gt; commit.patch</div>
                </div>
              </div>
            </section>

            {/* Analysis Engine Details */}
            <section id="analysis-api" className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Analysis Engine Heuristics
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    API Route & Contract Normalization
                  </h3>
                  <p>
                    The API analyzer normalizes endpoints into structured records (HTTP method, path, middleware list). When a route retains its path and method but its middleware is altered, ImpactCheck does NOT falsely report a route deletion and addition; instead, it detects structured middleware modifications.
                  </p>
                </div>

                <div id="analysis-authz" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Authentication vs. Authorization Separation
                  </h3>
                  <p>
                    ImpactCheck distinguishes identity validation (authentication: tokens, session cookies, password hashing) from access-control boundaries (authorization: role checks, admin guards, permission middleware). Changes touching permission guards are tagged under <code className="font-mono">authorization</code> with HIGH severity.
                  </p>
                </div>

                <div id="analysis-db" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Database Schema & Destructive Migrations
                  </h3>
                  <p>
                    Audits SQL migrations, Prisma schemas, and Drizzle definitions for destructive keywords (<code className="font-mono">DROP TABLE</code>, <code className="font-mono">DROP COLUMN</code>, <code className="font-mono">TRUNCATE</code>, unbounded <code className="font-mono">DELETE</code>). Identical SQL statements (like <code className="font-mono">ALTER TABLE users DROP COLUMN phone;</code>) are deduplicated into a single unified finding.
                  </p>
                </div>

                <div id="analysis-deps" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Dependency Manifests & Version Bumps
                  </h3>
                  <p>
                    Parses <code className="font-mono">package.json</code> and <code className="font-mono">requirements.txt</code>. Semver major upgrades are marked with evidence-based MEDIUM severity and HIGH confidence.
                  </p>
                </div>

                <div id="analysis-env" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Environment Variables with Fallbacks
                  </h3>
                  <p>
                    Distinguishes mandatory environment variables without fallbacks (<code className="font-mono">process.env.VAR</code>) from optional variables with inline defaults (<code className="font-mono">process.env.VAR || 'default'</code>). Fallback-backed references are assigned non-blocking LOW priority.
                  </p>
                </div>

                <div id="analysis-tests" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Test Impact Assessment
                  </h3>
                  <p>
                    Heuristically verifies whether touched core service files are accompanied by corresponding test updates in the changeset. Results are carefully qualified as "No corresponding test-file change detected" rather than asserting that tests are missing in the repository.
                  </p>
                </div>

                <div id="analysis-noise" className="space-y-1.5">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Change Noise & Machine Churn
                  </h3>
                  <p>
                    Separates machine artifacts (package lockfiles, build bundles, source maps) from substantive application logic so reviewers can focus on real architectural alterations.
                  </p>
                </div>
              </div>
            </section>

            {/* Reports & Exports */}
            <section id="reports-export" className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Reports & Export Formats
              </h2>
              <p>
                ImpactCheck exports review summaries in multiple developer-friendly formats:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-neutral-900 dark:text-neutral-100">Markdown:</strong> Ready to paste directly into GitHub/GitLab pull requests or review comments.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">JSON:</strong> Structured machine-readable schema for CI/CD pipeline automation.</li>
                <li><strong className="text-neutral-900 dark:text-neutral-100">Standalone HTML:</strong> Styled single-file document suitable for offline archiving.</li>
              </ul>
            </section>

            {/* Privacy & Security */}
            <section id="privacy-local" className="space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                Privacy & Security Architecture
              </h2>
              <p>
                ImpactCheck operates as a local-first browser workstation. Uploaded files are treated as untrusted data, zero code execution is performed, and only minimal package/version strings are transmitted when optional OSV queries are active. Review our full <Link to="/security" className="underline font-medium text-neutral-950 dark:text-white">Security Model</Link> and <Link to="/privacy" className="underline font-medium text-neutral-950 dark:text-white">Privacy Policy</Link>.
              </p>
            </section>
          </article>
        </div>
      </div>

      <Footer />
    </div>
  );
};
