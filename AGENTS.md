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
- **File size**: Max ~250 lines per component. Extract logic into custom hooks.
- **Dialogs**: Use MUI `<Dialog>` or [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx). Never `window.confirm()` or native `<dialog>`.
- **Storage**: Use [`src/lib/storage.ts`](src/lib/storage.ts) with `STORAGE_KEYS`. Never raw `localStorage`.
- **Header**: Integrate with `GlobalHeader` via [`LayoutContext`](src/context/LayoutContext.tsx) / `usePageTitle`. No duplicate top bars.
- **TypeScript**: No `any`. Use discriminated unions for state (`status: 'idle' | 'loading' | 'success' | 'error'`).
- **CSS**: CSS variables, Grid/Flexbox, `100dvh`.

## 4. Verification

Always run before marking done:

```bash
npm run lint    # ESLint
npm run build   # tsc -b && vite build
```

## 5. Reuse Catalog

Search this inventory before building new feature code:

| Module | Path | Provides |
|:---|:---|:---|
| **Player Management** | `src/modules/player-management` | `<PlayerManagerCard>`, `useLobbyPlayers`, `playerLogic.ts` — lobby player lists, add/remove, min/max, persistence |
| **Sync & Mailbox** | `src/modules/sync` | `MqttMailboxService<T>` — MQTT peer-sync with multi-broker fallback & BroadcastChannel |
| **Drawing** | `src/modules/drawing` | `<DrawingCanvas>`, `<ExcalidrawViewer>`, `<ExcalidrawLazy>`, `excalidrawScene.ts` — canvas rendering, interactive drawing + stroke replay |
| **Sharing** | `src/modules/sharing` | `<ShareSessionLinksDialog>`, `<EditSessionDialog>` — QR codes, LZString links, Web Share API |
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
