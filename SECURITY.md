# Security Policy

## Reporting a Security Issue

We take the security of developer tools seriously. If you discover a security vulnerability in DiffGuard's parser, input sanitization, or report generation, please report it responsibly rather than opening a public issue.

Please report vulnerabilities to the maintainers at:
`[MAINTAINER_SECURITY_EMAIL_PLACEHOLDER: e.g. promptility.ai@gmail.com or via GitHub Security Advisories]`

Include:
- A description of the issue and potential impact
- A minimal reproducible example (e.g. malformed diff or safe demonstration archive)
- Any proposed remediation steps

We aim to acknowledge reports within 48 hours and coordinate remediation before public disclosure.

## Security Posture & Architecture

### 1. Untrusted Input Handling
DiffGuard treats all user input—whether uploaded ZIP files, local folder trees, or pasted Git diffs—as strictly untrusted data. Input parsing relies on deterministic regular expressions and lexical tokenizers.

### 2. Zero Code Execution
DiffGuard never executes, evaluates (`eval()`), or interprets analyzed source files:
- No JavaScript/TypeScript execution
- No Python/Ruby/Go script execution
- No execution of build lifecycle hooks (e.g. `npm postinstall`, `make`, shell scripts)
- No invocation of local Git binaries or remote shell sessions

### 3. Safe Archive Handling
Archive parsing (`.zip`) executes completely in browser memory:
- **Path Traversal Protection**: Guard against Zip-Slip attacks; relative path traversal (`../`) and absolute paths are rejected.
- **Decompression Bomb Protection**: Total uncompressed bytes are capped to prevent memory exhaustion.
- **Binary Filtering**: Executable binaries, image assets, and compiled bytecode are excluded from text analysis.

### 4. DOM and Export Sanitization
- All diff lines, file paths, and metadata rendered in the user interface are handled via React's safe DOM escaping.
- HTML report exports use strict HTML entity escaping (`&`, `<`, `>`, `"`, `'`) for all interpolated content to prevent cross-site scripting (XSS).

### 5. Dependency Lookup Privacy
- When optional vulnerability checking is enabled, DiffGuard transmits solely the package name and version string (e.g. `express@4.18.2`) to the public OSV API (`api.osv.dev`).
- Proprietary source code, filenames, and internal repository paths are never sent over the network.
- Users can disable public vulnerability lookups at any time in Settings.

### 6. Limitations of Static Analysis
DiffGuard provides deterministic static heuristics for code review. Static heuristics cannot evaluate runtime configuration, dynamically injected environment variables, or remote infrastructure states. DiffGuard is a review assistant and does not replace formal application security testing.
