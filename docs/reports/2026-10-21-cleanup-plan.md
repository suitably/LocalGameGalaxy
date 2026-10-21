---
type: Report
title: 'Cleanup plan: duplication, god components, type debt'
description: 'Snapshot of jscpd, component budget, architecture and ESLint reports on 2026-10-21, turned into a prioritized sequence of small refactor PRs.'
tags: [refactoring, tech-debt, duplication, component-budget, quality-gates]
status: stable
generated:
  at: 2026-10-21T12:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-21
  method: 'Ran jscpd (json reporter, .jscpd.json), node scripts/check-architecture.mjs, npm run check:budget, eslint -f json on branch claude/confident-goldberg-c042l7 (base 2026-10-18); compared scripts/legacy-component-baselines.json with wc -l; grep for importers.'
sources:
  - '.jscpd.json'
  - 'scripts/legacy-component-baselines.json'
  - 'scripts/check-component-budget.js'
  - 'scripts/check-architecture.mjs'
  - 'eslint.config.js'
---

# Cleanup plan (2026-10-21)

## 1. Snapshot

| Signal                  | Value                                                                 | Gate status      |
| ----------------------- | --------------------------------------------------------------------- | ---------------- |
| jscpd duplication       | 39 clones, 649 lines, **0.79 %** (threshold 2.5 %)                    | passes           |
| Architecture boundaries | cross-game imports, raw storage, native dialogs, tracked media: **0** | passes           |
| Components > 250 lines  | 43 legacy-tracked (of 300 `.tsx`), 39 more at 200–250                 | passes (ratchet) |
| ESLint                  | 0 errors, **555 warnings**                                            | passes           |

Top ESLint warnings: `no-explicit-any` 265, `max-lines` 51, `react-refresh/only-export-components` 48, `react-hooks/set-state-in-effect` 48, `react-hooks/exhaustive-deps` 31, `no-unused-vars` 29, `no-empty` 13.

`any` hotspots: `src/lib/webrtc/WebRTCHostManager.ts` (39), `src/lib/webrtc/useWebRTCClient.ts` (24), Melodiq hooks `useMelodiqGlobalEvents.tsx`, `useQueue.ts`, `useTVMode.ts` (14 each), `PlaybackManager.tsx` (13).

**Reading:** the boundary gates hold and new duplication is low. The debt is concentrated in (a) ~40 god components, (b) untyped sync/WebRTC payloads, (c) effect-driven state (`set-state-in-effect`, `exhaustive-deps`) — the most likely source of logic bugs.

## 2. Ratchet bookkeeping is leaking (extends Q9)

`check-component-budget.js` only fails when a file grows past its baseline; it never lowers the baseline when a file shrinks. Files that shrank can silently grow back:

| File                                                 | Baseline | Actual          |
| ---------------------------------------------------- | -------- | --------------- |
| `src/games/melodiq/gameplay/LyricsDisplay.tsx`       | 508      | 370             |
| `src/components/connection/setup/SetupDockerTab.tsx` | 286      | 195 (graduated) |
| `src/games/melodiq/components/SongActionDialogs.tsx` | 490      | 414             |
| `src/games/melodiq/MelodiqGame.tsx`                  | 615      | 544             |
| `src/games/melodiq/hooks/useMelodiqGlobalEvents.tsx` | 317      | 272             |
| `src/games/qwixx/QwixxGame.tsx`                      | 286      | 277             |
| `src/components/connection/ServerAdminPanel.tsx`     | 618      | file missing    |

Smaller drifts (≤ 9 lines): `PartyLobby`, `GameSettingsPanel`, `PhoneClientEngine`, `PlaybackManager`, `WebRTCHostContext`, `SettingsContext`, `KniffelBoard`, `SettingsHeaderNav`, `KnisterGame`.

## 3. Duplication clusters

Ordered by value; line counts from jscpd.

| #   | Cluster                                                  | Files                                                                                                                                                                                                                                               | Fix                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Melodiq settings UI exists twice (34 + 17 lines)         | `src/features/settings/components/MelodiqSettingsCategory.tsx` ↔ `src/games/melodiq/MelodiqSettings.tsx`                                                                                                                                            | **Inference:** `MelodiqSettings.tsx` has no importer (grep). Confirm, then delete it together with `components/SettingsFeedbackForm.tsx` (only importer is `MelodiqSettings.tsx`, duplicates `src/components/feedback/FeedbackDialog.tsx`). |
| D2  | Card score views (20 + 17 + 16 + 16 + 13 lines)          | `src/games/cards/components/OhHellGameView.tsx`, `SchwimmenGameView.tsx`, `UniversalScoreView.tsx`                                                                                                                                                  | Extract shared score table / header sub-components inside `src/games/cards/components/`; shrinks two legacy files.                                                                                                                          |
| D3  | Latency calibrator, local vs remote (19 + 14 + 14 lines) | `src/games/melodiq/components/LatencyCalibrator.tsx` ↔ `RemoteLatencyCalibrator.tsx`                                                                                                                                                                | One presentational component + two data sources (hook).                                                                                                                                                                                     |
| D4  | Lobby hooks (16 + 16 lines)                              | `src/games/guessart/hooks/useGuessArtLobby.ts` ↔ `src/games/storyteller/hooks/useStorytellerLobby.ts`, `useGuessArtGame.ts`                                                                                                                         | Check against `src/modules/player-management` (`useLobbyPlayers`) first; move the shared part there, not into a game.                                                                                                                       |
| D5  | Dice rollers (15 lines)                                  | `src/games/knister/components/KnisterDiceRoller.tsx` ↔ `src/games/qwixx/components/QwixxDiceRoller.tsx`                                                                                                                                             | Shared roller in `src/components/games/` next to `Die3D.tsx`.                                                                                                                                                                               |
| D6  | Victory / stats modals (16 lines)                        | `src/games/sudoku/components/SudokuVictoryModal.tsx` ↔ `src/games/wordle/components/WordleStatsModal.tsx`                                                                                                                                           | Shared modal shell in `src/components/`.                                                                                                                                                                                                    |
| D7  | Intra-file copy-paste                                    | `useSearchFilters.tsx` (27), `useDockDragDrop.ts` (20), `tabletopReducer.ts` (19 + 14), `useQueue.ts` (18), `useMediaLoaders.ts` (16), `storage.ts` (17), `useWakeLock.ts` (13), `SettingsHeaderNav.tsx` (17), `PartySettingsDialogs.tsx` (13 + 13) | Extract a local helper per file; each is a small, self-contained PR.                                                                                                                                                                        |
| D8  | Melodiq-notes dialogs (18 + 13 + 20 lines)               | `EnsembleMixerDialog.tsx`, `SongSelectDialog.tsx`, `SoundSettingsDialog.tsx`, `SoundSettingsSection.tsx` ↔ `MelodiqNotesSettingsCategory.tsx`                                                                                                       | Shared dialog frame + reuse `SoundSettingsSection` in the settings category.                                                                                                                                                                |
| —   | Leave as is                                              | `imposter/logic/wordPairs_de.ts` ↔ `wordPairs_en.ts`, `werewolf/roles/DetectiveView.tsx` ↔ `WhiteWerewolfView.tsx`, `WebRTCHostManager.ts` ↔ `useWebRTCClient.ts`                                                                                   | Data or deliberately parallel host/client code; abstracting couples unrelated changes.                                                                                                                                                      |

