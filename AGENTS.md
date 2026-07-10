# Agent Workflow & Documentation Guidelines [ID: AGENT-WORKFLOW-ROOT]

This document outlines the mandatory workflow for AI agents working on this project. All agents must strictly adhere to these procedures to ensure consistency, transparency, and high-quality output.

## 1. Documentation Repository

All project documentation, plans, and tracking files are stored in the `docs` directory.

- **Planning Documents**: Stored in `docs/planning` [ID: DOCS-001](docs/planning/00_SUMMARY.md)
- **Task Tracking**: Stored in `docs/tasks` [ID: DOCS-002](docs/tasks/00_SUMMARY.md)
- **Verification & Walkthroughs**: Stored in `docs/verification` [ID: DOCS-003](docs/verification/00_SUMMARY.md)
- **Standard Workflows**: Stored in `docs/workflows` [ID: DOCS-004](docs/workflows/00_SUMMARY.md)
- **Technical Architecture**: Stored in `docs/tech` [ID: DOCS-005](docs/tech/00_SUMMARY.md). `architecture.md` is the **Single Source of Truth** for system design.

## 2. The Agent Workflow

Tasks are categorized by complexity. Agents must follow the appropriate path:

*   **Significant/Complex Tasks** (e.g., new features, large refactorings, architectural changes): Follow the **Full Workflow** (Phases 1-5 below). You must create planning, tasks, and walkthrough files in the `docs/` directory.
*   **Minor Tasks/Bugfixes/RepoLens Reports** (e.g., lint fixes, single-file bugfixes, resolving individual RepoLens audit points): Follow the **Fast-Track Workflow**. You do *not* need to create planning, tasks, or walkthrough files in `docs/`. Instead, perform the analysis and implementation directly, execute tests/validation, and document the verification results in the git commit description or the pull request / issue response.

---

### A. The Full Workflow (for Significant Tasks)

#### Phase 1: Context & Planning
**Goal**: Understand the goal and design the solution.

1.  **Analyze**: Read existing documentation and code.
    -   **RepoLens Reports**: If resolving an issue reported by RepoLens, read the corresponding markdown report, examine the referenced source lines, and confirm the suggested fix makes sense in the current context.
2.  **Plan**: Create a new implementation plan in `docs/planning/`.
    -   File Naming: `[short-feature-name]-plan.md`
    -   Must Include:
        -   **Goal Description**: What are we solving?
        -   **Proposed Changes**: List of files to modify/create.
        -   **Verification Plan**: How will we test this?
    -   *Crucial*: If the task is complex, request user review via `notify_user` before proceeding.

#### Phase 2: Task Definition
**Goal**: Break down the work into actionable steps.

1.  **Define Tasks**: Create a task file in `docs/tasks/`.
    -   File Naming: `[short-feature-name]-tasks.md`
    -   Format: Markdown checklist.
2.  **Tracking**:
    -   Update this file frequently.
    -   Mark items as in-progress `[/]` or done `[x]`.
    -   Sync these updates with the `task_boundary` tool status.

#### Phase 3: Execution
**Goal**: Implement the changes.

1.  **Code**: Follow the implementation plan.
2.  **Refine**: If you discover new requirements, update the *Plan* first, then the *Code*.
3.  **Update Architecture**: If you change the system structure, you **MUST** update `docs/tech/architecture.md`.
4.  **Document**: Update `AGENTS.md` or other workflows if you change how the system works.

#### Phase 4: Verification
**Goal**: Prove correctness.

1.  **Verify**: Run tests, check UI, or verify logic as defined in the plan.
2.  **Lint & Compile**: Run `npm run lint` to check for ESLint violations, and `npm run build` (which executes `tsc -b` and `vite build`) to ensure there are no TypeScript or bundling compiler errors. Any new warnings or errors must be fixed.
3.  **RepoLens Validation**: If resolving a RepoLens audit report, execute the recommended validation commands listed in the `## Validation` section of the report to prove the issue is closed.
4.  **Walkthrough**: Create a verification log in `docs/verification/`.
    -   File Naming: `[short-feature-name]-walkthrough.md`
    -   Must Include:
        -   **Changes Implemented**: Summary of what was done.
        -   **Verification Results**: Screenshots, command outputs, or logs proving success.
        -   **Outstanding Issues**: detailed list of anything not fully resolved.

#### Phase 5: Documentation Maintenance
**Goal**: Ensure the project's single source of truth remains perfectly accurate.

1.  **Audit**: After your changes are verified, ask yourself: "Does the code I just wrote match the existing architecture docs?"
2.  **Update `docs/tech/`**: If you introduced a new pattern, updated state management, or refactored a module, you MUST update `docs/tech/architecture.md`.
3.  **Update Workflows**: If you discovered a new way to do things or established a new standard, document it in `docs/workflows/`.

---

### B. The Fast-Track Workflow (for Minor Tasks & RepoLens Reports)

**Goal**: Resolve localized issues quickly without creating file-based documentation overhead.

1.  **Analyze & Implement**:
    -   Review the RepoLens report or bug description.
    -   Modify/create code files directly. Keep code changes clean and localized.
2.  **Verify, Lint & Compile**:
    -   Run `npm run lint` and `npm run build` to ensure no errors are introduced.
    -   If resolving a RepoLens report, run the commands in the `## Validation` section.
3.  **Log Validation**:
    -   Do *not* create files in `docs/planning/`, `docs/tasks/`, or `docs/verification/`.
    -   Write a concise summary of the changes and paste the successful validation command output into the git commit message or the pull request / issue response.
