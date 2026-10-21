## [Unreleased]

### Added

- **WebRTC**: STUN servers can be chosen per device in the connection and server settings, next to the tracker list: toggle built-in servers (Google stays off by default), add or remove custom `stun:`/`stuns:` URLs, with a warning when all are off. Tracker and STUN lists share one `ServerUrlList` component (#422).
- **Testing & Edge-Case Audit**: Added comprehensive unit tests for Kniffel scoring (`kniffelScoring.ts`) and game reducer (`kniffelReducer.ts`), Darts game rules, countdown modes, double-out evaluation, and bust logic (`useDartsGame.ts`), and Imposter database repository & seeder (`imposterRepository.ts`, `dbSeeder.ts`) (Fixes #386).
- **Sync & Resilience Tests**: Extended `MqttMailboxService` and `MultiChannelSyncCoordinator` test suites with coverage for listener error isolation, LZString payload compression, and dynamic channel re-subscription edge cases (Fixes #386).

### Changed

- **Melodiq Notes**: the soundfont provider select and custom URL field are one component (`SoundfontProviderFields.tsx`) used by the in-game sound settings and the settings page; the settings page looks the same (#426).
- **Melodiq Notes**: the mixer, song-select and sound-settings dialogs share `NotesDialogFrame.tsx` (frame, title, close button) instead of three copies (#426).
- **GuessArt / Storyteller**: which lobby players are local to the creating device is decided by `localPlayerIdsForDevice` in `src/modules/player-management/playerLogic.ts` (tested) instead of two copies (#426).
- **Sudoku / Wordle**: the result dialogs share via `useShareOrCopy` (`src/modules/sharing`) instead of two copies of the share-or-clipboard code; the "copied" timer is now cleared on unmount (#426).
- **Melodiq**: local and phone latency calibration share one panel (`LatencyCalibratorPanel.tsx`) and one beep detector (`components/hooks/detectBeep.ts`); the phone calibrator's labels are now translated (#426).
- **Knister / Qwixx**: both dice rollers use the shared `src/components/games/useDiceRollAnimation.ts` instead of two copies of the roll timer (#426).
- **Melodiq**: `useSessionPlayers` is split into pure roster rules (`gameplay/logic/sessionRoster.ts`, tested) and focused hooks (`useSessionOverrideSync`, `usePeerRosterSync`, `usePeerSessionMessages`, `useBroadcastSongInfo`). Phone messages are now received via `manager.on('message')` instead of overwriting `manager.onMessage`, so other listeners are no longer replaced; storage is read via `storage.getJson` and the hooks are typed without `any` (#418).
- **Tabletop**: holder layout (hand, stack, fan, grid) moved from `tabletopReducer.ts` into `src/games/tabletop/logic/holderLayout.ts` with named constants and characterisation tests; the hand re-layout write-back exists once instead of four times (#414).
- **Melodiq server**: the song download job is split into steps; yt-dlp lookup/install/spawn lives in `services/ytdlp.ts` (one install path instead of two copies, shared with `routes/usdb.ts`) and UltraStar `.txt` header handling in `services/ultrastarTxt.ts`, with tests (#413).
- **Performance**: `Hub`, `Settings` and `PartyLobby` are lazy-loaded routes (own chunks). Melodiq TV mode clears its popup-window poll on disconnect and unmount instead of only when the window closes; the host queue's BroadcastChannel is documented as page-lifetime (#427, salvaged from the closed #402 without its Sudoku/sync regressions).
- **Tabletop**: one rule decides whether a holder is a player's hand (`src/games/tabletop/logic/handHolder.ts`), replacing seven diverging copies in the reducer, hand layout, seat logic, hand dock and board filter. An explicit `isHand` flag wins; games without it are classified once on load. Seat-owned public areas ("player area", "Spielerbereich", bare `ownerSeat`) stay off the shared table but are no longer treated as hands, and ids that merely contain "hand" (e.g. `handout_pile`) are no longer hands (#410).
- **WebRTC (Melodiq)**: STUN servers are now resolved per device from `src/lib/webrtc/iceServers.ts` instead of four hardcoded lists. Defaults are Cloudflare and Twilio; Google's STUN server stays selectable but is disabled by default. Custom STUN URLs and per-server toggles are stored in `galaxy_stun_custom_urls` / `galaxy_stun_preferences`.
- Fixed missing i18n keys for guessart, tabletop and party translations.
- Refactored any to unknown in melodiqFetch.

### Refactored

- **GuessArt**: the rules of `LocalGameEngine.submitGuess` (phase guard, guess evaluation incl. exact-only from hint level 2, round completion, advancing to the next round, the empty next round) are pure functions in `src/games/guessart/logic/transitions.ts` with tests; the engine method only loads and persists (#416, slice 1).
- **Quality gates**: `check:budget` now also fails when a baseline is higher than the file, a graduated file is still listed, or a listed file was deleted; `npm run check:budget -- --update` lowers/removes such entries. `check:architecture` warns at the same 250-line limit instead of 300 (#425, resolves Q9).
- **Party lobby**: player name (`logic/playerName.ts`, key now registered as `STORAGE_KEYS.PARTY_PLAYER_NAME`), routes and share link (`logic/partyRoutes.ts`, with tests) and the lobby state (`hooks/usePartyLobbyController.ts`) moved out of `PartyLobby.tsx` (615 → 539 lines). Joining/creating the room no longer runs inside a `useState` initializer, and the auto-navigation into a running game uses the updated roster for the tabletop seat instead of the previous render's (#417).
- **Party lobby**: roster rules (host resolution, roster/score merge, presence join, host and player upsert) moved from `UniversalPartyManager` into pure functions in `src/features/party/logic/partyRoster.ts` with tests; host resolution exists once instead of in two branches (#415).
- **WebRTC (Melodiq)**: the `identify` handling (name/hue/deviceId, replacing an earlier peer of the same device, `onPeerUpdated`) existed twice in `WebRTCHostManager` — once per signaling path. It is now one `applyIdentity()` with the pure `findStalePeersByDevice()` in `src/lib/webrtc/peerRegistry.ts` (with tests) (#412).
- **Dead code**: removed `src/games/melodiq/MelodiqSettings.tsx` and `components/SettingsFeedbackForm.tsx` (no importer; the settings route uses `MelodiqSettingsCategory`) (#423).
- **Werewolf tests**: the scripts `logic/tests/verify_*.ts` never ran; their Easter Bunny, Hunter and Guardian scenarios are now Vitest tests in `logic/roleScenarios.test.ts` (#424).
- **WebRTC (Melodiq)**: tracker info hash, peer id, NDJSON decoding and the tracker URL filter are shared by host and client via `src/lib/webrtc/trackerProtocol.ts` (with tests) instead of four hand-written copies. A malformed line in a data-channel chunk no longer drops the rest of that chunk on the host; the client now also de-duplicates tracker URLs (#411).
- **Quality gates**: New per-file ESLint warning ratchet `npm run check:lint-budget` (baseline `scripts/lint-warning-baselines.json`, 516 warnings in 157 files). `lint-staged` no longer rejects files with pre-existing warnings; warnings can only decrease (#421).
- **CI**: Removed the Google Jules integration (`/jules` issue command, daily Jules audit workflow, `scripts/pipeline/jules-*.cjs`, `.github/agents/`, `.github/lenses/`, `.pipeline-memory/`). The `JULES_API_KEY*` repository secrets are no longer used.
- **CI**: Removed the Google AI agent factory (`scripts/agent-factory/`) and the optional Gemini Flash waiver in the doc-sync gate (`GEMINI_API_KEY` no longer used).
- **Architecture & Code Quality Audit**: Ratcheted down component budget baselines in `scripts/legacy-component-baselines.json`, removing deleted (`ServerAdminPanel`) and graduated (`SetupDockerTab`) components while tightening limits on shrunk components.
- **Duplication & DRY**: Extracted `FeedbackForm` into `src/components/feedback/FeedbackForm.tsx` and refactored `FeedbackDialog` and `SettingsFeedbackForm` to reuse it, eliminating duplicate feedback form UI code (Fixes #403).
- **Code Quality**: Deduplicated multiple areas of the codebase to adhere to DRY principles, including extracting a shared `shuffle` utility, optimizing component logic in `Qwixx` and `Melodiq`, and extracting the `removeFromHolderAndUpdateHand` function in `TabletopReducer`.
- **Dead Code**: Eliminated unused local storage references and docstrings in `wordle` and `melodiq`.

### Fixed

- **Companion server**: environment overrides (`SECURITY_TOKEN`/`TOKEN`, `PORT`, `MUSIC_DIR`, `DIRECTORIES`, `TABLETOP_DIR`, auto-discovered `/app/music`) were written into `config.json` whenever a setting changed, so removing the env var left the old token, port and directories active. They now apply at runtime only; identical leftovers are removed from `config.json` at start (#409).
- **Darts**: Hardened `useDartsGame` persistence against corrupted JSON storage values by using `storage.getJson` with safe structure validation and fallbacks to prevent UI crashes on mount (Fixes #386).
- **Release**: `release.yml` called `npm run package` in `server/`, which no longer existed, so server binaries and the release publish step failed. `server/` now bundles with esbuild and packages Node 24 binaries for Linux, Windows and macOS with `@yao-pkg/pkg`; the release archives also ship `scripts/align_lyrics.py`.
- **Melodiq TV**: Fixed an issue where clicking the Cast button would open a new window instead of initiating a stream to the TV because of dynamic query string mismatches.

### Security

- **Companion server**: all tabletop routes (`/api/tabletop/*`, `/tabletop/media`) now require a valid token; changing tabletop directories needs the master token or a management API key. Previously `/tabletop/media` accepted requests without a token and the directory routes were open, which allowed reading arbitrary files.
- **Companion server**: media URLs returned by `/api/songs` and `/api/tabletop/games/:id/raw` carry the caller's own token instead of the master token, so restricted API keys can no longer obtain the master token.
- Applied security audit fixes (Security & Vulnerability Auditor).
- Hardened `DOMPurify.sanitize` usage in `RulesDialog` with strict allowlists for tags and attributes.
- Hardened server routes in `relayPlugin` with explicit length constraints and type checking for POST requests.
- Pinned all dependency versions in `package.json` and `server/package.json` to fixed versions (removed caret `^` and tilde `~` modifiers) to ensure reproducible builds.
- Updated vulnerable dependencies via `npm audit fix --force`.

### Changed

- **Melodiq**: Opening the settings inside the game no longer unmounts the background views, enabling seamless background execution.
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

### Changed

- Deduplicated queue participant logic in Melodiq game and removed `any` types from song downloader.
- Resolved 23 i18n translation parity gaps across tabletop, guessart, and party modules.

## [Unreleased]

### Added

- **Testing Suite**: Added comprehensive test coverage for MQTT mailbox network sync, addressing edge-cases (JSON parsing, LZString decompression), error paths (broker failover handling), and race conditions in cross-channel synchronization (Fixes #350).

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

## [Unreleased]

### Refactored

- Deduplicated `guessart` and `storyteller` core primitives by extracting pure IndexedDB operations into `src/modules/async-game`, round-robin player assignment logic into `src/lib/utils/turnAssignment.ts`, and sharing dialogs logic via `useSessionSharing` into `src/modules/sharing`.
