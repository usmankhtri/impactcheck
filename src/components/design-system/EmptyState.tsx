import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto my-auto">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 mb-3 shadow-2xs">
        <Icon className="h-5 w-5 stroke-[1.5]" />
      </div>
      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
