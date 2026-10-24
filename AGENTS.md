# AGENTS.md — operating rules for agents in LocalGameGalaxy

You are working in `suitably/LocalGameGalaxy` (product name **Nexumia**): an offline-first React 19 / Vite PWA with 15 local party games, an optional Hono companion server (`server/`) and a signaling tracker (`signaling/`). Other agents (Copilot, Claude Code) read this file too — `.github/copilot-instructions.md` and `CLAUDE.md` point here.

The knowledge base is [`docs/`](docs/index.md) (Open Knowledge Format v0.2). Start there.

## 1. Before you act

1. For changes, find your area in [`docs/index.md`](docs/index.md) and read **only** that doc. For a game, grep its row in [`docs/tech/game-catalog.md`](docs/tech/game-catalog.md) (`grep -n -i "<game>" docs/tech/game-catalog.md` returns its line from every table) instead of reading the whole file. Pure questions and trivial fixes need no doc reading.
2. Before changing behaviour, grep [`docs/open-questions.md`](docs/open-questions.md) for your topic — it may have a known contradiction or a pending maintainer decision. Do not silently "fix" an item marked _(user)_.
3. **Verify, don't trust.** Every doc carries `verified.at`. Code wins over docs; if they disagree, fix the doc in the same change or add an open question. Quick checks are in §10.
4. Read the target file and its neighbouring tests before editing. Check open PRs for overlapping work (`gh pr list`).

## 2. Environment and workflow

- Node **24** (`.nvmrc`, `engines`). Three npm packages with their own lockfiles: root, `server/`, `signaling/` — run `npm ci` in the one you touch.
- GitHub is primary; `main` is protected (PR required; required checks "Deterministic Prechecks (no install)" and "CI Quality Gate (Aggregator)"). GitLab (`gitlab` remote) is a mirror running the same `npm run ci:gates`.
- Branches `feature/…`, `bugfix/…`, `docs/…`, `refactor/…`, `chore/…`; commits in Conventional Commits ([CONTRIBUTING.md](CONTRIBUTING.md)). The PR title prefix matters: `chore|refactor|style|test|docs|perf:` bypasses the doc-sync gate.
- Husky runs gates on commit and push. Do not bypass them with `--no-verify`.
- Do not edit generated or local-only paths: `dist/`, `dev-dist/`, `server/dist/`, `node_modules/`, `android/app/build/`, `android/local.properties`, `server/music/`.
- **Secrets — do not read, print or commit:** any `config.json` (server token, USDB password, GitHub token), `.env*`, keystores (`*.jks`, `*.keystore`, `*.p12`), `android/app/release.jks`. Use `server/config.example.json` for examples. For Claude Code these reads (plus generated folders) are blocked in `.claude/settings.json`.

## 3. Scope control and incremental delivery

- **Bite-sized slices.** Do not implement several layers at once (storage + sync + logic + multi-screen UI). Order: (1) domain logic and types — pure functions + tests in `logic/`; (2) state and integration — `use<Feature>State.ts` hooks; (3) UI — components under 250 lines.
- **Reuse audit first.** Search `src/modules/`, `src/components/`, `src/lib/`, `src/hooks/` (catalog in §5). Extend what exists; never build a second implementation of the same concept (player rosters, sync, dice, dialogs, latency calibration, song download).
- **Verification gate.** Run §8 after code changes, not during research or planning.

## 4. Code rules

The full rule set with what enforces each rule lives in [`docs/tech/coding-conventions.md`](docs/tech/coding-conventions.md). The essentials:

- **No cross-game imports** (`src/games/<A>` → `src/games/<B>`). Shared code goes to `src/modules/`, `src/components/` or `src/lib/`. _(check:architecture fails)_
- **Storage only via `src/lib/storage.ts`** (`storage`, `sessionStorageSafe`) with keys registered in `STORAGE_KEYS` / `STORAGE_PREFIXES`. Never `localStorage.` / `sessionStorage.` directly. _(check:architecture fails on raw access; unregistered keys are a known gap — Q8)_
- **No native dialogs** (`confirm`, `prompt`, `alert`). Use [`ConfirmDialog`](src/components/common/ConfirmDialog.tsx) or MUI `<Dialog>`. _(ESLint + check:architecture fail)_
- **Component budget:** new `.tsx` files ≤ 250 lines (aim < 160 for orchestrators); files in `scripts/legacy-component-baselines.json` must never grow; when one shrinks, lock it in with `npm run check:budget -- --update` (fails otherwise). Decompose into a `use<Feature>State.ts` hook, focused sub-components and a co-located `types.ts`. _(check:budget fails)_
- **Pure game logic** in `logic/*.ts` with Vitest tests; components hold no game rules.
- **Discriminated unions** instead of contradictory boolean flags.
- **No `any`** in new or changed code — use generics, interfaces or `unknown` with guards. _(ESLint warning; `check:lint-budget` fails if a file gains warnings)_
- **No inline `BroadcastChannel`** in games — use `useMultiChannelSync()`. _(review only; Melodiq still violates it: Q4)_
- **No hardcoded UI strings** (§6).
- **Header:** integrate with `GlobalHeader` via `TitleContext` / `HeaderLayoutContext` (`usePageTitle`, `useHeaderLayout`); `LayoutContext` is the backward-compatible composite. No second top bar, no floating hub-exit buttons.
- **CSS:** theme tokens (no hard-coded hex or non-black `rgb()`/`rgba()` in `.tsx`; per-file count ratchet in `scripts/hardcoded-color-baselines.json`, _check:architecture fails when a count rises_), Grid/Flexbox, `100dvh`. Visual system (colors, type, spacing, components): [`DESIGN.md`](DESIGN.md).
- **Never commit media** under `server/music/` (songs, stems). _(check:architecture fails)_
- **No copy-paste** blocks; `jscpd` fails above 2.5 % duplication (clones from 12 lines). _(check:duplicates)_

## 5. Reuse catalog

Before building anything shared (player rosters, sync, dice, dialogs, header actions, storage, push, WebRTC, wake lock), check the tables in [`docs/tech/architecture.md` §3.2](docs/tech/architecture.md#32-shared-modules-srcmodules). Extend what is listed there; never build a second implementation.

## 6. i18n

- All user-facing text via `t('key')`, always in **both** `de` and `en`.
- Put a string where its game already keeps its strings: `public/locales/{de,en}/translation.json`, or the game's own bundle `src/games/<id>/i18n/index.ts` (cards, kniffel, knister, melodiq, qwixx, sudoku, wordle). Hub title/description keys always go to `public/locales`. Details: [`docs/tech/i18n-strategy.md`](docs/tech/i18n-strategy.md).

## 7. Capacitor (Android) UI

Safe areas, touch CSS and theme rules: [`docs/tech/styling.md`](docs/tech/styling.md). Back button: `App.addListener('backButton', …)` — close modals / navigate before exiting. After web changes that must reach the app: `npm run build && npx cap sync android`.

## 8. Verification

Run **after code changes**, before you call a task done. Do not run gates during research or planning.

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

Before editing `docs/`, read [`docs/workflows/knowledge-base-maintenance.md`](docs/workflows/knowledge-base-maintenance.md) (front matter, links, lifecycle). The non-negotiables:

- Code wins over docs. Name only files and symbols you confirmed with `grep`; mark guesses `**Unverified:**`.
- One topic, one home — link, don't copy.
- Architecture, data model, storage key, sync message, server route or game changes → update the owning doc in the same PR.
- Every change to `docs/` → entry at the top of [`docs/log.md`](docs/log.md). Unresolvable contradiction → [`docs/open-questions.md`](docs/open-questions.md).
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
