# Pipeline Quality Gates & Deterministic Tools Analysis

This document outlines the deterministic tools and quality gates implemented in the CI/CD pipelines (both GitHub Actions and GitLab CI) to ensure code quality, prevent architecture degradation, enforce documentation, and maintain security.

## 1. Deterministic Tools & Best Practices

The following deterministic tools have been evaluated and integrated into our pipelines. They represent industry best practices for automated quality assurance in modern web applications.

### Code Quality & Types

- **ESLint (`npm run lint`)**: Enforces code style, prevents common errors, and ensures React best practices are followed. Errors fail the lint step; warnings are held by a per-file ratchet (`npm run check:lint-budget`, see [coding-conventions](coding-conventions.md#eslint-warning-budget)) so they can only decrease.
- **TypeScript Compiler (`tsc -b`)**: Provides strict static typing (`strict: true` in `tsconfig.app.json`, which includes `noImplicitAny` — explicit `any` is still allowed by the compiler and only warned by ESLint), preventing runtime type errors and ensuring contract compliance between modules.
- **Prettier**: Ensures consistent code formatting across the entire codebase.

### Architecture & Spaghetti Code Prevention

To prevent "spaghetti code" and enforce our Anti-God-Component Architecture, we utilize custom scripts:

- **Architecture Check (`check-architecture.mjs`)**: Enforces strict boundary rules. It explicitly prevents cross-game imports (e.g., `src/games/wordle` importing from `src/games/sudoku`). This guarantees that each module remains isolated and decoupled.
- **Component Budget Check (`check-component-budget.js`)**: Enforces the Anti-God-Component rule by strictly rejecting any React component (`.tsx`) that exceeds 250 lines of code. This forces developers to decompose complex logic into smaller sub-components and custom hooks (`useFeatureLogic`), maintaining readability and testability.

### Code Reusability & Duplication Prevention

- **jscpd (`npm run check:duplicates`)**: A deterministic copy-paste detector. It scans the codebase for duplicated blocks of code. If a developer attempts to copy-paste logic instead of extracting it into a shared module (`src/modules/`), the pipeline will fail. This actively encourages the reuse of existing elements.

### Test Coverage

- **Coverage ratchet (`npm run test:coverage && npm run check:coverage`)**: Measures v8 line coverage and holds every `src/**/logic/**/*.ts` file at its baseline in `scripts/coverage-baselines.json` (max drop 2 points; new files of 30+ lines need 60 %). In GitHub Actions it is the separate job "Coverage Ratchet (logic/)", deliberately not in `ci-ok` `needs` because coverage is about 2.4x slower than a plain Vitest run (#850); GitLab's `npm run ci:gates` runs it in place of the plain `npm test`. Details: [testing-guide](testing-guide.md#running-frontend-tests).

### Dead Code

- **knip ratchet (`npm run check:deadcode`)**: Runs `knip --reporter json` (config: `knip.json`; workspaces root, `server`, `signaling`) and holds every `<category>:<file>` count (unused files, exports, types, duplicate exports, dependencies, unlisted dependencies) at its baseline in `scripts/deadcode-baselines.json`. A count above its baseline or a new file/category fails; a lower count passes with a warning, and `npm run check:deadcode -- --update` lowers the baseline (never raises it). Logic: `scripts/lib/deadcode-ratchet.mjs`. `playwright`, `esbuild`, `ws` (installed ad hoc by e2e/perf/test scripts), the `dictionary-*` packages (loaded by name in `build-wordle-words.mjs`) system binaries and `@yao-pkg/pkg` in `server` (only used as the `pkg` CLI in `server/package.json` scripts; knip reports it only when `server/node_modules` is missing, as in the GitHub job that installs the root package only) are ignored in `knip.json`, so the result is the same with and without `server/` and `signaling/` installs. In GitHub Actions it is the separate job "Dead Code Ratchet (knip)", not in `ci-ok` `needs` until it has proven free of false positives (#841); GitLab's `npm run ci:gates` runs it. Not part of the pre-commit hook. Set `KNIP_BIN="npx --yes knip@<version>"` to run it without a local knip install.

### Documentation Enforcement

- **Doc-Sync Check (`check-docs-sync.mjs`)**: This script acts as a guardrail. If core logic (in `src/games/`, `src/modules/`, or `src/lib/`) is modified, the script verifies that corresponding documentation (a `changelog.d/` fragment or `CHANGELOG.md`, `docs/tech/`, `AGENTS.md`) or translations (`public/locales/`) have been updated in the same PR. This ensures that documentation never falls behind the actual code implementation.

### Security

- **NPM Audit (`npm audit`)**: Integrated into the pipeline to check dependencies for known vulnerabilities.
- **GitLab SAST & Secret Detection**: In the GitLab pipeline, native templates are included for Static Application Security Testing (SAST) to detect common vulnerabilities in the code, and Secret Detection to ensure API keys, tokens, or passwords are not accidentally committed.

## 2. Integration Strategy

Both `.github/workflows/ci.yml` and `.gitlab-ci.yml` execute these checks on every push and pull/merge request.

- **Fail-Fast**: The pipelines are designed to fail fast. If any of the deterministic checks fail (e.g., a component is 255 lines, or a duplicate code block is found), the merge is blocked.
- **Automated Review**: By offloading these checks to the pipeline, human reviewers can focus on business logic and architecture design rather than hunting for missing translations, line counts, or copy-paste errors.
