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
Enforces game boundary isolation, zero cross-game imports, and prohibits raw `localStorage` or blocking `window.confirm`.
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

---

## 3. CI/CD Tooling (Jules scripts: `scripts/pipeline/jules-start.cjs`, `jules-watch.cjs`)

### `scaffold-game.mjs`
Boilerplate generator for scaffolding new game modules adhering to strict architecture boundaries.
