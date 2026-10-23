# AGENTS.md — operating rules for agents in LocalGameGalaxy

`suitably/LocalGameGalaxy` (product **Nexumia**): offline-first React 19 / Vite PWA, 15 local party games, optional Hono companion server (`server/`), signaling tracker (`signaling/`). Read by Copilot and Claude Code too (`.github/copilot-instructions.md` and `CLAUDE.md` point here).

Knowledge base: [`docs/`](docs/index.md) (Open Knowledge Format v0.2).

## 1. Before you act

1. For changes, read **only** your area's doc from [`docs/index.md`](docs/index.md). For a game, grep its row in [`docs/tech/game-catalog.md`](docs/tech/game-catalog.md) (`grep -n -i "<game>" docs/tech/game-catalog.md` returns its line from every table) instead of reading the file. Questions and trivial fixes need no doc reading.
2. Before changing behaviour, grep [`docs/open-questions.md`](docs/open-questions.md) for your topic (known contradictions, pending maintainer decisions). Never silently "fix" an item marked _(user)_.
3. **Verify, don't trust.** Every doc carries `verified.at`. Code wins; if doc and code disagree, fix the doc in the same change or add an open question. Quick checks: §10.
4. Read the target file and its neighbouring tests before editing. Check open PRs for overlapping work (`gh pr list`).

## 2. Environment and workflow

- Node **24** (`.nvmrc`, `engines`). Three npm packages with own lockfiles: root, `server/`, `signaling/` — `npm ci` in the one you touch.
- GitHub is primary; `main` is protected (PR required; required checks "Deterministic Prechecks (no install)" and "CI Quality Gate (Aggregator)"). GitLab (`gitlab` remote) mirrors it and runs the same `npm run ci:gates`.
- Branches `feature/…`, `bugfix/…`, `docs/…`, `refactor/…`, `chore/…`; Conventional Commits ([CONTRIBUTING.md](CONTRIBUTING.md)). PR title prefix `chore|refactor|style|test|docs|perf:` bypasses the doc-sync gate.
- Husky runs gates on commit and push. Never bypass with `--no-verify`.
- Never edit generated or local-only paths: `dist/`, `dev-dist/`, `server/dist/`, `node_modules/`, `android/app/build/`, `android/local.properties`, `server/music/`.
- **Secrets — never read, print or commit:** any `config.json` (server token, USDB password, GitHub token), `.env*`, keystores (`*.jks`, `*.keystore`, `*.p12`), `android/app/release.jks`. Use `server/config.example.json` for examples. Claude Code: these reads (plus generated folders) are blocked in `.claude/settings.json`.

## 3. Scope control and incremental delivery

- **Small slices.** Never implement several layers at once (storage + sync + logic + multi-screen UI). Order: (1) domain logic and types — pure functions + tests in `logic/`; (2) state and integration — `use<Feature>State.ts` hooks; (3) UI — components under 250 lines.
- **Reuse audit first.** Search `src/modules/`, `src/components/`, `src/lib/`, `src/hooks/` (catalog: §5). Extend what exists; never build a second implementation of a concept (player rosters, sync, dice, dialogs, latency calibration, song download).
- **Verification:** run §8 after code changes, not during research or planning.

## 4. Code rules

Full rule set and what enforces each rule: [`docs/tech/coding-conventions.md`](docs/tech/coding-conventions.md). Essentials:

