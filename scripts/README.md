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

## 3. Autonomous CI/CD Pipeline & Jules Integration

### `jules-plan-generator.mjs`
Introspects the local codebase, verifies line budgets and state hooks, and generates untruncated RepoLens RFC research plans for GitHub Issues.
- **Execution**:
  ```bash
  node scripts/jules-plan-generator.mjs --issue <number>
  node scripts/jules-plan-generator.mjs --dry-run
  ```

### `jules-lens-resolver.mjs`
Resolves RepoLens audit lenses (e.g. `capacitor-storage`, `agents-budget`, `i18n-sync`) to focus Jules implementation plans.

### `scaffold-game.mjs`
Boilerplate generator for scaffolding new game modules adhering to strict architecture boundaries.
