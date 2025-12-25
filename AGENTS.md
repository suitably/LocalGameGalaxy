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

## 3. Workflow Documentation

If you encounter a repeatable process (e.g., "How to add a new game role"), document it in `docs/workflows/`.
-   Use clear, step-by-step instructions.
-   Add a summary in `docs/workflows/00_SUMMARY.md` if needed.

## 4. Enforcement

-   **Do not skip planning** for non-trivial tasks.
-   **Do not skip verification**.
-   **Always update the relevant docs** before marking the overall request as done.
