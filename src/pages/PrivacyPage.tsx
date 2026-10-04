import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HardDrive, Globe, EyeOff } from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 font-mono">
            Privacy Policy
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mt-1">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
            ImpactCheck is designed with a privacy-first, local-execution architecture. We believe developer source code should not be sent to external servers for heuristic review.
          </p>
        </div>

        <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {/* Section 1 */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              <HardDrive className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>1. What Stays Strictly Local</span>
            </div>
            <p>
              When you paste a Git diff, drop a project ZIP, or select a local folder, all file extraction, lexical parsing, relationship mapping, and rule evaluations execute entirely within your web browser’s JavaScript environment.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-400">
              <li>Your source code files are never sent to remote servers or third-party AI APIs.</li>
              <li>Your analysis snapshots and review history remain stored in your browser’s local storage.</li>
              <li>Your workbench settings and UI preferences remain local to your current device.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              <Globe className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>2. What May Leave the Browser</span>
            </div>
            <p>
              ImpactCheck includes an optional dependency vulnerability scanner. When this feature is active, ImpactCheck queries the public Open Source Vulnerabilities (OSV) database (<code className="font-mono">api.osv.dev</code>).
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              This request contains <strong>only</strong> the package name, version, and ecosystem (for example, <code className="font-mono">&quot;lodash&quot;, &quot;4.17.21&quot;, &quot;npm&quot;</code>). No repository names, private source code, commit hashes, or author identities are ever transmitted. You can disable vulnerability lookups entirely in <Link to="/settings" className="underline font-medium text-neutral-950 dark:text-white">Settings</Link>.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              <EyeOff className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>3. No Account Collection or Third-Party Tracking</span>
            </div>
            <p>
              ImpactCheck requires no account creation, no sign-in credentials, and does not sell or distribute user information. We do not embed behavioral advertising trackers or invasive telemetry scripts.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111419] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              <ShieldCheck className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
              <span>4. Data Retention and Deletion</span>
            </div>
            <p>
              Because your data resides exclusively in your browser’s <code className="font-mono">localStorage</code>, you maintain absolute control over retention. You can clear your analysis history at any time from the <Link to="/history" className="underline font-medium text-neutral-950 dark:text-white">History page</Link>, the Settings modal, or through standard browser cookie and site data deletion controls.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
