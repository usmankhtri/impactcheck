import { ParsedDiff } from '../types/diff';
import { Finding, FindingsSummary } from '../types/finding';
import { DependencyChange } from '../types/dependency';
import { ReviewChecklistItem } from '../types/checklist';
import { DiffGuardReport } from '../types/report';
import { getAppUrl } from '../utils/url';

export function buildReportObject(
  parsedDiff: ParsedDiff,
  findings: Finding[],
  summary: FindingsSummary,
  dependencies: DependencyChange[],
  checklist: ReviewChecklistItem[]
): DiffGuardReport {
  const activeFindings = findings.filter((f) => !f.isDismissed);
  const completedChecklist = checklist.filter((c) => c.completed).length;

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    tool: {
      name: 'DiffGuard',
      version: '1.0.0',
      description: 'Developer review assistant that analyzes Git diffs for potential impact.',
      url: getAppUrl(''),
    },
    summary: {
      totalFilesChanged: parsedDiff.totalFiles,
      totalAdditions: parsedDiff.totalAdditions,
      totalDeletions: parsedDiff.totalDeletions,
      findingsCount: activeFindings.length,
      signalsCount: summary.totalSignals || activeFindings.length,
      checklistProgress: {
        total: checklist.length,
        completed: completedChecklist,
        percentage: checklist.length > 0 ? Math.round((completedChecklist / checklist.length) * 100) : 100,
      },
      breakdown: summary,
    },
    files: parsedDiff.files.map((f) => ({
      path: f.newPath,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      findingsCount: activeFindings.filter((find) => find.affectedFile === f.newPath).length,
    })),
    findings: activeFindings,
    dependencies,
    checklist,
    disclaimers: [
      'DiffGuard provides deterministic static heuristics and recommendations for human code review.',
      'Analysis results do not constitute a formal security audit or a guarantee of bug-free deployment.',
      'Test impact assessment is heuristic and based solely on files included in this diff.',
      'Vulnerability checks leverage the public OSV database; absence of an advisory does not guarantee security.',
    ],
  };
}

export function generateMarkdownReport(report: DiffGuardReport): string {
  const { summary, files, findings, dependencies, checklist, disclaimers } = report;

  let md = `# DiffGuard Code Review Impact Report\n\n`;
  md += `**Generated**: ${new Date(report.generatedAt).toUTCString()}\n`;
  md += `**Tool**: ${report.tool.name} v${report.tool.version}${report.tool.url ? ` (${report.tool.url})` : ''}\n\n`;

  md += `## 1. Executive Summary\n\n`;
  md += `- **Files Changed**: ${summary.totalFilesChanged}\n`;
  md += `- **Line Delta**: +${summary.totalAdditions} / -${summary.totalDeletions}\n`;
  md += `- **Unique Review Findings**: ${summary.findingsCount}\n`;
  md += `- **Underlying Detection Signals**: ${summary.signalsCount || summary.findingsCount}\n`;
  md += `  - High Priority: ${summary.breakdown.byPriority.HIGH}\n`;
  md += `  - Medium Priority: ${summary.breakdown.byPriority.MEDIUM}\n`;
  md += `  - Review Recommended: ${summary.breakdown.byPriority.REVIEW}\n`;
  md += `  - Low Priority: ${summary.breakdown.byPriority.LOW}\n`;
  md += `- **Checklist Progress**: ${summary.checklistProgress.completed}/${summary.checklistProgress.total} completed (${summary.checklistProgress.percentage}%)\n\n`;

  md += `## 2. Changed Files\n\n`;
  md += `| File | Status | Lines Changed | Findings |\n`;
  md += `| :--- | :--- | :---: | :---: |\n`;
  for (const f of files) {
    md += `| \`${f.path}\` | ${f.status} | +${f.additions} / -${f.deletions} | ${f.findingsCount} |\n`;
  }
  md += `\n`;

  md += `## 3. Review Findings & Evidence\n\n`;
  if (findings.length === 0) {
    md += `_No specific high-priority risk patterns or boundary alterations were detected in this diff._\n\n`;
  } else {
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      md += `### ${i + 1}. [${f.priority}] ${f.title}\n\n`;
      md += `- **Finding ID**: \`${f.id}\`\n`;
      md += `- **Category**: ${f.category}\n`;
      md += `- **Severity**: ${f.priority} | **Confidence**: ${f.confidence || 'HIGH'}\n`;
      md += `- **File**: \`${f.affectedFile}\`${f.evidence.lineNumber ? ` (Line ${f.evidence.lineNumber})` : ''}\n`;
      if (f.changeType) {
        md += `- **What Changed**: ${f.changeType}\n`;
      }
      md += `- **Why It Matters**: ${f.explanation}\n`;
      md += `- **Suggested Review Action**: ${f.suggestedAction}\n`;

      if (f.evidence.beforeSnippet || f.evidence.afterSnippet) {
        md += `\n**Before / After Evidence**:\n`;
        if (f.evidence.beforeSnippet) {
          md += `- **Before**: \`${f.evidence.beforeSnippet}\`\n`;
        }
        if (f.evidence.afterSnippet) {
          md += `- **After**: \`${f.evidence.afterSnippet}\`\n`;
        }
      }

      if (f.evidence.snippet) {
        md += `\n**Diff Excerpt**:\n\`\`\`\n${f.evidence.snippet}\n\`\`\`\n`;
      }

      if (f.detectionSignals && f.detectionSignals.length > 0) {
        md += `\n- **Correlated Detection Signals**: ${f.detectionSignals.join(', ')}\n`;
      }

      if (f.relatedFindingIds && f.relatedFindingIds.length > 0) {
        md += `- **Related Findings**: ${f.relatedFindingIds.map((id) => `\`${id}\``).join(', ')}\n`;
      }

      if (f.limitations) {
        md += `\n*Note on heuristic*: ${f.limitations}\n`;
      }
      md += `\n---\n\n`;
    }
  }

  if (dependencies.length > 0) {
    md += `## 4. Dependency Changes\n\n`;
    md += `| Package | Ecosystem | Change | Old Version | New Version | Major Bump? |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :---: |\n`;
    for (const d of dependencies) {
      md += `| **${d.name}** | ${d.ecosystem} | ${d.changeType} | ${d.oldVersion || '-'} | ${d.newVersion || '-'} | ${d.isMajorBump ? 'Yes' : 'No'} |\n`;
    }
    md += `\n`;
  }

  md += `## 5. Review Checklist\n\n`;
  for (const c of checklist) {
    md += `- [${c.completed ? 'x' : ' '}] **[${c.category}]** ${c.title}\n`;
  }
  md += `\n`;

  md += `## 6. Disclaimers & Limitations\n\n`;
  for (const d of disclaimers) {
    md += `- ${d}\n`;
  }
  md += `\n`;

  return md;
}

