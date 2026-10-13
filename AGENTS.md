# Agent Guidelines

## 1. Project References & OKF (Open Knowledge Format)

- **Knowledge Bundle Root (OKF v0.2)**: [`docs/index.md`](docs/index.md) — The central index for progressive disclosure navigation across technical domains.
- **Architecture SSoT**: [`docs/tech/architecture.md`](docs/tech/architecture.md) — Single Source of Truth for system design, state architecture, and shared modules.
- **Domain Tech Specs**: `docs/tech/` — [Sync Protocol](docs/tech/sync-protocol.md), [Data Persistence](docs/tech/persistence.md), [Coding Conventions](docs/tech/coding-conventions.md), [i18n](docs/tech/i18n-strategy.md), etc.
- **Workflows & Pipelines**: `docs/workflows/` — [SOLID Development Workflow](docs/workflows/solid_development.md) and [CI/CD Pipelines Reference](docs/workflows/ci-cd-pipelines.md).
- **Mandatory OKF Pre-Flight**: Before implementing or refactoring any feature, you MUST read the corresponding domain specification in `docs/tech/` via [`docs/index.md`](docs/index.md). Do not guess contracts or invent ad-hoc protocols.
- **OKF Maintenance**: When introducing or modifying architectural patterns, data models, or cross-game mechanisms, you MUST update the corresponding OKF document and verify [`docs/index.md`](docs/index.md).

## 2. Agent Workflow: Scope Control & Incremental Delivery

To prevent AI context drift, logical contradictions, and untested code sprawl:

- **Bite-Sized Slices**: Never implement multiple architectural layers at once (e.g., storage + sync + logic + multi-screen UI). Split work into:
  1. _Domain Logic & Types_: Pure functions + unit tests in `logic/`.
  2. _State & Integration_: Custom hooks (`use<Feature>State.ts`) connecting to storage/sync.
  3. _UI Components_: Composable presentation under 250 lines.
- **Reuse Audit (MANDATORY)**: Before writing code, search `src/modules/`, `src/components/`, `src/lib/`, and `src/hooks/` (see §6 catalog). If a solution exists, reuse or extend it. Reinventing existing primitives is strictly forbidden.
- **Read Before Modifying**: Always read the existing target file and its neighboring tests before proposing edits.
- **Verification Gate**: Run verification (§5) immediately after code changes. Never leave code unverified.

## 3. Project-Specific Code Rules

- **Pure Logic Separation**: All game rules, turn transitions, scoring, and validations MUST reside as pure, side-effect-free functions in `logic/*.ts` and be verified with Vitest (`logic/*.test.ts`). React components MUST NOT contain raw game mechanics.
- **State Invariants & Discriminated Unions**: Eliminate contradictory boolean states (e.g., `isLoading && isError` or `isPlaying && isLobby`). Always model states with discriminated unions (`type State = { status: 'idle' } | { status: 'loading' } | ...`).
- **No Cross-Game Imports**: `src/games/<A>` must never import from `src/games/<B>`. Extract shared code to `src/modules/`, `src/components/`, or `src/lib/`.
- **Dialogs**: Use MUI `<Dialog>` or [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx). Never `window.confirm()` or native `<dialog>`.
- **Storage**: Use [`src/lib/storage.ts`](src/lib/storage.ts) with registered keys in `STORAGE_KEYS`. Never call raw `localStorage` or `sessionStorage`.
- **Header**: Integrate with `GlobalHeader` via [`LayoutContext`](src/context/LayoutContext.tsx) / `usePageTitle`. No duplicate top bars or floating hub-exit buttons.
- **TypeScript**: No `any`. Strict typings, generics, or type-guarded `unknown`.
- **CSS**: CSS variables, Grid/Flexbox, `100dvh`.

### 3.1 Anti-God-Component Architecture & Decomposition Pattern

To prevent monolithic components that bundle state, effects, and layouts:

- **Single Responsibility Principle (SRP)**: A component must either orchestrate (Container) or present (Presenter/Leaf), never mix storage/network sync + calculation + layout in one file.
- **Size Budget**:
  - **Hard Limit**: Max **250 lines** per `.tsx` component.
  - **Warning Zone**: **200–250 lines** — extract hooks or sub-components before adding more code.
  - **Orchestrator Components**: Target **< 160 lines** by composing sub-components with clean props.
