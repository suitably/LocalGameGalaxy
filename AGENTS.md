# AGENTS.md — operating rules for agents in LocalGameGalaxy

You are working in `suitably/LocalGameGalaxy` (product name **Nexumia**): an offline-first React 19 / Vite PWA with 15 local party games, an optional Hono companion server (`server/`) and a signaling tracker (`signaling/`). Other agents (Copilot, Claude Code) read this file too — `.github/copilot-instructions.md` and `CLAUDE.md` point here.

The knowledge base is [`docs/`](docs/index.md) (Open Knowledge Format v0.2). Start there.

## 1. Before you act

1. Read [`docs/index.md`](docs/index.md), then the doc for your area. For anything game-specific read [`docs/tech/game-catalog.md`](docs/tech/game-catalog.md) first.
2. Check [`docs/open-questions.md`](docs/open-questions.md) — your topic may have a known contradiction or a pending maintainer decision. Do not silently "fix" an item marked _(user)_.
3. **Verify, don't trust.** Every doc carries `verified.at`. Code wins over docs; if they disagree, fix the doc in the same change or add an open question. Quick checks are in §9.
4. Read the target file and its neighbouring tests before editing. Check open PRs for overlapping work (`gh pr list`).

## 2. Environment and workflow

- Node **24** (`.nvmrc`, `engines`). Three npm packages with their own lockfiles: root, `server/`, `signaling/` — run `npm ci` in the one you touch.
- GitHub is primary; `main` is protected (PR required; required checks "Deterministic Prechecks (no install)" and "CI Quality Gate (Aggregator)"). GitLab (`gitlab` remote) is a mirror running the same `npm run ci:gates`.
- Branches `feature/…`, `bugfix/…`, `docs/…`, `refactor/…`, `chore/…`; commits in Conventional Commits ([CONTRIBUTING.md](CONTRIBUTING.md)). The PR title prefix matters: `chore|refactor|style|test|docs|perf:` bypasses the doc-sync gate.
- Husky runs gates on commit and push. Do not bypass them with `--no-verify`.
- Do not edit generated or local-only paths: `dist/`, `dev-dist/`, `server/dist/`, `node_modules/`, `android/app/build/`, `android/local.properties`, `server/music/`.
- **Secrets — do not read, print or commit:** any `config.json` (server token, USDB password, GitHub token), `.env*`, keystores (`*.jks`, `*.keystore`, `*.p12`), `android/app/release.jks`. Use `server/config.example.json` for examples.

## 3. Scope control and incremental delivery

- **Bite-sized slices.** Do not implement several layers at once (storage + sync + logic + multi-screen UI). Order: (1) domain logic and types — pure functions + tests in `logic/`; (2) state and integration — `use<Feature>State.ts` hooks; (3) UI — components under 250 lines.
- **Reuse audit first.** Search `src/modules/`, `src/components/`, `src/lib/`, `src/hooks/` (catalog in §5). Extend what exists; never build a second implementation of the same concept (player rosters, sync, dice, dialogs, latency calibration, song download).
- **Verification gate.** Run §8 after code changes, not during research or planning.

## 4. Code rules

The full rule set with what enforces each rule lives in [`docs/tech/coding-conventions.md`](docs/tech/coding-conventions.md). The essentials:

