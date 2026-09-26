# Changelog

All notable changes to **LocalGameGalaxy** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Melodiq Notes: Fixed an issue where the user could not scroll vertically on the game screen by adding CSS properties `height: 100%`, `overflowY: auto`, and `WebkitOverflowScrolling: touch` to the main container component (Fixes #196).
- GuessArt: Fixed an issue where the prefilled hint letters would persist in the input bar even after transitioning to hint stage 2, causing them to be duplicated and not correctly matched against the newly revealed hint letter pool (Fixes #140).

### Added
- **Melodiq Notes UX & Multi-Stem Audio Player**: Responsive mobile sheet music layout, collapsible settings accordion, fixed bottom action bar, and synchronized multi-stem Web Audio playback (#132, PR #189).
- **AI Issue Curator & Deduplication Pipeline**: Automated issue clustering, duplicate detection, and 1-click issue bundling via `/curate`, `/bundle`, and `/duplicate` slash commands and GitHub labels (`curate`, `bundle`, `duplicate`, `plan`, `approved`).
- **Google Jules & Gemini 3.8 Multi-Key Pool**: Cloud-native execution with multi-account rotation across 5 Google AI Pro accounts (`JULES_API_KEY_1..5`).
- **RepoLens Lens Integration**: Specialized audit lenses for code duplication, architecture, i18n, and UX directly integrated into Jules tasks (`scripts/jules-lens-resolver.mjs`).
- **Melodiq Notes (Instrument Practice)**: Complete sheet music viewer with OSMD, MusicXML parsing, Web Audio multi-stem player, and MIDI note verification (`src/games/melodiq-notes/`).
- **Generalized Cards Suite**: Universal score and lives tracker (`UniversalScoreView.tsx`, `ModernScoreAdjuster.tsx`) in `src/games/cards/`.

### Changed
- Refactored CI quality gates to enforce zero-duplication (`jscpd` < 2.5%), anti-god-component budget (< 250 lines), and doc synchronization.

### Fixed
- **Issue Curator & Jules Plan Generator**: Bundled sub-issues are now closed with `state_reason: "completed"` instead of `not_planned`. Jules implementation plan generation has been upgraded to the RepoLens RFC Research Plan standard (as seen in RepoLens #389), featuring real code snippets, git history context, line-level citations, alternatives analysis, and concrete Vitest test plans.
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