- **Standard 3-Tier Decomposition Pattern**:
  1. **Custom Hook**: Extract state, side-effects (`useEffect`), storage persistence, and network/event handlers into `use<Feature>State.ts` or `use<Component>Settings.ts`.
  2. **Focused Sub-Components**: Break distinct UI blocks (dialogs, cards, lists, toolbars) into dedicated sub-components with typed props. Co-locate in the same directory or a `components/` subfolder.
  3. **Types Extraction**: Place shared interfaces in a co-located `types.ts` and re-export from the entry point for backward compatibility.
- **Ratchet Rule for Legacy Components**:
  - Existing components exceeding 250 lines are tracked in `scripts/legacy-component-baselines.json`.
  - **Never expand a God Component**: Any modification to a legacy file must maintain or decrease its line count. New logic must be placed in extracted hooks or sub-components.
  - When a legacy component is refactored below 250 lines, remove it from `scripts/legacy-component-baselines.json` to lock in the improvement.

### 3.2 Zero-Tolerance Anti-Pattern Matrix

The following patterns are **strictly forbidden**. Any pull request, task, or commit containing them will be rejected by CI and automated architecture linting:

| 🚫 Forbidden Anti-Pattern                                             | Why It Is Blocked                                                | ✅ Mandatory Solution                                             |
| :-------------------------------------------------------------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Cross-Game Import** (`from '../<other>/...'`)                       | Couples games, breaks modular independence                       | Move to `src/modules/*` or `src/components/*`                     |
| **Reinventing Shared Primitives**                                     | Creates duplicate, divergent logic (players, dice, sync, modals) | Consult OKF (§1) & Reuse Catalog (§6); reuse `src/modules/*`      |
| **Embedded Game Rules in UI**                                         | Untestable game logic, spaghetti event handlers                  | Extract pure functions to `logic/*.ts` + unit tests               |
| **Contradictory Boolean Flags** (`isStarting && isEnded`)             | Causes illegal UI states and logic desync                        | Discriminated unions (`status: 'lobby' \| 'round' \| 'finished'`) |
| **Raw Storage** (`localStorage.` / `sessionStorage.`)                 | Bypasses memory fallback and key registry                        | Use `storage.get/set/remove()` from `src/lib/storage.ts`          |
| **Native Dialogs** (`window.confirm()`, `window.prompt()`, `alert()`) | Blocks main thread, breaks on Capacitor, unstyled                | Use `<ConfirmDialog />` or MUI `<Dialog>`                         |
| **Untyped Code** (`: any`, `<any>`, `as any`)                         | Disables TypeScript compiler safety                              | Use generics, interfaces, or `unknown` with type guards           |
| **God Component** (> 250 lines in `.tsx`)                             | Violates SRP, unmaintainable, test barrier                       | Split into sub-components + custom hook (`useFeatureLogic`)       |
| **Inline BroadcastChannel Sync** in Games                             | Duplicates network logic, leaks channels                         | Use `useMultiChannelSync()` from `src/modules/sync`               |
| **Hardcoded UI Strings** (`"Save"`, `"Delete"`)                       | Breaks internationalization (i18n)                               | Use `t('key')` and add to both `de` and `en`                      |
| **Tracked Server Media** (`server/music/`, audio stems)               | Bloats git history with copyrighted binaries                     | Keep in `.gitignore`, never track songs or stems in git           |

## 4. Anti-Duplication Rule & Code Hygiene

- **Duplication Threshold**: Code duplication across files is monitored by `jscpd` (`npm run check:duplicates`). Copy-pasting logic blocks (> 10 lines) is blocked.
- **Refactor Before Copy**: If you need logic or UI that exists in another component or game, extract it to a shared module (`src/modules/`, `src/hooks/`, `src/components/`) first.
- **Single Source of Truth**: Never maintain two parallel implementations of the same domain concept (e.g., latency calibration, song downloading, player rosters).

## 5. Verification & CI Pipeline

The project enforces quality gates via local Git hooks (Husky) and GitHub Actions (`.github/workflows/ci.yml`).

- **Pre-Commit Hook (`.husky/pre-commit`)** (< 10s): Runs `lint-staged` (ESLint `--fix`, Prettier formatting on staged files), `check:hygiene`, and `check:architecture:diff`.
- **Pre-Push Hook (`.husky/pre-push`)** (< 2 min): Runs `check:budget`, `check:duplicates`, and `npm test` (Vitest) before pushing code.
- **Local Full Suite (`npm run quality-gates`)**: Shortcut running all hygiene, architecture, budget, duplicate, lint, and vitest checks locally.

**When to run**: Only **after making code changes**, before marking a task as done.
**Do NOT run** lint, test, build, or any verification commands during the **planning or research phase** — no code has changed, so verification adds no value and wastes resources.

