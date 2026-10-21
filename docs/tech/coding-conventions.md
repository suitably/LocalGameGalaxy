---
type: Reference
title: 'Coding conventions and anti-God-component rules'
description: 'Home of the code rules: SRP and the 250-line component budget with ratchet, the 3-tier decomposition pattern, the anti-pattern matrix with what actually enforces each rule, naming and MUI styling conventions.'
tags: [conventions, solid, component-budget, anti-patterns, typescript, mui]
status: stable
generated:
  at: 2026-10-18T15:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-18
  method: 'enforcement column checked against scripts/check-architecture.mjs, scripts/check-component-budget.js, scripts/check-repo-hygiene.mjs, eslint.config.js, .jscpd.json'
sources:
  - 'scripts/check-architecture.mjs'
  - 'scripts/check-component-budget.js'
  - 'eslint.config.js'
  - 'merged from: previous version of 2026-09-27'
---

# Coding Conventions & Anti-God-Component Architecture

> [!IMPORTANT]
> All code contributed to LocalGameGalaxy must follow these conventions. Some are enforced automatically, some only in review — see the "Enforced by" column in §2.

---

## 1. Anti-God-Component Architecture & Decomposition Pattern

To prevent monolithic "God Components" that bundle multiple responsibilities:

- **Single Responsibility Principle (SRP)**: A component must either orchestrate (Container) or present (Presenter/Leaf). Never mix storage/network sync + complex calculation + multi-section layout in one file.
- **Size Budget**:
  - **Hard Limit**: Max **250 lines** per `.tsx` component.
  - **Warning Zone**: **200–250 lines** — extract hooks or sub-components before adding more code.
  - **Orchestrator Components**: Target **< 160 lines** by composing sub-components with clean props.
- **Standard 3-Tier Decomposition Pattern**:
  1. _Custom Hook_: Extract state, side-effects (`useEffect`), storage persistence, and network/event handlers into `use<Feature>State.ts` or `use<Component>Settings.ts`.
  2. _Focused Sub-Components_: Break distinct UI blocks (dialogs, cards, lists, toolbars) into dedicated sub-components with typed props. Co-locate in the same directory or a `components/` subfolder.
  3. _Types Extraction_: Place shared interfaces in a co-located `types.ts` and re-export from the entry point for backward compatibility.
- **Ratchet Rule for Legacy Components**:
  - Existing components exceeding 250 lines are tracked in `scripts/legacy-component-baselines.json`.
  - **Never expand a God Component**: Any modification to a legacy file must maintain or decrease its line count. New logic must be placed in extracted hooks or sub-components.
  - When a legacy component is refactored below 250 lines, remove it from `scripts/legacy-component-baselines.json` to lock in the improvement.

---

## 2. Anti-pattern matrix

Forbidden in **new and changed code**. "Enforced by" says what fails automatically; everything else is caught only in review — do not rely on CI for it.

