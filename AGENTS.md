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

Agents must follow this cyclical process for every significant task:

### Phase 1: Context & Planning
**Goal**: Understand the goal and design the solution.

1.  **Analyze**: Read existing documentation and code.
2.  **Plan**: Create a new implementation plan in `docs/planning/`.
    -   File Naming: `[short-feature-name]-plan.md`
    -   Must Include:
        -   **Goal Description**: What are we solving?
        -   **Proposed Changes**: List of files to modify/create.
        -   **Verification Plan**: How will we test this?
    -   *Crucial*: If the task is complex, request user review via `notify_user` before proceeding.

### Phase 2: Task Definition
**Goal**: Break down the work into actionable steps.

1.  **Define Tasks**: Create a task file in `docs/tasks/`.
    -   File Naming: `[short-feature-name]-tasks.md`
    -   Format: Markdown checklist.
2.  **Tracking**:
    -   Update this file frequently.
    -   Mark items as in-progress `[/]` or done `[x]`.
    -   Sync these updates with the `task_boundary` tool status.

### Phase 3: Execution
**Goal**: Implement the changes.

1.  **Code**: Follow the implementation plan.
2.  **Refine**: If you discover new requirements, update the *Plan* first, then the *Code*.
3.  **Update Architecture**: If you change the system structure, you **MUST** update `docs/tech/architecture.md`.
4.  **Document**: Update `AGENTS.md` or other workflows if you change how the system works.

### Phase 4: Verification
**Goal**: Prove correctness.

1.  **Verify**: Run tests, check UI, or verify logic as defined in the plan.
2.  **Walkthrough**: Create a verification log in `docs/verification/`.
    -   File Naming: `[short-feature-name]-walkthrough.md`
    -   Must Include:
        -   **Changes Implemented**: Summary of what was done.
        -   **Verification Results**: Screenshots, command outputs, or logs proving success.
        -   **Outstanding Issues**: detailed list of anything not fully resolved.

### Phase 5: Documentation Maintenance
**Goal**: Ensure the project's single source of truth remains perfectly accurate.

1.  **Audit**: After your changes are verified, ask yourself: "Does the code I just wrote match the existing architecture docs?"
2.  **Update `docs/tech/`**: If you introduced a new pattern, updated state management, or refactored a module, you MUST update `docs/tech/architecture.md`.
3.  **Update Workflows**: If you discovered a new way to do things or established a new standard, document it in `docs/workflows/`.

## 3. Workflow Documentation

If you encounter a repeatable process (e.g., "How to add a new game role"), document it in `docs/workflows/`.
-   Use clear, step-by-step instructions.
-   Add a summary in `docs/workflows/00_SUMMARY.md` if needed.

## 4. Code Quality & SOLID Principles

To prevent spaghetti code and bloated files, agents **MUST** strictly adhere to the following when planning and executing:

1.  **SOLID Principles**: 
    -   **Single Responsibility Principle (SRP)**: Each file, component, or hook should have exactly *one* job. If a component handles UI layout, business logic, and data fetching, it must be split.
    -   **Dependency Inversion**: Use hooks and contexts to inject state and logic into UI components rather than hardcoding complex logic inside views.
2.  **File Size Limits**: Keep files small. If a React component exceeds ~250 lines, it is likely doing too much. Break it down into sub-components or extract logic into custom hooks (`useFeatureLogic.ts`).
3.  **DRY (Don't Repeat Yourself)**: Before writing new code, use the search tools to check if a similar component, hook, or utility function already exists in `src/components`, `src/hooks`, or `src/lib`.
4.  **Planning Phase Enforcement**: When creating an implementation plan (Phase 1), the agent **MUST** explicitly state the component hierarchy and how the feature will be split into multiple small, focused files to satisfy the SRP.

## 5. Localization (i18n)

Agents **MUST** adhere to strict internationalization standards when working on UI code:
1. **Never Hardcode Strings**: All user-facing text must use the translation function (e.g., `t('game.key')`).
2. **Always Update Translation Files**: When adding a new translation key in a component, the agent **MUST** simultaneously update the corresponding translation files (like `i18n/index.ts` or JSONs) for **both** English and German (or all supported languages).
3. **No Silent Failures**: Leaving translation files incomplete leads to raw keys showing in the UI. Double-check that every new key is mapped.

## 6. Enforcement

-   **Do not skip planning** for non-trivial tasks.
-   **Always break down UI into small components** in your plan.
-   **Do not skip verification**.
-   **Always update the relevant docs** before marking the overall request as done.
-   **Always implement i18n correctly** - never leave translations missing.
