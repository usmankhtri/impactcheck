# Contributing to DiffGuard

Thank you for your interest in improving DiffGuard!

## Development Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/promptility/diffguard.git
   cd diffguard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local dev server**:
   ```bash
   npm run dev
   ```

## Development Guidelines

1. **Deterministic Heuristics**: Rules in `src/rules/` must be deterministic, transparent, and grounded in concrete syntax patterns. Never add non-deterministic or generative logic.
2. **Calibrated, Objective Language**: Avoid sensationalist warnings (e.g. *"Critical vulnerability detected!"*). Use precise, qualified wording (e.g. *"Review recommended: route middleware modified"* or *"Potential breaking change: schema column removed"*).
3. **Evidence-Based Findings**: Every finding must include the affected file, line number (when identifiable), concise Before/After snippets, a plain explanation, and a concrete suggested review action.
4. **Local-First & Client-Side Safety**: Core diff parsing, file mapping, and report generation must execute 100% in browser memory. Never introduce external API dependencies for core analysis.
5. **Accessibility & Contrast**: Verify all new or updated UI components in both Light and Dark themes, ensuring WCAG AA contrast compliance and full keyboard navigation.

## Testing & Verification

Before submitting a pull request, run all verification checks:

```bash
# Typecheck
npm run lint

# Automated test suite
npm test

# Production build
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write unit tests in `src/tests/runner.ts` for any new heuristics or parser features.
3. Commit your changes with clear, descriptive commit messages.
4. Push to your fork and submit a Pull Request against the `main` branch.