```bash
npm run check:architecture:diff # Verifies changed files against boundaries
npm run check:budget            # Component budget & anti-God-component ratchet
npm run check:duplicates        # Code duplication scan (jscpd)
npm run check:docs              # Documentation & translation sync gate
npm run lint                    # ESLint (0 errors)
npm test                        # Vitest unit tests
npm run build                   # tsc -b && vite build
```

## 6. Reuse Catalog

Search this inventory before building new feature code:

| Module                | Path                                             | Provides                                                                                                                                                           |
| :-------------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Player Management** | `src/modules/player-management`                  | `<PlayerManagerCard>`, `useLobbyPlayers`, `playerLogic.ts` — lobby player lists, add/remove, min/max, persistence                                                  |
| **Sync & Mailbox**    | `src/modules/sync`                               | `MqttMailboxService<T>`, `useMultiChannelSync` — MQTT peer-sync with multi-broker fallback & BroadcastChannel                                                      |
| **Drawing**           | `src/modules/drawing`                            | `<DrawingCanvas>`, `<ExcalidrawViewer>`, `<ExcalidrawLazy>`, `excalidrawScene.ts` — canvas rendering, interactive drawing + stroke replay                          |
| **Sharing**           | `src/modules/sharing`                            | `<ShareSessionLinksDialog>`, `<EditSessionDialog>`, `useGameJoinUrl`, `parseGameUrlParams` — QR codes, LZString links, URL param parsing, join hook, Web Share API |
| **Async Game IDB**    | `src/modules/async-game`                         | `createIdbStoreOperations`, `runWithStore` — IndexedDB CRUD helpers                                                                                                |
| **Confirm Dialog**    | `src/components/common/ConfirmDialog.tsx`        | MUI confirmation modal (replaces `window.confirm()`)                                                                                                               |
| **3D Dice**           | `src/components/games/Die3D.tsx`                 | Animated 3D die with rolling animation, selection glow, preset colors                                                                                              |
| **Header & Titles**   | `src/context/LayoutContext.tsx`                  | `GlobalHeader`, `usePageTitle`, action menus, safe hub exit                                                                                                        |
| **Push Banner**       | `src/components/push/PushNotificationBanner.tsx` | Web Push & ntfy permission banner                                                                                                                                  |
| **Storage**           | `src/lib/storage.ts`                             | Centralized storage with memory fallback. All keys registered in `STORAGE_KEYS`                                                                                    |
| **Audio Processing**  | `src/modules/audio`                              | `MicrophoneManager`, `AudioUtils` — pitch detection, autocorrelation, RMS volume, MIDI pitch mapping                                                               |

## 7. i18n

- All user-facing text via `t('key')`. Never hardcode strings.
- Update **both** [`public/locales/en/translation.json`](public/locales/en/translation.json) and [`public/locales/de/translation.json`](public/locales/de/translation.json) for every new key.

## 8. Capacitor (Android) UI

- **Safe Areas**: Use `var(--safe-area-inset-top)` from `capacitor-plugin-safe-area` on root containers and full-screen overlays. Fallback: `env(safe-area-inset-top, 0px)`.
- **Touch**: `user-select: none`, `-webkit-touch-callout: none` (except inputs), `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: contain`.
- **Back Button**: Handle via `App.addListener('backButton', ...)` — close modals/navigate before exiting.
- **Build**: Run `npx cap sync` after updating web assets.

## 9. Enforcement & Quality Gates

Every pull request and commit must pass automated checks. Violations will cause immediate failure in the CI pipeline (`.github/workflows/ci.yml`).

- **Pre-Flight Architecture Check**: Always execute `npm run check:architecture:diff` before submitting work. Zero violations permitted.
- **Component Size Ratchet**: `npm run check:budget` ensures no component grows beyond its budget.
- **No Cross-Game Imports**: Games must never import from other games (`src/games/<A>` -> `src/games/<B>` is strictly forbidden and blocked by ESLint and `check-architecture.mjs`).
- **No Raw Storage**: Always use `src/lib/storage.ts` with `STORAGE_KEYS`. Never call `localStorage` or `sessionStorage` directly.
- **No Native Dialogs**: Always use MUI `<Dialog>` or `<ConfirmDialog>`. `window.confirm` and `window.prompt` will fail the build.
- **Strict TypeScript**: Avoid `any`. Interfaces and discriminated unions are mandatory.
- **Do not introduce lint or compiler errors**: `npm run lint` and `npm run build` must pass without errors.
