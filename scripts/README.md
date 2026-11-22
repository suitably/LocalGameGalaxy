# Utility & Development Scripts [ID: SCRIPTS-INDEX]

This directory contains utility scripts, development aids, and background processes for the LocalGameGalaxy project.

---

## 1. Process Runners

### `start-tracker.js`

Starts a local BitTorrent-based WebRTC signaling tracker on port 8000. Used for offline/local-network peer-to-peer discovery between mobile clients and the TV host.

- **Execution**:
  ```bash
  node scripts/start-tracker.js
  ```

---

## 2. Quality Gates & Architecture Audits

### `check-architecture.mjs`

Enforces game boundary isolation, zero cross-game imports, and prohibits raw `localStorage` or blocking `window.confirm`, and ratchets hard-coded colours in `src/**/*.tsx` per file via `hardcoded-color-baselines.json` (`--update-colors` lowers it).

- **Execution**:
  ```bash
  npm run check:architecture:diff
  ```

### `check-component-budget.js`

Enforces maximum 250 lines per component and ratchets legacy component baselines via `legacy-component-baselines.json`.

- **Execution**:
  ```bash
  npm run check:budget
  ```

### `check-docs-sync.mjs`

Validates that architectural changes are synced with documentation and i18n files.

- **Execution**:
  ```bash
  npm run check:docs
  ```

### `tts-compat/`

Dev-only Tabletop Simulator compatibility harness (#682): tier per Workshop mod, converted/degraded/dropped objects, Lua API calls. Details: [tts-compat/README.md](tts-compat/README.md).

- **Execution**:
  ```bash
  node scripts/tts-compat/run.mjs --fixture
  ```

---

### `changelog.mjs`

Changelog and docs-log fragments (#593): `check`, `next-version`, `collect`, `collect-log`, `bump`, `release`, `notes`, `verify`. Pure logic in `lib/changelog.mjs` (tests: `lib/changelog.test.mjs`). Formats: [changelog.d/README.md](../changelog.d/README.md), [knowledge-base-maintenance.md §3](../docs/workflows/knowledge-base-maintenance.md#3-lifecycle).

- **Execution**:
  ```bash
  npm run check:changelog
  npm run changelog -- next-version --bump auto
  ```

### `check-audit.mjs`

Production dependency audit (root, `server/`, `signaling/`): fails on high/critical advisories not accepted in `audit-allowlist.json` (reason + expiry). Blocking in `release.yml`, advisory in `ci.yml`. See [ci-cd-pipelines.md](../docs/workflows/ci-cd-pipelines.md#supply-chain-provenance-sbom-dependency-audit).

- **Execution**:
  ```bash
  npm run check:security
  ```

---

### `token-usage.mjs`

Sums tokens and estimated list-price cost of a Claude Code session from its local transcript, split into main session and subagents. See [multi-agent workflow §7](../docs/workflows/multi-agent-token-strategy.md#7-measuring).

- **Execution**:
  ```bash
  npm run tokens              # newest session of this project
  npm run tokens -- --list    # all sessions
  npm run tokens -- <id> --json
  ```

---

## 3. CI/CD Tooling (`scripts/pipeline/preview-comment.cjs` posts the Cloudflare preview comment)

### `scaffold-game.mjs`

Generator for a new game in the layout the existing games use, with its catalogue entry (ADR-0011).

```bash
node scripts/scaffold-game.mjs --id=battle-ship --title="Schiffe versenken" --title-en="Battleship" \
  [--description=… --description-en=…] [--area=party] [--modes=solo,pass_and_play] [--icon=Sailing] [--dry-run]
```

- Creates `src/games/<id>/`: `index.ts` (named export), `<Pascal>Game.tsx` (`usePageTitle` + `t()`), `hooks/use<Pascal>State.ts` (persisted through `storage` and a registered `STORAGE_KEYS` entry), `logic/types.ts`, `logic/<camel>Engine.ts`, `logic/<camel>Engine.test.ts` and `definition.tsx` (catalogue entry).
- Patches by text insertion: `src/lib/storage.ts` (`<ID>_GAME_STATE`), `src/lib/catalog/entries.ts` (import and `ROUTE_GAMES` line) and `public/locales/{de,en}/translation.json` (`games.<id_with_underscores>.*`).
- `--icon` is a MUI icon base name (`@mui/icons-material/<Name>Rounded`); `--area` is an `AreaId`, `--modes` a comma list of catalogue `Mode`s (`party_room` is refused: it needs a `PartyGameType` and a room route, added by hand); `--dry-run` lists the files without writing. It aborts if an anchor in a patched file has moved.
- Afterwards: replace the placeholder logic and UI, fix the `TODO` description, add the id to the hub list in `src/lib/catalog/catalog.test.ts`, add the game to [game-catalog](../docs/tech/game-catalog.md) and add a `changelog.d` fragment.
