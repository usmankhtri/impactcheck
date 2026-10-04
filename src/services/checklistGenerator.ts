import { Finding } from '../types/finding';
import { ReviewChecklistItem } from '../types/checklist';

export function generateChecklistFromFindings(findings: Finding[]): ReviewChecklistItem[] {
  const items: ReviewChecklistItem[] = [];
  const addedCategories = new Set<string>();

  const activeFindings = findings.filter((f) => !f.isDismissed);

  // Group high-level review checks by category
  for (const finding of activeFindings) {
    if (finding.category === 'api' && !addedCategories.has('api')) {
      addedCategories.add('api');
      items.push({
        id: 'chk-api-consumers',
        category: 'API',
        title: 'Verify backward compatibility with mobile, web, and external API consumers',
        completed: false,
      });
      items.push({
        id: 'chk-api-status',
        category: 'API',
        title: 'Validate endpoint status codes, error payloads, and parameter formats',
        completed: false,
      });
    }

    if (finding.category === 'authentication' && !addedCategories.has('auth')) {
      addedCategories.add('auth');
      items.push({
        id: 'chk-auth-tokens',
        category: 'Authentication',
        title: 'Audit token validation, session lifecycle, and cookie security flags',
        completed: false,
      });
      items.push({
        id: 'chk-auth-rbac',
        category: 'Authentication',
        title: 'Verify role-based authorization guards on affected routes',
        completed: false,
      });
    }

    if (finding.category === 'database' && !addedCategories.has('db')) {
      addedCategories.add('db');
      items.push({
        id: 'chk-db-rollback',
        category: 'Database',
        title: 'Test migration rollback plan and ensure backward compatibility during deploy',
        completed: false,
      });
      items.push({
        id: 'chk-db-locks',
        category: 'Database',
        title: 'Check database lock times and table access contention during migration execution',
        completed: false,
      });
    }

    if (finding.category === 'configuration' && !addedCategories.has('config')) {
      addedCategories.add('config');
      items.push({
        id: 'chk-config-env',
        category: 'Configuration',
        title: 'Confirm new environment variables exist in CI secrets, staging, and production',
        completed: false,
      });
      items.push({
        id: 'chk-config-build',
        category: 'Configuration',
        title: 'Ensure local build scripts and CI pipeline definitions succeed',
        completed: false,
      });
    }

    if (finding.category === 'dependencies' && !addedCategories.has('deps')) {
      addedCategories.add('deps');
      items.push({
        id: 'chk-deps-release',
        category: 'Dependencies',
        title: 'Read upstream release notes for updated or major version dependency bumps',
        completed: false,
      });
      items.push({
        id: 'chk-deps-osv',
        category: 'Dependencies',
        title: 'Perform vulnerability lookup on newly introduced third-party libraries',
        completed: false,
      });
    }

    if (finding.category === 'tests' && !addedCategories.has('tests')) {
      addedCategories.add('tests');
      items.push({
        id: 'chk-tests-run',
        category: 'Tests',
        title: 'Run affected test suites and assess whether new test coverage is warranted',
        completed: false,
      });
    }

    if (finding.category === 'frontend' && !addedCategories.has('frontend')) {
      addedCategories.add('frontend');
      items.push({
        id: 'chk-frontend-ui',
        category: 'Frontend',
        title: 'Inspect UI client error boundary behavior and network request state handlers',
        completed: false,
      });
    }
  }

  // Baseline items if nothing triggered
  if (items.length === 0) {
    items.push({
      id: 'chk-general-diff',
      category: 'General',
      title: 'Review changed lines and confirm commit scope',
      completed: false,
    });
    items.push({
      id: 'chk-general-tests',
      category: 'General',
      title: 'Run test suite locally to prevent unintended regressions',
      completed: false,
    });
  }

  return items;
}
