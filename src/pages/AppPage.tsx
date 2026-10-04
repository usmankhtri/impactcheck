import React from 'react';
import { Header } from '../components/common/Header';
import { DiffWorkbench } from '../components/workbench/DiffWorkbench';

export const AppPage: React.FC = () => {
  return (
    <div className="h-screen sm:h-dvh flex flex-col bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100 overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <DiffWorkbench />
      </main>
    </div>
  );
};