export function generatePlainTextReport(report: DiffGuardReport): string {
  const { summary, files, findings, checklist } = report;
  let text = `==================================================\n`;
  text += `DIFFGUARD CODE REVIEW REPORT\n`;
  text += `Generated: ${new Date(report.generatedAt).toUTCString()}\n`;
  text += `==================================================\n\n`;

  text += `SUMMARY:\n`;
  text += `Files changed: ${summary.totalFilesChanged} (+${summary.totalAdditions} / -${summary.totalDeletions})\n`;
  text += `Unique review findings: ${summary.findingsCount} (${summary.signalsCount || summary.findingsCount} signals)\n`;
  text += `Checklist: ${summary.checklistProgress.completed}/${summary.checklistProgress.total} completed\n\n`;

  text += `REVIEW FINDINGS:\n`;
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    text += `[${f.priority}] ${f.title}\n`;
    text += `File: ${f.affectedFile}${f.evidence.lineNumber ? `:${f.evidence.lineNumber}` : ''}\n`;
    text += `Confidence: ${f.confidence || 'HIGH'} | Category: ${f.category}\n`;
    text += `Explanation: ${f.explanation}\n`;
    text += `Action: ${f.suggestedAction}\n`;
    if (f.evidence.beforeSnippet) text += `Before: ${f.evidence.beforeSnippet}\n`;
    if (f.evidence.afterSnippet) text += `After: ${f.evidence.afterSnippet}\n`;
    text += `--------------------------------------------------\n`;
  }

  return text;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateHtmlReport(report: DiffGuardReport): string {
  const { summary, files, findings, dependencies, checklist, disclaimers } = report;

  const findingsHtml = findings.length === 0
    ? '<p style="color: #64748b;">No specific high-priority risk patterns or boundary alterations were detected in this diff.</p>'
    : findings.map((f, i) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; background: ${f.priority === 'HIGH' ? '#fee2e2; color: #991b1b' : f.priority === 'MEDIUM' ? '#fef3c7; color: #92400e' : '#f1f5f9; color: #334155'};">${escapeHtml(f.priority)}</span>
          <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">${escapeHtml(f.category)}</span>
          <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">${escapeHtml(f.confidence || 'HIGH')} Conf</span>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(f.title)}</h3>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #334155;"><strong>File:</strong> <code>${escapeHtml(f.affectedFile)}</code>${f.evidence.lineNumber ? ` (Line ${f.evidence.lineNumber})` : ''}</p>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #334155;">${escapeHtml(f.explanation)}</p>
        <div style="background: #f8fafc; border-left: 3px solid #0f172a; padding: 8px 12px; font-size: 12px; color: #1e293b; margin-top: 8px;">
          <strong>Suggested Action:</strong> ${escapeHtml(f.suggestedAction)}
        </div>
        ${f.evidence.snippet ? `<pre style="background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; margin-top: 10px;"><code>${escapeHtml(f.evidence.snippet)}</code></pre>` : ''}
      </div>
    `).join('');

  const filesHtml = files.map((f) => `
    <tr>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 12px;">${escapeHtml(f.path)}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">${escapeHtml(f.status)}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-family: monospace;">+${f.additions}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-family: monospace;">-${f.deletions}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${f.findingsCount}</td>
    </tr>
  `).join('');

  const depsHtml = dependencies.length > 0 ? `
    <h2>Dependency Modifications</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f8fafc; text-align: left; font-size: 12px;">
          <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Package</th>
          <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Ecosystem</th>
          <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Change</th>
          <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Old</th>
          <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">New</th>
        </tr>
      </thead>
      <tbody>
        ${dependencies.map((d) => `
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; font-size: 12px;">${escapeHtml(d.name)}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-transform: uppercase; font-size: 11px;">${escapeHtml(d.ecosystem)}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px;">${escapeHtml(d.changeType)}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${escapeHtml(d.oldVersion || '-')}</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${escapeHtml(d.newVersion || '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const checklistHtml = checklist.length > 0 ? `
    <h2>Review Verification Checklist</h2>
    <ul style="list-style: none; padding: 0; font-size: 13px;">
      ${checklist.map((c) => `
        <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <input type="checkbox" ${c.completed ? 'checked' : ''} disabled style="margin-right: 8px;" />
          <strong>[${escapeHtml(c.category)}]</strong> ${escapeHtml(c.title)}
        </li>
      `).join('')}
    </ul>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DiffGuard Review Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #0f172a; max-width: 900px; margin: 40px auto; padding: 0 24px; background: #ffffff; }
    h1 { font-size: 24px; margin-bottom: 4px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
    h2 { font-size: 16px; margin: 28px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    code { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 12px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; background: #f8fafc; }
    .metric-val { font-size: 20px; font-weight: bold; font-family: monospace; }
    .metric-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; }
    @media (max-width: 640px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <h1>DiffGuard Review Impact Report</h1>
  <div class="meta">
    Generated on ${escapeHtml(new Date(report.generatedAt).toUTCString())} · DiffGuard v${escapeHtml(report.tool.version)}
  </div>

  <div class="metric-grid">
    <div class="metric-box">
      <div class="metric-val">${summary.totalFilesChanged}</div>
      <div class="metric-lbl">Files Changed</div>
    </div>
    <div class="metric-box">
      <div class="metric-val">+${summary.totalAdditions} / -${summary.totalDeletions}</div>
      <div class="metric-lbl">Lines Changed</div>
    </div>
    <div class="metric-box">
      <div class="metric-val">${summary.findingsCount}</div>
      <div class="metric-lbl">Review Findings</div>
    </div>
    <div class="metric-box">
      <div class="metric-val">${summary.checklistProgress.completed}/${summary.checklistProgress.total}</div>
      <div class="metric-lbl">Checklist</div>
    </div>
  </div>

  <h2>Changed Files (${files.length})</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="background: #f8fafc; text-align: left; font-size: 12px;">
        <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">File Path</th>
        <th style="padding: 8px 12px; border: 1px solid #e2e8f0;">Status</th>
        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Additions</th>
        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Deletions</th>
        <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;">Findings</th>
      </tr>
    </thead>
    <tbody>
      ${filesHtml}
    </tbody>
  </table>

  <h2>Review Findings &amp; Evidence (${findings.length})</h2>
  ${findingsHtml}

  ${depsHtml}

  ${checklistHtml}

  <h2>Disclaimers &amp; Limitations</h2>
  <ul style="font-size: 12px; color: #64748b; padding-left: 20px;">
    ${disclaimers.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
  </ul>
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, type: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

