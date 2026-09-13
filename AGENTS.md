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

1.  **Analyze & Reuse Audit ("Look Before You Leap")**:
    -   Read existing documentation and code.
    -   **MANDATORY**: Search `src/modules/`, `src/components/`, and `src/lib/` before writing any code. Check if an existing component, hook, or service already solves the problem (see Section 4.1 for the shared catalog).
    -   **RepoLens Reports**: If resolving an issue reported by RepoLens, read the corresponding markdown report, examine the referenced source lines, and confirm the suggested fix makes sense in the current context.
2.  **Plan**: Create a new implementation plan in `docs/planning/`.
    -   File Naming: `[short-feature-name]-plan.md`
    -   Must Include:
        -   **Goal Description**: What are we solving?
        -   **Reused Components/Modules**: Explicitly list which existing shared modules (`src/modules/*`, `src/components/*`, `src/lib/*`) are utilized.
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
**Goal**: Prove correctness and architectural compliance.

1.  **Mandatory Pre-Flight Architecture Audit**:
    Execute the automated architecture checker before finalizing any task:
    ```bash
    npm run check:architecture:diff   # Verifies changed files against boundaries
    ```
    If any violation (cross-game import, storage bypass, native confirm/prompt) is flagged, fix it immediately.
2.  **Lint & Compile**:
    Run ESLint and the TypeScript/Vite compiler:
    ```bash
    npm run lint                      # Must pass with zero errors
    npm run build                     # Executes tsc -b && vite build
    npm run test                      # Executes vitest test suite
    ```
    Any new warnings or errors must be resolved before proceeding.
3.  **RepoLens Validation**: If resolving a RepoLens audit report, execute the recommended validation commands listed in the `## Validation` section of the report to prove the issue is closed.
4.  **Walkthrough**: Create a verification log in `docs/verification/`.
    -   File Naming: `[short-feature-name]-walkthrough.md`
    -   Must Include:
        -   **Changes Implemented**: Summary of what was done.
        -   **Verification Results**: Screenshots, command outputs of `npm run check:architecture:diff`, `npm run lint`, and `npm run build` proving success.
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

### 4.0 Zero-Tolerance Anti-Pattern Matrix

The following patterns are **strictly forbidden**. Any pull request, task, or commit containing them will be rejected by CI and automated architecture linting:

| 🚫 Forbidden Anti-Pattern | Why It Is Blocked | ✅ Mandatory Solution |
| :--- | :--- | :--- |
| **Cross-Game Import** (`from '../<other>/...'`) | Couples games, breaks modular independence | Move to `src/modules/*` or `src/components/*` |
| **Raw Storage** (`localStorage.` / `sessionStorage.`) | Bypasses memory fallback and key registry | Use `storage.get/set/remove()` from `src/lib/storage.ts` |
| **Native Dialogs** (`window.confirm()`, `window.prompt()`, `alert()`) | Blocks main thread, breaks on Capacitor, unstyled | Use `<ConfirmDialog />` or MUI `<Dialog>` |
| **Untyped Code** (`: any`, `<any>`, `as any`) | Disables TypeScript compiler safety | Use generics, interfaces, or `unknown` with type guards |
| **God Component** (> 250 lines in `.tsx`) | Violates SRP, unmaintainable, test barrier | Split into sub-components + custom hook (`useFeatureLogic`) |
| **Inline BroadcastChannel Sync** in Games | Duplicates network logic, leaks channels | Use `useMultiChannelSync()` from `src/modules/sync` |
| **Hardcoded UI Strings** (`"Save"`, `"Delete"`) | Breaks internationalization (i18n) | Use `t('key')` and add to both `de` and `en` |

1.  **SOLID Principles**: 
    -   **Single Responsibility Principle (SRP)**: Each file, component, or hook should have exactly *one* job. If a component handles UI layout, business logic, and data fetching, it must be split.
    -   **Dependency Inversion**: Use hooks and contexts to inject state and logic into UI components rather than hardcoding complex logic inside views.
2.  **File Size Limits**: Keep files small. If a React component exceeds ~250 lines, it is likely doing too much. Break it down into sub-components or extract logic into custom hooks (`useFeatureLogic.ts`).
3.  **DRY & Mandatory Reuse ("Look Before You Leap")**:
    - Before writing new code, agents **MUST** audit existing shared modules and components in `src/modules`, `src/components`, and `src/lib`.
    - **Never reinvent wheels**: If a shared component, hook, or utility exists, it MUST be reused (see Section 4.1).
    - **No Cross-Game Direct Imports**: Game folders (`src/games/<gameA>`) must NEVER import directly from other game folders (`src/games/<gameB>`). If logic or UI is shared across two or more games, it MUST be extracted into `src/modules/*`, `src/components/*`, or `src/lib/*`.
4.  **Planning Phase Enforcement**: When creating an implementation plan (Phase 1), the agent **MUST** explicitly state:
    - Which existing shared modules/components will be reused.
    - The component hierarchy and how the feature will be split into multiple small, focused files to satisfy the SRP.
5.  **Modern Web APIs & UI Standards**:
    - For modals and dialogs, **always use MUI `<Dialog>`** (with consistent theme styling, backdrop blur, and focus management) or [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx). **Never use native HTML `<dialog>` or blocking `window.confirm()`**.
    - For persistent storage, **always use `src/lib/storage.ts`** with registered keys in `STORAGE_KEYS`. Never call raw `localStorage.getItem()` or `localStorage.setItem()` directly.
    - For headers and navigation, **always integrate with `GlobalHeader` via `LayoutContext` / `usePageTitle`**. Never render duplicate secondary in-game top bars or back buttons.
    - Use modern CSS features (CSS variables, `:has()`, Grid/Flexbox, `100dvh`) for clean, performant styling.
