/**
 * ImpactCheck Design Tokens
 * Centralized design system definitions for consistent layout, surfaces, typography,
 * borders, shadows, and status colors across every public and application surface.
 */

export const TOKENS = {
  // Surfaces & Backgrounds
  pageBg: 'bg-white dark:bg-[#0b0d10] text-neutral-900 dark:text-neutral-100',
  surface: 'bg-white dark:bg-[#111419]',
  surfaceSubtle: 'bg-neutral-50 dark:bg-[#15181f]',
  surfaceElevated: 'bg-white dark:bg-[#191d24]',
  codeSurface: 'bg-[#090b0e] text-neutral-200 border-neutral-800',

  // Borders
  border: 'border-neutral-200 dark:border-neutral-800',
  borderSubtle: 'border-neutral-100 dark:border-neutral-800/60',
  borderHover: 'hover:border-neutral-400 dark:hover:border-neutral-700',

  // Typography
  textPrimary: 'text-neutral-950 dark:text-neutral-100',
  textSecondary: 'text-neutral-600 dark:text-neutral-400',
  textMuted: 'text-neutral-400 dark:text-neutral-500',
  textCode: 'font-mono text-xs',

  // Status & Priority Tokens (WCAG AA Compliant in both themes)
  status: {
    high: {
      border: 'border-rose-300 dark:border-rose-900/60',
      bg: 'bg-rose-50/70 dark:bg-rose-950/25',
      badge: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50',
      text: 'text-rose-700 dark:text-rose-400',
    },
    medium: {
      border: 'border-amber-300 dark:border-amber-900/60',
      bg: 'bg-amber-50/70 dark:bg-amber-950/25',
      badge: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50',
      text: 'text-amber-700 dark:text-amber-400',
    },
    review: {
      border: 'border-neutral-300 dark:border-neutral-700',
      bg: 'bg-neutral-50 dark:bg-neutral-900/40',
      badge: 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700',
      text: 'text-neutral-700 dark:text-neutral-300',
    },
    low: {
      border: 'border-blue-200 dark:border-blue-900/50',
      bg: 'bg-blue-50/50 dark:bg-blue-950/25',
      badge: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50',
      text: 'text-blue-700 dark:text-blue-400',
    },
    success: {
      border: 'border-emerald-300 dark:border-emerald-900/60',
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
      badge: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
  },

  // Focus Ring
  focusRing: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',

  // Controls Heights & Radii
  inputHeight: 'h-9 px-3',
  inputHeightSm: 'h-7.5 px-2.5',
  buttonHeight: 'h-9 px-4',
  buttonHeightSm: 'h-7.5 px-3',
  radius: 'rounded-lg',
  radiusSm: 'rounded-md',
  radiusLg: 'rounded-xl',
};
