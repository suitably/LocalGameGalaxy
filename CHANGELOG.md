
## [Unreleased]
### Security
- Applied security audit fixes (Security & Vulnerability Auditor).
- Hardened `DOMPurify.sanitize` usage in `RulesDialog` with strict allowlists for tags and attributes.
- Hardened server routes in `relayPlugin` with explicit length constraints and type checking for POST requests.
- Pinned all dependency versions in `package.json` and `server/package.json` to fixed versions (removed caret `^` and tilde `~` modifiers) to ensure reproducible builds.
- Updated vulnerable dependencies via `npm audit fix --force`.

### Changed
- **Melodiq**: Das Halten eines Songs öffnet nicht mehr die Einstellungen/Warteschlange.
- **Melodiq Notes**: Streamlined UI for mobile-first responsiveness. Integrated song title and settings directly into `GlobalHeader`, removed in-sheet overlay controls, compacted page HUD into a single note and score bar, and made playback controls icon-only on mobile.
- Melodiq: Limited the maximum score per track to 1000 points.
- Actions pinned to commit SHAs (Dependabot keeps them current), `persist-credentials: false`, actionlint + unit tests (`npm run test:scripts`) for Jules scripts in CI precheck; watcher isolates per-issue failures and no longer re-posts PR links.

### Added
- Declarative Jules Agents Registry: added `.github/agents/` with scheduled orchestrator workflow (`jules-audit.yml`) and runner (`jules-agent-runner.cjs`) allowing scheduled autonomous audits (e.g. security) that automatically create tracking issues and PRs.
- `npm run check:hygiene` deterministic prechecks (stray artifacts, conflict markers, JSON validity, i18n parity ratchet, secret patterns, workflow permissions) as first CI job; `ci.yml` now has `permissions`, `concurrency`, fork-safe deploy; removed tracked `.orig`/`.diff` leftovers.

### Changed
- Melodiq: Limited the maximum score per track to 1000 points.
- Jules pipeline reduced to minimal `/jules` trigger (`jules-start.yml`) plus cron watcher (`jules-watch.yml`); removed lens, reviewer, auto-fixer and suggestions workflows.
- Jules key rotation via `JULES_API_KEY_*` secrets; watcher only polls issues labeled `jules:active`.

### Changed
- Melodiq: Limited the maximum score per track to 1000 points.
- Decoupled Cloudflare preview deployments from CI tests to speed up review previews.



## [Unreleased]
### Fixed
- **GuessArt**: Fixed a "Cannot read properties of undefined (reading 'ReactCurrentOwner')" error during drawing turns by updating `@excalidraw/excalidraw` to version `0.18.1` for React 19 compatibility.

### Added
- Pre-commit hooks for running quality gates automatically before committing locally.


### Added
- **Kniffel**: Added the classic dice game Kniffel to the local game galaxy. Players can roll 5 dice up to 3 times, score in 13 categories across upper and lower sections, and compete for the highest score. Implements full offline persistence and German/English localization.

# Changelog

All notable changes to **LocalGameGalaxy** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- **Melodiq**: Phone client correctly utilizes WebRTC passthrough to access the Host's song library directly instead of failing due to a missing local helper configuration (Fixes #248).
- Core: Migrated direct `localStorage` and `sessionStorage` calls in Melodiq to the unified `storage.ts` service with typed constants (`STORAGE_KEYS`), enforcing the zero raw storage policy and resolving Dependency Inversion Principle (DIP) violations.

### Fixed
- **Melodiq**: Fixed an issue where the YouTube background video would go permanently out of sync (delayed) by correcting the soft drift tolerance threshold and seek cooldown rate limits.

