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

Boilerplate generator for scaffolding new game modules adhering to strict architecture boundaries.
