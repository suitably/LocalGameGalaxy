---
type: Coding Standard
title: Coding Conventions & Anti-God-Component Architecture
description: Standards for TypeScript, React, Material UI, file organization, component budgets, and architectural boundaries.
resource: src/
tags: [conventions, solid, srp, typescript, react, quality-gates]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
sources:
  - id: agy-rules
    resource: /AGENTS.md
    title: LocalGameGalaxy Agent Guidelines
---

# Coding Conventions & Anti-God-Component Architecture

> [!IMPORTANT]
> All code contributed to LocalGameGalaxy must strictly adhere to these conventions. Automated checks (`npm run check:architecture:diff` and `npm run check:budget`) enforce these rules on every pull request.

---

## 1. Anti-God-Component Architecture & Decomposition Pattern

To prevent monolithic "God Components" that bundle multiple responsibilities:

- **Single Responsibility Principle (SRP)**: A component must either orchestrate (Container) or present (Presenter/Leaf). Never mix storage/network sync + complex calculation + multi-section layout in one file.
- **Size Budget**:
  - **Hard Limit**: Max **250 lines** per `.tsx` component.
  - **Warning Zone**: **200–250 lines** — extract hooks or sub-components before adding more code.
  - **Orchestrator Components**: Target **< 160 lines** by composing sub-components with clean props.
- **Standard 3-Tier Decomposition Pattern**:
  1. *Custom Hook*: Extract state, side-effects (`useEffect`), storage persistence, and network/event handlers into `use<Feature>State.ts` or `use<Component>Settings.ts`.
  2. *Focused Sub-Components*: Break distinct UI blocks (dialogs, cards, lists, toolbars) into dedicated sub-components with typed props. Co-locate in the same directory or a `components/` subfolder.
  3. *Types Extraction*: Place shared interfaces in a co-located `types.ts` and re-export from the entry point for backward compatibility.
- **Ratchet Rule for Legacy Components**:
  - Existing components exceeding 250 lines are tracked in `scripts/legacy-component-baselines.json`.
  - **Never expand a God Component**: Any modification to a legacy file must maintain or decrease its line count. New logic must be placed in extracted hooks or sub-components.
  - When a legacy component is refactored below 250 lines, remove it from `scripts/legacy-component-baselines.json` to lock in the improvement.

---

## 2. Zero-Tolerance Anti-Pattern Matrix

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
| **Tracked Server Media** (`server/music/`, audio stems) | Bloats git history with copyrighted binaries | Keep in `.gitignore`, never track songs or stems in git |

---

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

## 5. Verification Commands

Run before marking tasks as complete:
```bash
npm run check:architecture:diff
npm run check:budget
npm run check:duplicates
npm run check:docs
npm run lint
npm test
npm run build
```