- **No cross-game imports** (`src/games/<A>` → `src/games/<B>`). Shared code goes to `src/modules/`, `src/components/` or `src/lib/`. _(check:architecture fails)_
- **Storage only via `src/lib/storage.ts`** (`storage`, `sessionStorageSafe`) with keys registered in `STORAGE_KEYS` / `STORAGE_PREFIXES`. Never `localStorage.` / `sessionStorage.` directly. _(check:architecture fails on raw access; unregistered keys are a known gap — Q8)_
- **No native dialogs** (`confirm`, `prompt`, `alert`). Use [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx) or MUI `<Dialog>`. _(ESLint + check:architecture fail)_
- **Component budget:** new `.tsx` files ≤ 250 lines (aim < 160 for orchestrators); files in `scripts/legacy-component-baselines.json` must never grow, and are removed from it once ≤ 250. Decompose into a `use<Feature>State.ts` hook, focused sub-components and a co-located `types.ts`. _(check:budget fails)_
- **Pure game logic** in `logic/*.ts` with Vitest tests; components hold no game rules.
- **Discriminated unions** instead of contradictory boolean flags.
- **No `any`** in new or changed code — use generics, interfaces or `unknown` with guards. _(ESLint only warns; existing debt: Q3)_
- **No inline `BroadcastChannel`** in games — use `useMultiChannelSync()`. _(review only; Melodiq still violates it: Q4)_
- **No hardcoded UI strings** (§6).
- **Header:** integrate with `GlobalHeader` via `TitleContext` / `HeaderLayoutContext` (`usePageTitle`, `useHeaderLayout`); `LayoutContext` is the backward-compatible composite. No second top bar, no floating hub-exit buttons.
- **CSS:** theme tokens (no hard-coded hex in components), Grid/Flexbox, `100dvh`.
- **Never commit media** under `server/music/` (songs, stems). _(check:architecture fails)_
- **No copy-paste** blocks; `jscpd` fails above 2.5 % duplication (clones from 12 lines). _(check:duplicates)_

## 5. Reuse catalog

| Module                 | Path                                                      | Provides                                                                                                      |
| :--------------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| Player management      | `src/modules/player-management`                           | `PlayerManagerCard`, `useLobbyPlayers`, `playerLogic.ts` — lobby lists, add/remove, min/max, persistence      |
| Sync & mailbox         | `src/modules/sync`                                        | `MqttMailboxService<T>` (HiveMQ → EMQX, LZString, dedup), `useMultiChannelSync` (BroadcastChannel + MQTT)     |
| Drawing                | `src/modules/drawing`                                     | `DrawingCanvas`, `ExcalidrawViewer`, `ExcalidrawLazy`, `excalidrawScene.ts`                                   |
| Sharing                | `src/modules/sharing`                                     | `ShareSessionLinksDialog`, `EditSessionDialog`, `useGameJoinUrl`, `parseGameUrlParams`, `cleanWindowUrlQuery` |
| Async game IDB         | `src/modules/async-game`                                  | `createOpenDatabase`, `createIdbStoreOperations`, `runWithStore`, `cursorCollect`                             |
| Audio                  | `src/modules/audio`                                       | `MicrophoneManager`, `AudioUtils` — pitch detection, RMS gate, MIDI mapping                                   |
| Confirm dialog         | `src/components/common/ConfirmDialog.tsx`                 | MUI confirmation modal                                                                                        |
| 3D dice                | `src/components/games/Die3D.tsx`                          | animated die                                                                                                  |
| Header & titles        | `src/context/TitleContext.tsx`, `HeaderLayoutContext.tsx` | `usePageTitle`, `useHeaderLayout`, actions, menu items, safe hub exit                                         |
| Push                   | `src/components/push/`, `src/lib/push/pushClient.ts`      | permission banner, settings, Web Push / ntfy client                                                           |
| Storage                | `src/lib/storage.ts`                                      | key/value storage with memory fallback, `STORAGE_KEYS`                                                        |
| Wake lock, orientation | `src/hooks/useWakeLock.ts`, `useScreenOrientation.ts`     | keep screen on, lock orientation                                                                              |
| GitHub publishing      | `src/lib/github.ts`                                       | `createGitHubPR` (REST via `fetch`)                                                                           |
| WebRTC                 | `src/lib/webrtc`                                          | `WebRTCHostManager`, `useWebRTCClient`, `WebRTCHostContext`, tracker logic                                    |

## 6. i18n

- All user-facing text via `t('key')`, always in **both** `de` and `en`.
- Put a string where its game already keeps its strings: `public/locales/{de,en}/translation.json`, or the game's own bundle `src/games/<id>/i18n/index.ts` (cards, kniffel, knister, melodiq, qwixx, sudoku, wordle). Hub title/description keys always go to `public/locales`. Details: [`docs/tech/i18n-strategy.md`](docs/tech/i18n-strategy.md).

## 7. Capacitor (Android) UI