### Added
- Dart Checker game for tracking scores in 301, 501, and Count Up modes.
- **Documentation**: Added `docs/tech/pipeline-quality-gates.md` documenting our deterministic tools strategy (eslint, tsc, component budget, jscpd, and architecture checks). Also updated `docs/tech/architecture.md`.
- **CI/CD**: Added a fully functional `.gitlab-ci.yml` pipeline with security gates (SAST, Secret-Detection, npm audit), and integrated `npm run check:security` into the GitHub Actions CI pipeline.
- **Documentation (OKF v0.2)**: Converted technical documentation into an Open Knowledge Format (OKF) v0.2 Knowledge Bundle with root `index.md`, `log.md`, and typed frontmatter. Brought `docs/tech/architecture.md` and related tech docs up to date with the current codebase (all 13 games, shared modules, Hono micro-kernel, Cloudflare Quick Tunnel, and segregated layout contexts).
- **Melodiq**: Fixed an issue where the "Back" button was broken when exiting the settings view during a game by properly memoizing the exit callback to prevent unstable reference loops with the GlobalHeader state.
- **Settings**: Extracted GitHub issue submission logic and Server proxy feedback logic from `FeedbackDialog` and `SettingsFeedbackForm` components into a single `submitFeedback` function within `src/lib/github.ts` to fix a Separation of Concerns violation.
- Fixed GuessArt game redirect URLs (#126)
- Fixed Excalidraw library loading from local storage (#126)
- **All Games**: Created a standardized `GameLayout` component to ensure scrollbars are rendered at the window's edge. Implemented in Wordle, Sudoku, Qwixx, Melodiq Notes, Knister, and Cards (Fixes #199).
- Melodiq Notes: Fixed an issue where the user could not scroll vertically on the game screen by adding CSS properties `height: 100%`, `overflowY: auto`, and `WebkitOverflowScrolling: touch` to the main container component (Fixes #196).
### Fixed
- **Code Health**: Removed unused dummy cache functions (`getCachedFiles`, `setCachedFiles`, `clearFileCache`) from Melodiq's database and media loaders.

- Scanner: Replaced blocking synchronous file IO (`fs.readFileSync`, `fs.existsSync`, `fs.readdirSync`) with asynchronous equivalents in `parseSongFile` for vastly improved event loop performance.
- Melodiq: Fixed an issue where the PitchVisualizer animation loop would occasionally access stale `currentPitchRef` and `sungSegmentsRef` values by switching `useEffect` to `useLayoutEffect`.
- Tabletop: Fixed an HTML injection vulnerability in tabletop game rules dialog using DOMPurify.
- Melodiq Notes: Fixed an issue where the user could not scroll vertically on the game screen by adding CSS properties `height: 100%`, `overflowY: auto`, and `WebkitOverflowScrolling: touch` to the main container component (Fixes #196).
- GuessArt: Fixed an issue where the prefilled hint letters would persist in the input bar even after transitioning to hint stage 2, causing them to be duplicated and not correctly matched against the newly revealed hint letter pool (Fixes #140).

### Fixed
- **Code Health**: Fixed eslint-disable exhaustive-deps in MelodiqSettings.

### Added
- **Cloudflare Preview Cleanup Pipeline**: Automated deletion of preview branches & deployments on Cloudflare upon PR merge or closure (`.github/workflows/cleanup-preview.yml`) and manual `workflow_dispatch` trigger to purge all historical preview deployments.
- **Melodiq Notes UX & Multi-Stem Audio Player**: Responsive mobile sheet music layout, collapsible settings accordion, fixed bottom action bar, and synchronized multi-stem Web Audio playback (#132, PR #189).

- **AI Issue Curator & Deduplication Pipeline**: Automated issue clustering, duplicate detection, and 1-click issue bundling via `/curate`, `/bundle`, and `/duplicate` slash commands and GitHub labels (`curate`, `bundle`, `duplicate`, `plan`, `approved`).
- **Google Jules & Gemini 3.8 Multi-Key Pool**: Cloud-native execution with multi-account rotation across 5 Google AI Pro accounts (`JULES_API_KEY_1..5`).
- **RepoLens Lens Integration**: Specialized audit lenses for code duplication, architecture, i18n, and UX directly integrated into Jules tasks (`scripts/jules-lens-resolver.mjs`).
- **Melodiq Notes (Instrument Practice)**: Complete sheet music viewer with OSMD, MusicXML parsing, Web Audio multi-stem player, and MIDI note verification (`src/games/melodiq-notes/`).
- **Generalized Cards Suite**: Universal score and lives tracker (`UniversalScoreView.tsx`, `ModernScoreAdjuster.tsx`) in `src/games/cards/`.

### Changed
- Melodiq: Limited the maximum score per track to 1000 points.
- Refactored CI quality gates to enforce zero-duplication (`jscpd` < 2.5%), anti-god-component budget (< 250 lines), and doc synchronization.

### Fixed
- **Jules Plan Generator**: Jules implementation plan generation has been upgraded to the RepoLens RFC Research Plan standard (as seen in RepoLens #389), featuring real code snippets, git history context, line-level citations, alternatives analysis, and concrete Vitest test plans.
- **Self-Improving Pipeline Memory**: Added `.pipeline-memory/` persistence allowing the plan generator to learn domain aliases, subsystem component topologies, and resolution patterns dynamically across runs.
- **Generic Codebase Introspector**: Upgraded scanner to dynamically discover all games and modules, matching AST symbols, state hooks, and exact line citations to guarantee zero generic placeholders.

### Removed
- **Repository Bloat & Heap Snapshots**: Purged 55+ MB of legacy memory dumps (`baseline.heapsnapshot`, `target.heapsnapshot`), debug logs (`diff.txt`, `lint_output.txt`), and scratch test files from repository root.
- **Obsolete Python Scripts**: Deleted 10 legacy migration scripts (`scripts/fix_*.py`, `scripts/patch_*.py`, `scripts/update_i18n*.py`).
- **Legacy Pipeline Fallbacks**: Decoupled Jules agent execution keys from Gemini API callers, eliminating redundant 403 authorization failures on Google Cloud.

---

## [1.1.0] - 2026-09-02
### Added
- Multi-game party suite with WebRTC local peer discovery and MQTT relay fallback.
- Support for Werewolf, Gartic Phone, Storyteller, Tabletop, Sudoku, Knister, Qwixx, and Wordle.

## [Unreleased]
- Core: Migrated direct `localStorage` and `sessionStorage` calls in Melodiq to the unified `storage.ts` service with typed constants (`STORAGE_KEYS`), enforcing the zero raw storage policy and resolving Dependency Inversion Principle (DIP) violations.

### Refactored
- `ServerAdminPanel`: Decomposed into smaller sub-components and extracted state into `useServerApiKeys` custom hook to resolve Separation of Concerns and God Component size violations.