- **No cross-game imports** (`src/games/<A>` → `src/games/<B>`). Shared code goes to `src/modules/`, `src/components/` or `src/lib/`. _(check:architecture fails)_
- **Storage only via `src/lib/storage.ts`** (`storage`, `sessionStorageSafe`), keys registered in `STORAGE_KEYS` / `STORAGE_PREFIXES`. Never `localStorage.` / `sessionStorage.` directly. _(check:architecture fails on raw access; unregistered keys are a known gap — Q8)_
- **No native dialogs** (`confirm`, `prompt`, `alert`). Use [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx) or MUI `<Dialog>`. _(ESLint + check:architecture fail)_
- **Component budget:** new `.tsx` files ≤ 250 lines (orchestrators ideally < 160); files in `scripts/legacy-component-baselines.json` must never grow; when one shrinks, lock it in with `npm run check:budget -- --update` (fails otherwise). Split into a `use<Feature>State.ts` hook, focused sub-components and a co-located `types.ts`. _(check:budget fails)_
- **Game logic** pure, in `logic/*.ts`, with Vitest tests; components hold no game rules.
- **Discriminated unions**, not contradictory boolean flags.
- **No `any`** in new or changed code — generics, interfaces or `unknown` with guards. _(ESLint warning; `check:lint-budget` fails if a file gains warnings)_
- **No inline `BroadcastChannel`** in games — use `useMultiChannelSync()`. _(review only; Melodiq still violates it: Q4)_
- **No hardcoded UI strings** (§6).
- **Header:** integrate with `GlobalHeader` via `TitleContext` / `HeaderLayoutContext` (`usePageTitle`, `useHeaderLayout`); `LayoutContext` is the backward-compatible composite. No second top bar, no floating hub-exit buttons.
- **CSS:** theme tokens (no hard-coded hex in components), Grid/Flexbox, `100dvh`.
- **Never commit media** under `server/music/` (songs, stems). _(check:architecture fails)_
- **No copy-paste** blocks; `jscpd` fails above 2.5 % duplication (clones from 12 lines). _(check:duplicates)_

## 5. Reuse catalog

Before building anything shared (player rosters, sync, dice, dialogs, header actions, storage, push, WebRTC, wake lock), check [`docs/tech/architecture.md` §3.2](docs/tech/architecture.md#32-shared-modules-srcmodules). Extend what is listed; never build a second implementation.

## 6. i18n

- All user-facing text via `t('key')`, always in **both** `de` and `en`.
- Put a string where its game already keeps its strings: `public/locales/{de,en}/translation.json`, or the game's own bundle `src/games/<id>/i18n/index.ts` (cards, kniffel, knister, melodiq, qwixx, sudoku, wordle). Hub title/description keys always go to `public/locales`. Details: [`docs/tech/i18n-strategy.md`](docs/tech/i18n-strategy.md).

## 7. Capacitor (Android) UI

Safe areas, touch CSS, theme rules: [`docs/tech/styling.md`](docs/tech/styling.md). Back button: `App.addListener('backButton', …)` — close modals / navigate before exiting. Web changes that must reach the app: `npm run build && npx cap sync android`.

## 8. Verification

Run **after code changes**, before calling a task done. Never during research or planning.

```bash
npm run check:architecture:diff # boundaries on changed files (fails on new violations)
npm run check:budget            # 250-line budget + legacy ratchet
npm run check:duplicates        # jscpd
npm run check:docs              # doc-sync gate: core changes in src/games|modules|lib need CHANGELOG/docs/tech/AGENTS/README/locales
npm run lint                    # ESLint, 0 errors
npm run check:lint-budget       # per-file warning ratchet (lower baselines with -- --update)
npm test                        # Vitest
npm run build                   # tsc -b && vite build
npm run quality-gates           # hygiene + architecture:diff + budget + duplicates + lint + lint-budget + test
cd server && npm run build && npm test   # when server/ changed (tests run against dist/)
```

Hooks: pre-commit = `lint-staged` + `check:hygiene` + `check:architecture:diff`; pre-push = `check:budget` + `check:duplicates` + `check:lint-budget` + `npm test`.

## 9. Keeping the knowledge bundle correct (OKF v0.2)

Before editing `docs/`, read [`docs/workflows/knowledge-base-maintenance.md`](docs/workflows/knowledge-base-maintenance.md) (front matter, links, lifecycle). Non-negotiables:

- Code wins over docs. Name only files and symbols confirmed with `grep`; mark guesses `**Unverified:**`.
- One topic, one home — link, don't copy.
- Architecture, data model, storage key, sync message, server route or game changes → update the owning doc in the same PR.
- Every change to `docs/` → entry at the top of [`docs/log.md`](docs/log.md). Unresolvable contradiction → [`docs/open-questions.md`](docs/open-questions.md).
- Docs in **English**.

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
