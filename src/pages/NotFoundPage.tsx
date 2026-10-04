import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowRight, Home } from 'lucide-react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 mb-4 shadow-2xs">
          <FileQuestion className="h-6 w-6 stroke-[1.5]" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
          Page not found
        </h1>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          The requested route does not exist or has been moved. You can return to the code review analyzer or browse documentation.
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs"
          >
            <span>Back to Analyzer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition-colors border border-neutral-200 dark:border-neutral-800"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
