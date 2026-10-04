/**
 * Centralized public URL and document metadata resolution for DiffGuard.
 * Production canonical origin: https://diffguardapp.vercel.app
 */

export const DEFAULT_PRODUCTION_URL = 'https://diffguardapp.vercel.app';

export function getAppUrl(path = ''): string {
  let origin = '';

  // Optional override from environment variable if explicitly defined and non-empty
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_APP_URL as string | undefined) : undefined;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    origin = envUrl.trim().replace(/\/+$/, '');
  } else if (typeof window !== 'undefined' && window.location?.origin) {
    const locOrigin = window.location.origin.replace(/\/+$/, '');
    // Never expose an internal development origin (ais-dev-, .run.app) as canonical
    if (!locOrigin.includes('ais-dev-') && !locOrigin.includes('.run.app')) {
      origin = locOrigin;
    } else {
      origin = DEFAULT_PRODUCTION_URL;
    }
  } else {
    origin = DEFAULT_PRODUCTION_URL;
  }

  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return origin ? `${origin}${cleanPath}` : cleanPath || '/';
}

interface PageMetaConfig {
  title: string;
  description: string;
  robots: 'index, follow' | 'noindex, nofollow';
}

const PAGE_METADATA: Record<string, PageMetaConfig> = {
  '/': {
    title: 'DiffGuard — Code Change Impact Analysis',
    description: 'Understand what your code changes could affect. Analyze diffs and project changes across APIs, dependencies, configuration, databases, authentication, and tests before merging.',
    robots: 'index, follow',
  },
  '/docs': {
    title: 'DiffGuard Documentation — Technical Review Guide',
    description: 'Comprehensive guide to DiffGuard static analysis heuristics, input methods, change map relationships, and report exports.',
    robots: 'index, follow',
  },
  '/security': {
    title: 'DiffGuard Security Model — Local-First Code Safety',
    description: 'Learn how DiffGuard processes untrusted project files with zero code execution, sandboxed browser analysis, and safe ZIP extraction.',
    robots: 'index, follow',
  },
  '/privacy': {
    title: 'DiffGuard Privacy Policy — Client-Side Processing Guarantees',
    description: 'Client-side processing guarantees, local browser storage details, and transparent minimal OSV network lookups.',
    robots: 'index, follow',
  },
  '/about': {
    title: 'About DiffGuard — Code Review Intelligence',
    description: 'Learn why DiffGuard was built, what engineering challenges it solves, and how its deterministic analysis engine works.',
    robots: 'index, follow',
  },

  // Private application workspaces and internal views (prevent search-engine indexing)
  '/app': {
    title: 'DiffGuard — Analysis Workbench',
    description: 'Interactive code change review workbench with structured route analysis, breaking change watchlists, and dependency auditing.',
    robots: 'noindex, nofollow',
  },
  '/app/analyze': {
    title: 'DiffGuard — Analysis Workbench',
    description: 'Interactive code change review workbench with structured route analysis, breaking change watchlists, and dependency auditing.',
    robots: 'noindex, nofollow',
  },
  '/report': {
    title: 'DiffGuard — Impact Analysis Report',
    description: 'Detailed code review impact report with prioritized findings, change signatures, and verification checklists.',
    robots: 'noindex, nofollow',
  },
  '/app/report': {
    title: 'DiffGuard — Impact Analysis Report',
    description: 'Detailed code review impact report with prioritized findings, change signatures, and verification checklists.',
    robots: 'noindex, nofollow',
  },
  '/history': {
    title: 'DiffGuard — Analysis History',
    description: 'Reopen recent project analyses stored locally in browser storage.',
    robots: 'noindex, nofollow',
  },
  '/app/history': {
    title: 'DiffGuard — Analysis History',
    description: 'Reopen recent project analyses stored locally in browser storage.',
    robots: 'noindex, nofollow',
  },
  '/settings': {
    title: 'DiffGuard — Settings',
    description: 'Configure analysis preferences, diff display modes, and developer keyboard shortcuts.',
    robots: 'noindex, nofollow',
  },
  '/app/settings': {
    title: 'DiffGuard — Settings',
    description: 'Configure analysis preferences, diff display modes, and developer keyboard shortcuts.',
    robots: 'noindex, nofollow',
  },
};

/**
 * Updates head metadata (canonical URL, og:url, title, descriptions, robots) dynamically
 * to ensure that all share/crawler cards match the active host without requiring VITE_APP_URL.
 */
export function syncDocumentMetadata(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  if (typeof document === 'undefined') return;

  const currentUrl = getAppUrl(pathname);
  const meta = PAGE_METADATA[pathname] || {
    title: 'DiffGuard — Page Not Found',
    description: 'The requested route does not exist.',
    robots: 'noindex, nofollow',
  };

  // Title
  document.title = meta.title;

  // Description
  let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!descEl) {
    descEl = document.createElement('meta');
    descEl.setAttribute('name', 'description');
    document.head.appendChild(descEl);
  }
  descEl.content = meta.description;

  // Robots
  let robotsEl = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!robotsEl) {
    robotsEl = document.createElement('meta');
    robotsEl.setAttribute('name', 'robots');
    document.head.appendChild(robotsEl);
  }
  robotsEl.content = meta.robots;

  // Canonical tag
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.rel = 'canonical';
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.href = currentUrl;

  // Open Graph
  let ogTitleEl = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
  if (ogTitleEl) ogTitleEl.content = meta.title;

  let ogDescEl = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
  if (ogDescEl) ogDescEl.content = meta.description;

  let ogUrlEl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
  if (!ogUrlEl) {
    ogUrlEl = document.createElement('meta');
    ogUrlEl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrlEl);
  }
  ogUrlEl.content = currentUrl;

  // Twitter
  let twitterTitleEl = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
  if (twitterTitleEl) twitterTitleEl.content = meta.title;

  let twitterDescEl = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
  if (twitterDescEl) twitterDescEl.content = meta.description;

  let twitterUrlEl = document.querySelector('meta[name="twitter:url"]') as HTMLMetaElement | null;
  if (!twitterUrlEl) {
    twitterUrlEl = document.createElement('meta');
    twitterUrlEl.setAttribute('name', 'twitter:url');
    document.head.appendChild(twitterUrlEl);
  }
  twitterUrlEl.content = currentUrl;

  // Update JSON-LD script if present
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
  if (jsonLdScript && jsonLdScript.textContent) {
    try {
      const data = JSON.parse(jsonLdScript.textContent);
      data.url = getAppUrl('');
      data.name = 'DiffGuard';
      data.description = meta.description;
      jsonLdScript.textContent = JSON.stringify(data, null, 2);
    } catch {
      // Ignore if unparseable
    }
  }
}