Also: `src/games/werewolf/logic/tests/verify_*.ts` are not `*.test.ts` and are referenced nowhere — they never run. Convert to Vitest tests or delete.

## 4. God components — order of attack

Rule per file: (1) pin current behaviour with tests, (2) move rules to `logic/*.ts`, (3) state to `use<Feature>State.ts`, (4) split UI, (5) lower or remove the baseline entry. One file per PR, behaviour unchanged (`refactor:` prefix).

| Priority | File (lines)                                                                                                    | Why first                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `src/games/qwixx/components/QwixxRow.tsx` (522)                                                                 | A row component holding game rules; qwixx has `logic/` with 4 files to extend.                                                                                                  |
| 2        | `src/games/cards/components/SchwimmenGameView.tsx` (510), `OhHellGameView.tsx` (339)                            | Combine with D2.                                                                                                                                                                |
| 3        | `src/features/party/PartyLobby.tsx` (615)                                                                       | Largest file; only 1 test in `src/features/party`. Write tests first.                                                                                                           |
| 4        | `src/games/guessart/GuessArtGame.tsx` (481), `catalogue/WordEditorTab.tsx` (455), `CategoryEditorTab.tsx` (281) | Editor tabs share a 20-line clone.                                                                                                                                              |
| 5        | Melodiq: `MelodiqGame.tsx` (544), `GameSettingsPanel.tsx` (553), `PitchVisualizer.tsx` (569)                    | Do after Q4 (inline `BroadcastChannel` in `SettingsContext.tsx`, `useQueue.ts`, `useTVMode.ts`, `useTVReceiver.ts`, `gameplay/hooks/useSessionEnd.ts` → `useMultiChannelSync`). |
| 6        | `src/features/settings/components/SettingsHeaderNav.tsx` (490)                                                  | Contains a 17-line self-clone (D7).                                                                                                                                             |

## 5. Logic-break hunting

1. **Typed messages first.** Replace `any` in `WebRTCHostManager.ts` / `useWebRTCClient.ts` with a discriminated union of message types (owner doc: `docs/tech/sync-protocol.md`). Untyped payloads hide host/client mismatches.
2. **Effects.** Work through the 48 `set-state-in-effect` and 31 `exhaustive-deps` warnings per game; each is either derived state (compute during render) or a missing dependency (stale closure bug).
3. **`no-empty` (13).** Swallowed errors; log or handle.
4. Once a directory is at zero `any`, raise `no-explicit-any` to `error` for that path in `eslint.config.js` (ratchet, closes Q3 incrementally).

## 6. PR sequence

| PR  | Scope                                                                                                                                                                                                        | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | `chore:` budget ratchet — remove `ServerAdminPanel` / `SetupDockerTab`, lower shrunk baselines, make `check-component-budget.js` report baseline > actual; align 300 vs 250 in `check-architecture.mjs` (Q9) | S      |
| 2   | `refactor:` delete dead `MelodiqSettings.tsx` + `SettingsFeedbackForm.tsx` (D1) after confirming no importer                                                                                                 | S      |
| 3   | `test:` convert or delete `werewolf/logic/tests/verify_*.ts`                                                                                                                                                 | S      |
| 4–6 | `refactor:` D7 intra-file helpers (one PR per area: melodiq hooks, tabletop, lib)                                                                                                                            | S each |
| 7   | `refactor:` cards score views (D2 + priority 2)                                                                                                                                                              | M      |
| 8   | `refactor:` `QwixxRow`                                                                                                                                                                                       | M      |
| 9   | `refactor:` typed WebRTC messages                                                                                                                                                                            | M      |
| 10  | `refactor:` Melodiq `BroadcastChannel` → `useMultiChannelSync` (Q4)                                                                                                                                          | M      |
| 11+ | remaining god components, one per PR                                                                                                                                                                         | M each |

After every PR: `npm run quality-gates`; before push `npm run ci:gates && npm run build`. Re-run this snapshot (commands in `verified.method`) after PR 6 and compare.
