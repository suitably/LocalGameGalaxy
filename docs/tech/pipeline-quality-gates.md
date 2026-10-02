# Pipeline Quality Gates & Deterministic Tools Analysis

This document outlines the deterministic tools and quality gates implemented in the CI/CD pipelines (both GitHub Actions and GitLab CI) to ensure code quality, prevent architecture degradation, enforce documentation, and maintain security.

## 1. Deterministic Tools & Best Practices

The following deterministic tools have been evaluated and integrated into our pipelines. They represent industry best practices for automated quality assurance in modern web applications.

### Code Quality & Types
*   **ESLint (`npm run lint`)**: Enforces code style, prevents common errors, and ensures React best practices are followed.
*   **TypeScript Compiler (`tsc -b`)**: Provides strict static typing (`noImplicitAny`), preventing runtime type errors and ensuring contract compliance between modules.
*   **Prettier**: Ensures consistent code formatting across the entire codebase.

### Architecture & Spaghetti Code Prevention
To prevent "spaghetti code" and enforce our Anti-God-Component Architecture, we utilize custom scripts:
*   **Architecture Check (`check-architecture.mjs`)**: Enforces strict boundary rules. It explicitly prevents cross-game imports (e.g., `src/games/wordle` importing from `src/games/sudoku`). This guarantees that each module remains isolated and decoupled.
*   **Component Budget Check (`check-component-budget.js`)**: Enforces the Anti-God-Component rule by strictly rejecting any React component (`.tsx`) that exceeds 250 lines of code. This forces developers to decompose complex logic into smaller sub-components and custom hooks (`useFeatureLogic`), maintaining readability and testability.

### Code Reusability & Duplication Prevention
*   **jscpd (`npm run check:duplicates`)**: A deterministic copy-paste detector. It scans the codebase for duplicated blocks of code. If a developer attempts to copy-paste logic instead of extracting it into a shared module (`src/modules/`), the pipeline will fail. This actively encourages the reuse of existing elements.

### Documentation Enforcement
*   **Doc-Sync Check (`check-docs-sync.mjs`)**: This script acts as a guardrail. If core logic (in `src/games/`, `src/modules/`, or `src/lib/`) is modified, the script verifies that corresponding documentation (`CHANGELOG.md`, `docs/tech/`, `AGENTS.md`) or translations (`public/locales/`) have been updated in the same PR. This ensures that documentation never falls behind the actual code implementation.

### Security
*   **NPM Audit (`npm audit`)**: Integrated into the pipeline to check dependencies for known vulnerabilities.
*   **GitLab SAST & Secret Detection**: In the GitLab pipeline, native templates are included for Static Application Security Testing (SAST) to detect common vulnerabilities in the code, and Secret Detection to ensure API keys, tokens, or passwords are not accidentally committed.

## 2. Integration Strategy

Both `.github/workflows/ci.yml` and `.gitlab-ci.yml` execute these checks on every push and pull/merge request.

*   **Fail-Fast**: The pipelines are designed to fail fast. If any of the deterministic checks fail (e.g., a component is 255 lines, or a duplicate code block is found), the merge is blocked.
*   **Automated Review**: By offloading these checks to the pipeline, human reviewers can focus on business logic and architecture design rather than hunting for missing translations, line counts, or copy-paste errors.