4.  **Update SSoT if necessary**:
    -   If a fast-track fix changes technical architecture guidelines, update `docs/tech/architecture.md` directly.

## 3. Workflow Documentation

If you encounter a repeatable process (e.g., "How to add a new game role"), document it in `docs/workflows/`.
-   Use clear, step-by-step instructions.
-   Add a summary in `docs/workflows/00_SUMMARY.md` if needed.

## 4. Code Quality, SOLID Principles & Modern Web Best Practices

To prevent spaghetti code, bloat, and modern web anti-patterns, agents **MUST** strictly adhere to the following when planning and executing:

1.  **SOLID Principles**: 
    -   **Single Responsibility Principle (SRP)**: Each file, component, or hook should have exactly *one* job. If a component handles UI layout, business logic, and data fetching, it must be split.
    -   **Dependency Inversion**: Use hooks and contexts to inject state and logic into UI components rather than hardcoding complex logic inside views.
2.  **File Size Limits**: Keep files small. If a React component exceeds ~250 lines, it is likely doing too much. Break it down into sub-components or extract logic into custom hooks (`useFeatureLogic.ts`).
3.  **DRY (Don't Repeat Yourself)**: Before writing new code, use the search tools to check if a similar component, hook, or utility function already exists in `src/components`, `src/hooks`, or `src/lib`.
4.  **Planning Phase Enforcement**: When creating an implementation plan (Phase 1), the agent **MUST** explicitly state the component hierarchy and how the feature will be split into multiple small, focused files to satisfy the SRP.
5.  **Modern Web APIs & CSS**:
    -   Prefer modern native HTML/CSS/JS features instead of obsolete libraries or custom complex hacks.
    -   For overlays and modals, use the native HTML `<dialog>` element rather than custom overlay states.
    -   Use modern CSS features (CSS variables, `:has()`, Grid/Flexbox) for clean, performant styling.
6.  **Type Safety (Strict TypeScript)**:
    -   Avoid the `any` type. Use strongly typed interfaces, generics, and props.
    -   Use Discriminated Unions for UI/fetch state (e.g., `status: 'idle' | 'loading' | 'success' | 'error'`) rather than separate boolean flags (`isLoading`, `isError`) to prevent impossible states.
7.  **React Anti-Patterns to Avoid**:
    -   **No Side Effects in Render**: Never trigger side effects or write state modifications directly in the render cycle. Use event handlers or proper `useEffect` hooks with correct dependency arrays.
    -   **Stable Keys**: Always use unique, stable IDs as list item `key` props (never use array indices unless the array is strictly static and read-only).
    -   **Single Source of Truth**: Avoid duplicating state. If a value can be derived or computed from existing state or props, compute it on the fly (optionally memoizing it with `useMemo` if expensive).
    -   **Immutability**: Never mutate state variables directly. Always use the setter function with pure state updates (e.g., `setState(prev => [...prev, newItem])`).

## 5. Localization (i18n)

Agents **MUST** adhere to strict internationalization standards when working on UI code:
1. **Never Hardcode Strings**: All user-facing text must use the translation function (e.g., `t('game.key')`).
2. **Always Update Translation Files**: When adding a new translation key in a component, the agent **MUST** simultaneously update the corresponding translation files (like `i18n/index.ts` or JSONs) for **both** English and German (or all supported languages).
3. **No Silent Failures**: Leaving translation files incomplete leads to raw keys showing in the UI. Double-check that every new key is mapped.

## 6. Enforcement

-   **Do not skip planning** for non-trivial, significant tasks.
-   **Always break down UI into small components** in your plan.
-   **Do not skip verification** (even for fast-track tasks, always run lint, build, and tests/validation).
-   **Do not introduce lint or compiler errors** (`npm run lint` and `npm run build` must pass).
-   **Do not use temporary placeholders or empty TODOs** in production-bound code.
-   **Always update the relevant docs** (or include validation logs in commit/PR comments for fast-track tasks) before marking the overall request as done.
-   **Always implement i18n correctly** - never leave translations missing.

## 7. Web-to-Android (Capacitor) UI Guidelines

When building web UI that will be deployed as an Android app via Capacitor, agents **MUST** adhere to the following rules:

1. **Edge-to-Edge Display & Safe Areas**:
    - Modern Android (API 35+) enforces Edge-to-Edge displays. The WebView extends under the system status bar and navigation bar.
    - Always use the `capacitor-plugin-safe-area` CSS variables (`var(--safe-area-inset-top)`, etc.) for padding on root containers (e.g., `MainLayout`) and full-screen overlays (e.g., `PlaybackManager`).
    - Fall back to standard browser environment variables if needed: `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`.
2. **Native Feel (CSS Adjustments)**:
    - Set `user-select: none` and `-webkit-touch-callout: none` to prevent text selection and native context menus on long presses, except on input fields.
    - Set `-webkit-tap-highlight-color: transparent` to disable the default gray highlight when tapping elements.
    - Use `100dvh` instead of `100vh` to properly account for dynamic mobile browser bars (even though less critical in a standalone Capacitor app, it prevents bugs).
    - Prevent pull-to-refresh on scrollable containers by using `overscroll-behavior-y: contain` or `none` on the `body`.
3. **Hardware Back Button**:
    - Ensure routing and modals are aware of the Android hardware back button. Listen to the Capacitor `App.addListener('backButton', ...)` event to close modals, dismiss menus, or navigate back instead of immediately exiting the app.
4. **Capacitor Build & Sync**:
    - When updating web assets, dependencies, or configurations, run `npx cap sync` to copy the latest web bundle changes to the native Android project before running native builds.
