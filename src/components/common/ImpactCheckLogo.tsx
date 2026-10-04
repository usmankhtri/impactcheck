import React from 'react';

interface ImpactCheckLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ImpactCheckMark: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="currentColor" className="text-neutral-900 dark:text-neutral-100" />
      <path
        d="M8 16.5L13.5 22L24.5 10.5"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white dark:text-neutral-950"
      />
      <circle
        cx="24.5"
        cy="22"
        r="1.75"
        fill="currentColor"
        className="text-neutral-400 dark:text-neutral-600"
      />
    </svg>
  );
};

export const ImpactCheckLogo: React.FC<ImpactCheckLogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const markSize = size === 'sm' ? 20 : size === 'lg' ? 32 : 24;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <ImpactCheckMark size={markSize} />
      {showText && (
        <span className={`${textSize} font-bold tracking-tight text-neutral-950 dark:text-white font-sans flex items-center`}>
          Impact<span className="font-normal text-neutral-600 dark:text-neutral-400">Check</span>
        </span>
      )}
    </div>
  );
};