6.  **Type Safety (Strict TypeScript)**:
    - Avoid the `any` type. Use strongly typed interfaces, generics, and props.
    - Use Discriminated Unions for UI/fetch state (e.g., `status: 'idle' | 'loading' | 'success' | 'error'`) rather than separate boolean flags (`isLoading`, `isError`) to prevent impossible states.
7.  **React Anti-Patterns to Avoid**:
    - **No Side Effects in Render**: Never trigger side effects or write state modifications directly in the render cycle. Use event handlers or proper `useEffect` hooks with correct dependency arrays.
    - **Stable Keys**: Always use unique, stable IDs as list item `key` props (never use array indices unless the array is strictly static and read-only).
    - **Single Source of Truth**: Avoid duplicating state. If a value can be derived or computed from existing state or props, compute it on the fly (optionally memoizing it with `useMemo` if expensive).
    - **Immutability**: Never mutate state variables directly. Always use the setter function with pure state updates (e.g., `setState(prev => [...prev, newItem])`).

### 4.1 Mandatory Component & Logic Reuse Catalog

All agents must check this inventory before building feature code:

| Area / Module | Path | What It Provides & When to Use It |
| :--- | :--- | :--- |
| **Player Management** | `src/modules/player-management` | `<PlayerManagerCard />`, `useLobbyPlayers`, `playerLogic.ts`. Mandatory for all lobby player lists, add/remove, min/max limits, remote player toggles, and persistence. |
| **Sync & Mailbox** | `src/modules/sync` | `MqttMailboxService<T>`. Reusable generic MQTT peer-turn/session sync with multi-broker fallback and BroadcastChannel. |
| **Drawing & Stroke Replay** | `src/modules/drawing` | `<ExcalidrawViewer />`, `<ExcalidrawLazy />`, `excalidrawScene.ts`. Canvas rendering and animated stroke playback. |
| **Session Sharing & Editing** | `src/modules/sharing` | `<ShareSessionLinksDialog />`, `<EditSessionDialog />`. QR code generation, LZString compressed link sharing, Web Share API, and player renaming. |
| **Async Game IDB Storage** | `src/modules/async-game` | `createIdbStoreOperations`, `runWithStore`, `cursorCollect`, `requestToPromise`. Standardized IndexedDB CRUD without raw transaction boilerplate. |
| **Confirmation Dialog** | `src/components/common/ConfirmDialog.tsx` | Accessible MUI confirmation modal for destructive/critical actions (replaces `window.confirm()`). |
| **3D Dice Component** | `src/components/games/Die3D.tsx` | Standard 3D animated dice with rolling animation, selection glow, and preset colors (`white`, `red`, `yellow`, `green`, `blue`). |
| **Header & Titles** | `src/context/LayoutContext.tsx` & `usePageTitle` | Single global top bar (`GlobalHeader`). Registers page titles, action menus, and safe hub exit. |
| **Push Notification Banner** | `src/components/push/PushNotificationBanner.tsx` | 1-click Web Push & ntfy status badge and permission request. |
| **Empty States** | `src/components/feedback/EmptyState.tsx` | Standard placeholder for empty lists, search misses, or inactive states. |
| **Centralized Storage** | `src/lib/storage.ts` | Memory-fallback safe storage. All keys MUST be added to `STORAGE_KEYS`. |

## 5. Localization (i18n)

Agents **MUST** adhere to strict internationalization standards when working on UI code:
1. **Never Hardcode Strings**: All user-facing text must use the translation function (e.g., `t('game.key')`).
2. **Always Update Translation Files**: When adding a new translation key in a component, the agent **MUST** simultaneously update the corresponding translation files (like `i18n/index.ts` or JSONs) for **both** English and German (or all supported languages).
3. **No Silent Failures**: Leaving translation files incomplete leads to raw keys showing in the UI. Double-check that every new key is mapped.

## 6. Enforcement & Automated Quality Gates

Every pull request and commit must pass automated checks. Violations will cause immediate failure in the CI pipeline (`.github/workflows/ci.yml`).

-   **Pre-Flight Architecture Check**: Always execute `npm run check:architecture:diff` (or `npm run check:architecture`) before submitting work. Zero violations permitted.
-   **No Cross-Game Imports**: Games must never import from other games (`src/games/<A>` -> `src/games/<B>` is strictly forbidden and blocked by ESLint).
-   **No Raw Storage**: Always use `src/lib/storage.ts` with `STORAGE_KEYS`. Never call `localStorage` or `sessionStorage` directly.
-   **No Native Dialogs**: Always use MUI `<Dialog>` or `<ConfirmDialog>`. `window.confirm` and `window.prompt` will fail the build.
-   **Strict TypeScript**: Avoid `any`. Interfaces and discriminated unions are mandatory.
-   **File Size Limits**: Keep UI files under 250-300 lines. Break large components down into sub-components and custom hooks.
-   **Do not skip planning** for non-trivial, significant tasks.
-   **Always perform a Reuse Audit** in Phase 1 before proposing new code (consult Section 4.1).
-   **Do not introduce lint or compiler errors**: `npm run lint` and `npm run build` (`tsc -b && vite build`) must pass without errors or unhandled warnings.
-   **Never leave translations missing**: Always supply both German (`de`) and English (`en`) keys.

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