| Forbidden                                                                          | Why                                       | Do instead                                                       | Enforced by                                                                                                                                                           |
| :--------------------------------------------------------------------------------- | :---------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-game import** (`src/games/<A>` → `src/games/<B>`)                          | couples games                             | move to `src/modules/*`, `src/components/*`, `src/lib/*`         | `check:architecture` (fails)                                                                                                                                          |
| **Raw storage** (`localStorage.` / `sessionStorage.` outside `src/lib/storage.ts`) | bypasses memory fallback and key registry | `storage.*` / `sessionStorageSafe` + a `STORAGE_KEYS` entry      | `check:architecture` (fails); unregistered key strings are **not** detected ([Q8](../open-questions.md#q8--game-local-storage-keys-bypass-the-storage_keys-registry)) |
| **Native dialogs** (`confirm`, `prompt`, `alert`)                                  | blocks thread, broken on Capacitor        | `ConfirmDialog` / MUI `<Dialog>`                                 | ESLint `no-restricted-globals` / `no-restricted-properties` + `check:architecture` (fail)                                                                             |
| **God component** (new `.tsx` > 250 lines, or growing a baseline file)             | SRP, testability                          | hook + sub-components                                            | `check:budget` (fails); `check:architecture` only warns at 300                                                                                                        |
| **Copy-paste** (clones ≥ 12 lines / 60 tokens)                                     | divergent duplicates                      | extract to a shared module                                       | `check:duplicates` (fails above 2.5 % total)                                                                                                                          |
| **Tracked server media** (`server/music/`, stems)                                  | copyrighted binaries in git               | keep ignored                                                     | `check:architecture` (fails)                                                                                                                                          |
| **Committed keystores / secrets / `.only` tests / `debugger`**                     | leaks, broken CI                          | —                                                                | `check:hygiene` (fails)                                                                                                                                               |
| **Untyped code** (`: any`, `as any`, `<any>`)                                      | disables type safety                      | generics, interfaces, `unknown` + guards                         | ESLint warning; `check:lint-budget` fails when a file gains warnings ([budget](#eslint-warning-budget))                                                               |
| **Inline `BroadcastChannel` sync** in games                                        | leaks channels, duplicates sync           | `useMultiChannelSync()`                                          | review only; Melodiq still violates it ([Q4](../open-questions.md#q4--melodiq-uses-inline-broadcastchannel))                                                          |
| **Hardcoded UI strings**                                                           | breaks i18n                               | `t('key')` in both languages ([i18n-strategy](i18n-strategy.md)) | review only (`public/locales` parity is checked by `check:hygiene`)                                                                                                   |
| **Game rules inside components**                                                   | untestable                                | pure functions in `logic/*.ts` + Vitest                          | review only                                                                                                                                                           |
| **Contradictory boolean flags**                                                    | illegal states                            | discriminated unions                                             | review only                                                                                                                                                           |
| **Reinventing shared primitives**                                                  | duplicate logic                           | reuse catalog in [AGENTS.md](../../AGENTS.md#5-reuse-catalog)    | review only (partly `check:duplicates`)                                                                                                                               |

## 3. Naming Conventions

### Variables & Functions

- Use **camelCase** for variables, functions, and custom hooks.
  ```typescript
  const activeSessionId = '123';
  function calculateTurnScore() { ... }
  function useLobbyPlayers() { ... }
  ```

### Types & Interfaces

- Use **PascalCase** for TypeScript interfaces, types, and classes.
- Prefer interfaces for object schemas and types for unions, discriminants, or intersections.
- Do NOT prefix interfaces with `I` (e.g. use `GameSession` instead of `IGameSession`).
  ```typescript
  interface PlayerProfile {
    id: string;
    username: string;
  }
  type GameStatus = 'idle' | 'loading' | 'success' | 'error';
  ```

### React Components

- Use **PascalCase** for React components and their respective filenames (`WerewolfGame.tsx`, `GlobalHeader.tsx`).

---

## 4. Material UI (MUI) Styling Preferences

- **Prefer inline styling via the `sx` prop** for small, layout-specific adjustments (paddings, margins, alignment).
- **Use `styled()` from `@mui/material/styles`** for complex, highly reusable components that need clean DOM elements.
- **Theme Tokens**: Never hardcode hex color codes directly. Always reference theme tokens (`theme.palette.primary.main`, `theme.palette.background.default`) to ensure dark/light mode compatibility.

---

### ESLint warning budget

`no-explicit-any`, `max-lines`, `no-unused-vars` and the other rules configured as `warn` are enforced by a per-file ratchet, `npm run check:lint-budget` (`scripts/check-lint-budget.mjs`, logic in `scripts/lib/lint-budget.mjs`):

- `scripts/lint-warning-baselines.json` holds the allowed warning count per file (generated 2026-10-21: 516 warnings in 157 files). A file above its count, or a new file with any warning, fails.
- When a file improves, the check fails until the baseline is lowered: `npm run check:lint-budget -- --update` (only lowers, never raises). Commit the JSON in the same PR.
- Runs in `pre-push`, `npm run quality-gates`, `npm run ci:gates` and the CI `lint` job. `lint-staged` runs `eslint --fix` (errors block; warnings are left to the budget), so a file with old warnings can be edited without `--no-verify`.
- Errors still fail `npm run lint`.

## 5. Verification Commands

Run before marking tasks as complete:

```bash
npm run check:architecture:diff
npm run check:budget
npm run check:duplicates
npm run check:docs
npm run lint
npm run check:lint-budget
npm test
npm run build
```