- Safe areas: `var(--safe-area-inset-top)` from `capacitor-plugin-safe-area` on root containers and full-screen overlays; fallback `env(safe-area-inset-top, 0px)`.
- Touch: `user-select: none`, `-webkit-touch-callout: none` (except inputs), `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: contain`.
- Back button: `App.addListener('backButton', …)` — close modals / navigate before exiting.
- After web changes that must reach the app: `npm run build && npx cap sync android`.

## 8. Verification

Run **after code changes**, before you call a task done. Do not run gates during research or planning.

```bash
npm run check:architecture:diff # boundaries on changed files (fails on new violations)
npm run check:budget            # 250-line budget + legacy ratchet
npm run check:duplicates        # jscpd
npm run check:docs              # doc-sync gate: core changes in src/games|modules|lib need CHANGELOG/docs/tech/AGENTS/README/locales
npm run lint                    # ESLint, 0 errors
npm test                        # Vitest
npm run build                   # tsc -b && vite build
npm run quality-gates           # hygiene + architecture:diff + budget + duplicates + lint + test
cd server && npm run build && npm test   # when server/ changed (tests run against dist/)
```

Hooks: pre-commit = `lint-staged` + `check:hygiene` + `check:architecture:diff`; pre-push = `check:budget` + `check:duplicates` + `npm test`.

## 9. Keeping the knowledge bundle correct (OKF v0.2)

Format: one concept per markdown file, YAML front matter, progressive disclosure through `index.md` files ([spec](docs/references/external-sources.md#okf)).

**Front matter for concept docs** (everything except `index.md` files, `log.md`, `open-questions.md`):

```yaml
---
type: Reference | Howto | Report | ADR | Task
title: '…'
description: 'One sentence — agents use it to decide whether to open the file.'
tags: […]
status: stable | draft | deprecated
generated:
  at: 2026-10-18T15:00:00+02:00 # last meaningful content edit
  by: claude-code # tool/agent name, no model ids
verified:
  at: 2026-10-18 # last time claims were checked against the code
  method: 'what you read or ran'
sources:
  - 'src/… or URL'
---
```

Rules:

- Only the root `docs/index.md` carries `okf_version`. Directory `index.md` files have no front matter.
- **Relative markdown links** with `.md` (`[text](../tech/persistence.md#2-indexeddb-databases)`). Never `file:///…` or absolute home paths.
- **One topic, one home.** Link to the owning doc instead of copying facts — duplicated facts drift (the 2026-10-18 audit found 149 broken references).
- Document what the code **does**, not what it should do. Name real files and symbols; check that they exist (`grep -rn <symbol> src server/src`) before writing them down.
- Mark uncertainty: `**Unverified:**`, `**Inference:**`.
- Contradiction you cannot resolve → add it to [`docs/open-questions.md`](docs/open-questions.md); resolved → move the answer into the owning doc, delete the item, note it in [`docs/log.md`](docs/log.md).
- Every change to the bundle → an entry at the top of [`docs/log.md`](docs/log.md) (`## YYYY-MM-DD — summary (agent)`; say whether code outside `docs/` changed).
- One-off investigations, audits, evaluations → `docs/reports/YYYY-MM-DD-topic.md`, never updated later except for corrections.
- Finished task specs and retired setups → `status: deprecated`, move to `docs/archive/`, fix incoming links. Open task specs live in `docs/tasks/` and mirror GitHub issues.
- New file → add it to its directory `index.md` and, if top-level relevant, to the table in `docs/index.md`.
- Architecture, data model, storage key, sync message, server route or game changes → update the owning doc (`architecture.md`, `game-catalog.md`, `persistence.md`, `sync-protocol.md`, …) in the same PR.
- Write docs in **English**.

## 10. Quick facts (read-only)

```sh
grep -n "id: '" src/lib/gameRegistry.tsx                  # registered games, hub order
grep -rn "topicPrefix:" src                               # MQTT topic prefixes
grep -rn -E "new Dexie\(|DB_NAME =|super\('" src/games    # IndexedDB databases
sed -n '/STORAGE_KEYS = {/,/} as const/p' src/lib/storage.ts
cat scripts/legacy-component-baselines.json               # components allowed over 250 lines
node scripts/check-architecture.mjs                       # full boundary report (no changes)
gh issue list --state open; gh pr list                    # open work
```
