import { DiffFile, AnalysisMode, AnalysisContext } from '../../types/diff';
import { Finding } from '../../types/finding';
import { Rule } from '../types';

const ENV_USAGE_REGEX = /(?:process\.env|import\.meta\.env)\.([A-Z0-9_]{3,})/g;
const PY_ENV_USAGE_REGEX = /os\.environ(?:\.get)?\(['"]([A-Z0-9_]{3,})['"](?:\s*,\s*([^)]+))?\)/g;

const ENV_FILE_LINE_PATTERN = /^\+?\s*([A-Z0-9_]{3,})\s*=/;

interface EnvVarContext {
  varName: string;
  hasFallback: boolean;
  fallbackValue?: string;
  isConditionalCheck: boolean;
  line: number;
  snippet: string;
}

function parseEnvContext(lineContent: string, varName: string, lineNumber: number, isSnapshot = false): EnvVarContext {
  // Check for logical OR fallback: process.env.VAR || 'default'
  const orFallbackMatch = lineContent.match(new RegExp(`(?:process\\.env|import\\.meta\\.env)\\.${varName}\\s*\\|\\|\\s*([^;,\\n\\)]+)`));
  // Check for nullish coalescing: process.env.VAR ?? 'default'
  const nullishFallbackMatch = lineContent.match(new RegExp(`(?:process\\.env|import\\.meta\\.env)\\.${varName}\\s*\\?\\?\\s*([^;,\\n\\)]+)`));
  // Check for existence condition: if (process.env.VAR) or Boolean(process.env.VAR)
  const conditionalMatch = lineContent.match(new RegExp(`(?:if\\s*\\(|Boolean\\(|!)\\s*(?:process\\.env|import\\.meta\\.env)\\.${varName}`));

  let fallbackValue: string | undefined;
  if (orFallbackMatch) {
    fallbackValue = orFallbackMatch[1].trim();
  } else if (nullishFallbackMatch) {
    fallbackValue = nullishFallbackMatch[1].trim();
  }

  const isConditionalCheck = !!conditionalMatch;
  const hasFallback = !!fallbackValue;

  return {
    varName,
    hasFallback,
    fallbackValue,
    isConditionalCheck,
    line: lineNumber,
    snippet: isSnapshot ? lineContent.trim() : `+ ${lineContent.trim()}`,
  };
}

export const envRule: Rule = {
  id: 'rule-env-variable',
  name: 'Environment Variable & Secret Dependencies',
  category: 'configuration',
  description: 'Tracks additions, removals, and references to environment variables, distinguishing fallback-guarded variables from direct references.',
  analyze: (
    file: DiffFile,
    _allFiles: DiffFile[],
    mode: AnalysisMode = 'comparison',
    _context?: AnalysisContext
  ): Finding[] => {
    const findings: Finding[] = [];
    if (file.isBinary || file.isLockfile) return findings;

    const isSnapshot = mode === 'snapshot';
    const isEnvExample = /\.env(?:\.example|\.sample)$/i.test(file.newPath);
    const isEnvFile = /\.env(?:\.local|\.test|\.development|\.production)?$/i.test(file.newPath);

    // If this is an .env.example configuration template
    if (isEnvExample) {
      if (isSnapshot) return findings; // Counted in Project Overview metadata in snapshot mode
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add' || line.type === 'detected') {
            const match = line.content.match(ENV_FILE_LINE_PATTERN);
            if (match) {
              const varName = match[1];
              findings.push({
                id: `env-template-declared-${file.id}-${varName}`,
                ruleId: 'rule-env-variable',
                title: `Environment variable declared in configuration template: ${varName}`,
                category: 'configuration',
                priority: 'REVIEW',
                confidence: 'HIGH',
                changeType: 'Configuration template entry',
                affectedFile: file.newPath,
                changeSignature: `env:tmpl:${varName}`,
                evidence: {
                  filePath: file.newPath,
                  lineNumber: line.newLineNumber || hunk.newStart,
                  snippet: `${line.type === 'add' ? '+' : ' '} ${line.content.trim()}`,
                  changeType: 'addition',
                },
                explanation: `Variable "${varName}" is declared as a configuration-template entry in ${file.newPath}. Template declarations document expected environment configuration keys without asserting whether production values are set.`,
                suggestedAction: `Ensure local developer environments and deployment setups have values provided for "${varName}".`,
              });
            }
          }
        }
      }
      return findings;
    }

    // If this is an active .env file
    if (isEnvFile) {
      if (isSnapshot) return findings; // Counted in Project Overview metadata in snapshot mode
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add' || line.type === 'detected') {
            const match = line.content.match(ENV_FILE_LINE_PATTERN);
            if (match) {
              const varName = match[1];
              findings.push({
                id: `env-var-declared-${file.id}-${varName}`,
                ruleId: 'rule-env-variable',
                title: isSnapshot
                  ? `Environment variable declared: ${varName}`
                  : `New environment variable declared: ${varName}`,
                category: 'configuration',
                priority: 'REVIEW',
                confidence: 'HIGH',
                changeType: 'Environment variable declared',
                affectedFile: file.newPath,
                changeSignature: `env:decl:${varName}`,
                evidence: {
                  filePath: file.newPath,
                  lineNumber: line.newLineNumber || hunk.newStart,
                  snippet: `${line.type === 'add' ? '+' : ' '} ${line.content.trim()}`,
                  changeType: isSnapshot ? 'file_status' : 'addition',
                },
                explanation: `Variable "${varName}" is declared in ${file.newPath}.`,
                suggestedAction: `Verify that ${varName} is configured in developer local setups, CI pipelines, staging, and production hosting environments.`,
              });
            }
          }
        }
      }
      return findings;
    }

    // In source files, look for references to process.env.*
    const addedEnvVars = new Map<string, EnvVarContext>();
    const removedEnvVars = new Map<string, EnvVarContext>();

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' || line.type === 'detected') {
          // JS/TS pattern
          ENV_USAGE_REGEX.lastIndex = 0;
          let match;
          while ((match = ENV_USAGE_REGEX.exec(line.content)) !== null) {
            const varName = match[1];
            if (!['NODE_ENV'].includes(varName) && !addedEnvVars.has(varName)) {
              const context = parseEnvContext(line.content, varName, line.newLineNumber || hunk.newStart, isSnapshot);
              addedEnvVars.set(varName, context);
            }
          }

          // Python os.environ pattern
          PY_ENV_USAGE_REGEX.lastIndex = 0;
          let pyMatch;
          while ((pyMatch = PY_ENV_USAGE_REGEX.exec(line.content)) !== null) {
            const varName = pyMatch[1];
            const fallback = pyMatch[2]?.trim();
            if (!addedEnvVars.has(varName)) {
              addedEnvVars.set(varName, {
                varName,
                hasFallback: !!fallback,
                fallbackValue: fallback,
                isConditionalCheck: false,
                line: line.newLineNumber || hunk.newStart,
                snippet: isSnapshot ? line.content.trim() : `${line.type === 'add' ? '+' : ' '} ${line.content.trim()}`,
              });
            }
          }
        } else if (line.type === 'delete') {
          ENV_USAGE_REGEX.lastIndex = 0;
          let match;
          while ((match = ENV_USAGE_REGEX.exec(line.content)) !== null) {
            const varName = match[1];
            if (!['NODE_ENV'].includes(varName) && !removedEnvVars.has(varName)) {
              removedEnvVars.set(varName, parseEnvContext(line.content, varName, line.oldLineNumber || hunk.oldStart, false));
            }
          }

          PY_ENV_USAGE_REGEX.lastIndex = 0;
          let pyMatch;
          while ((pyMatch = PY_ENV_USAGE_REGEX.exec(line.content)) !== null) {
            const varName = pyMatch[1];
            const fallback = pyMatch[2]?.trim();
            if (!removedEnvVars.has(varName)) {
              removedEnvVars.set(varName, {
                varName,
                hasFallback: !!fallback,
                fallbackValue: fallback,
                isConditionalCheck: false,
                line: line.oldLineNumber || hunk.oldStart,
                snippet: `- ${line.content.trim()}`,
              });
            }
          }
        }
      }
    }

    for (const [varName, context] of addedEnvVars.entries()) {
      const prevContext = removedEnvVars.get(varName);
      if (!isSnapshot && prevContext) {
        // If the variable was in both deleted and added lines, check if fallback semantics changed
        if (prevContext.hasFallback === context.hasFallback && prevContext.fallbackValue === context.fallbackValue) {
          // Truly unchanged semantics, simply shifted or edited
          continue;
        }
      }

      if (context.hasFallback) {
        // Case A: Variable with fallback - NEVER label required
        findings.push({
          id: `env-var-fallback-${file.id}-${varName}`,
          ruleId: 'rule-env-variable',
          title: `Environment variable referenced with fallback: ${varName}`,
          category: 'configuration',
          priority: 'LOW',
          confidence: 'HIGH',
          changeType: 'Environment variable referenced with fallback',
          affectedFile: file.newPath,
          changeSignature: `env:ref:${varName}`,
          evidence: {
            filePath: file.newPath,
            lineNumber: context.line,
            snippet: context.snippet,
            fallbackValue: context.fallbackValue,
            changeType: isSnapshot ? 'file_status' : 'addition',
          },
          explanation: `Environment variable reference "${varName}" provides an inline fallback value (${context.fallbackValue || 'detected'}). The application provides a default value if unset in runtime environments.`,
          suggestedAction: 'Verify whether the fallback is appropriate for production and document the variable if deployment configuration may override it.',
        });
      } else if (context.isConditionalCheck) {
        // Feature flag / existence check
        findings.push({
          id: `env-var-flag-${file.id}-${varName}`,
          ruleId: 'rule-env-variable',
          title: `Conditional environment flag referenced: ${varName}`,
          category: 'configuration',
          priority: 'LOW',
          confidence: 'HIGH',
          changeType: 'Conditional environment flag check',
          affectedFile: file.newPath,
          changeSignature: `env:flag:${varName}`,
          evidence: {
            filePath: file.newPath,
            lineNumber: context.line,
            snippet: context.snippet,
            changeType: isSnapshot ? 'file_status' : 'addition',
          },
          explanation: `Variable "${varName}" is evaluated conditionally as an optional toggle or feature flag without strict runtime crash requirements.`,
          suggestedAction: `Ensure documentation notes whether enabling "${varName}" activates experimental or internal behavior.`,
        });
      } else {
        // Case B: Variable referenced without an inline fallback
        // Evidence-appropriate: Do NOT automatically claim "required", "runtime exception", or "deployment failure"
        findings.push({
          id: `env-var-no-fallback-${file.id}-${varName}`,
          ruleId: 'rule-env-variable',
          title: isSnapshot
            ? `Environment variable referenced without inline fallback: ${varName}`
            : `Environment variable reference introduced (no inline fallback): ${varName}`,
          category: 'configuration',
          priority: 'MEDIUM',
          confidence: 'HIGH',
          changeType: isSnapshot
            ? 'Environment variable without inline fallback'
            : 'Environment variable requirement introduced',
          affectedFile: file.newPath,
          changeSignature: `env:req:${varName}`,
          evidence: {
            filePath: file.newPath,
            lineNumber: context.line,
            snippet: context.snippet,
            changeType: isSnapshot ? 'file_status' : 'addition',
          },
          explanation: isSnapshot
            ? `Source code references environment variable "${varName}" without an inline fallback. Verify that deployment environments provide this configuration if required at runtime.`
            : `New reference to environment variable "${varName}" introduced without an inline fallback. Ensure this key is provisioned in CI/CD secrets and hosting environments before deployment.`,
          suggestedAction: `Verify "${varName}" exists in local environment configurations, CI secrets, or hosting settings as appropriate for your application architecture.`,
        });
      }
    }

    return findings;
  },
};
