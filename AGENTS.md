# Agent Guidelines

## 1. Project References

- **Architecture (SSoT)**: [`docs/tech/architecture.md`](docs/tech/architecture.md) — single source of truth for system design.
- **Tech Docs**: `docs/tech/` — coding conventions, data models, deployment, i18n strategy, sync protocol, etc.
- **Workflows**: `docs/workflows/` — reusable step-by-step processes. Document new ones here.

## 2. Workflow

**Complex tasks** → Use the agent's built-in planning mode (`implementation_plan` → `task` → `walkthrough` artifacts). Before coding:

1. Read `docs/tech/architecture.md` and relevant tech docs.
2. **Reuse Audit** (mandatory): Search `src/modules/`, `src/components/`, `src/lib/` for existing solutions (see §5 catalog).
3. Explicitly list reused shared modules in your plan.
4. After completion: update `docs/tech/architecture.md` if system structure changed.

**Minor tasks / bugfixes** → Implement directly. Run verification (§4) before committing. Update architecture doc if needed.

## 3. Project-Specific Code Rules

- **No cross-game imports**: `src/games/<A>` must never import from `src/games/<B>`. Extract shared code to `src/modules/`, `src/components/`, or `src/lib/`.
- **Dialogs**: Use MUI `<Dialog>` or [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx). Never `window.confirm()` or native `<dialog>`.
- **Storage**: Use [`src/lib/storage.ts`](src/lib/storage.ts) with `STORAGE_KEYS`. Never raw `localStorage`.
- **Header**: Integrate with `GlobalHeader` via [`LayoutContext`](src/context/LayoutContext.tsx) / `usePageTitle`. No duplicate top bars.
- **TypeScript**: No `any`. Use discriminated unions for state (`status: 'idle' | 'loading' | 'success' | 'error'`).
- **CSS**: CSS variables, Grid/Flexbox, `100dvh`.

### 3.1 Anti-God-Component Architecture & Decomposition Pattern

To prevent monolithic "God Components" that bundle multiple responsibilities:

- **Single Responsibility Principle (SRP)**: A component must either orchestrate (Container) or present (Presenter/Leaf), never mix storage/network sync + complex calculation + multi-section layout in one file.
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

## 4. Verification & CI Pipeline

The project enforces quality gates via GitHub Actions (`.github/workflows/ci.yml`).

**When to run**: Only **after making code changes**, before marking a task as done.
**Do NOT run** lint, test, build, or any verification commands during the **planning or research phase** — no code has changed, so verification adds no value and wastes resources.

```bash
npm run check:architecture:diff # Verifies changed files against boundaries
npm run check:budget            # Component budget & anti-God-component ratchet
npm run lint                    # ESLint (0 errors)
npm test                        # Vitest unit tests
npm run build                   # tsc -b && vite build
```

## 5. Reuse Catalog

Search this inventory before building new feature code:

| Module | Path | Provides |
|:---|:---|:---|
| **Player Management** | `src/modules/player-management` | `<PlayerManagerCard>`, `useLobbyPlayers`, `playerLogic.ts` — lobby player lists, add/remove, min/max, persistence |
| **Sync & Mailbox** | `src/modules/sync` | `MqttMailboxService<T>` — MQTT peer-sync with multi-broker fallback & BroadcastChannel |
| **Drawing** | `src/modules/drawing` | `<DrawingCanvas>`, `<ExcalidrawViewer>`, `<ExcalidrawLazy>`, `excalidrawScene.ts` — canvas rendering, interactive drawing + stroke replay |
| **Sharing** | `src/modules/sharing` | `<ShareSessionLinksDialog>`, `<EditSessionDialog>`, `useGameJoinUrl`, `parseGameUrlParams` — QR codes, LZString links, URL param parsing, join hook, Web Share API |
| **Async Game IDB** | `src/modules/async-game` | `createIdbStoreOperations`, `runWithStore` — IndexedDB CRUD helpers |
| **Confirm Dialog** | `src/components/common/ConfirmDialog.tsx` | MUI confirmation modal (replaces `window.confirm()`) |
| **3D Dice** | `src/components/games/Die3D.tsx` | Animated 3D die with rolling animation, selection glow, preset colors |
| **Header & Titles** | `src/context/LayoutContext.tsx` | `GlobalHeader`, `usePageTitle`, action menus, safe hub exit |
| **Push Banner** | `src/components/push/PushNotificationBanner.tsx` | Web Push & ntfy permission banner |
| **Storage** | `src/lib/storage.ts` | Centralized storage with memory fallback. All keys in `STORAGE_KEYS` |

## 6. i18n

- All user-facing text via `t('key')`. Never hardcode strings.
- Update **both** [`public/locales/en/translation.json`](public/locales/en/translation.json) and [`public/locales/de/translation.json`](public/locales/de/translation.json) for every new key.

## 7. Capacitor (Android) UI

- **Safe Areas**: Use `var(--safe-area-inset-top)` from `capacitor-plugin-safe-area` on root containers and full-screen overlays. Fallback: `env(safe-area-inset-top, 0px)`.
- **Touch**: `user-select: none`, `-webkit-touch-callout: none` (except inputs), `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: contain`.
- **Back Button**: Handle via `App.addListener('backButton', ...)` — close modals/navigate before exiting.
- **Build**: Run `npx cap sync` after updating web assets.

## 8. Enforcement & Quality Gates

Every pull request and commit must pass automated checks. Violations will cause immediate failure in the CI pipeline (`.github/workflows/ci.yml`).

- **Pre-Flight Architecture Check**: Always execute `npm run check:architecture:diff` before submitting work. Zero violations permitted.
- **Component Size Ratchet**: `npm run check:budget` ensures no component grows beyond its budget.
- **No Cross-Game Imports**: Games must never import from other games (`src/games/<A>` -> `src/games/<B>` is strictly forbidden and blocked by ESLint and `check-architecture.mjs`).
- **No Raw Storage**: Always use `src/lib/storage.ts` with `STORAGE_KEYS`. Never call `localStorage` or `sessionStorage` directly.
- **No Native Dialogs**: Always use MUI `<Dialog>` or `<ConfirmDialog>`. `window.confirm` and `window.prompt` will fail the build.
- **Strict TypeScript**: Avoid `any`. Interfaces and discriminated unions are mandatory.
- **Do not introduce lint or compiler errors**: `npm run lint` and `npm run build` must pass without errors.
