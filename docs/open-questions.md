# Open questions & unresolved contradictions

Living list. Each item: what is unclear or broken, the evidence, what would resolve it. When resolved, move the answer into the owning doc, delete the item here, and record it in [log.md](log.md). Items tagged **[user]** need a decision by the maintainer; agents must not pick a side silently.

Found by the [2026-10-18 docs-vs-code audit](reports/2026-10-18-docs-vs-code-audit.md) unless noted.

## Q4 — Melodiq uses inline `BroadcastChannel`

The anti-pattern matrix forbids inline `BroadcastChannel` sync in games, but Melodiq creates channels directly in `hooks/useTVMode.ts`, `hooks/useTVReceiver.ts`, `hooks/SettingsContext.tsx`, `gameplay/hooks/useSessionEnd.ts` (channel `melodiq_tv_control`) and `hooks/useQueue.ts` (queue sync). `check-architecture.mjs` does not check this rule.
Resolve: migrate to `useMultiChannelSync` or document Melodiq TV sync as an explicit exception.

## Q5 — Root `config.example.json` is obsolete

**[user]** The repo root contains `config.example.json` with an `ssl` block, and README step 2 says `cp config.example.json config.json`. The companion server has no TLS support any more (removed in the backend simplification, see [archive](archive/backend-simplification/03-remove-ssl-generator.md)), looks for `config.json` in `CONFIG_PATH`, the working directory or next to the executable, and ships its own `server/config.example.json`.
Resolve: delete the root example and point README to `server/config.example.json`.

## Q6 — Dead translation files

`src/i18n/locales/{de,en}/imposter.json` are tracked but imported nowhere (Imposter strings come from `public/locales/*/translation.json`).
Resolve: delete them, or wire them up if they hold newer strings.

## Q7 — Scaffolder generates a `gameManifest.ts` pattern no game uses

`scripts/scaffold-game.mjs` writes `src/games/<id>/gameManifest.ts`, `tests/<id>.test.ts` and a `hooks/use<Game>State.ts`, then patches `src/lib/gameRegistry.tsx`. None of the 15 existing games has a `gameManifest.ts`; the registry is a hand-written array. **Unverified:** whether the registry patch step still matches the current file layout.
Resolve: run the scaffolder in a scratch branch; either align it with the existing pattern or adopt manifests everywhere.

## Q8 — Game-local storage keys bypass the `STORAGE_KEYS` registry

Rule: every key is registered in `STORAGE_KEYS`. Reality: qwixx, knister, kniffel, guessart, storyteller and cards define local key strings (list in [game-catalog §2](tech/game-catalog.md#2-persistence)). Several registered keys are therefore **never referenced**: `CARDS_LOBBY_PLAYERS`, `QWIXX_MY_SHEET`, `QWIXX_SHOW_DICE`, `KNISTER_CURRENT_GAME`, `KNISTER_SHOW_DICE`, `EXCALIDRAW_DRAWING`. The architecture check only catches raw `localStorage.` calls, not unregistered keys.
Resolve: replace local constants with the registry entries (same string values, so no data migration), add the missing ones (kniffel, guessart, storyteller), drop unused entries.

## Q13 — ADR-0004 no longer matches the separation stack

ADR-0004 says "Demucs via PyTorch". `server/src/plugins/melodiq/services/separator.ts` runs `audio-separator[cpu]` with model `UVR-MDX-NET-Inst_HQ_3.onnx` and aligns lyrics with `whisper-timestamped` (`server/src/scripts/align_lyrics.py`). The ADR now carries a note; a superseding ADR is a maintainer decision.

## Q15 — VirtualTabletop routines on import

**[user]** VirtualTabletop games rely on routines (14 580 in its library); our button routines express about 1.2 % of them, so imported buttons do nothing. Options: translate the trivial subset and list the rest in an import report, or build a sandboxed interpreter for VTT's routine language (the scripting-scope question from the [2026-10-21 plan](reports/2026-10-21-tabletop-vtt-plan.md), slice 9).

## Resolved 2026-10-27

Decisions in [2026-10-27 maintainer decisions](reports/2026-10-27-maintainer-decisions.md); implementation follows in each issue.

- Q16 tabletop hidden-zone leaks (#551) → close the UI leaks **and** redact hidden widgets per seat on the host.
- Q17 Docker Hub namespace → the account owns `nexumia`; `nexumia/melodiq-server` is no longer published from 1.2.0 (`docker-publish.yml`).
- Q19 local tabletop templates (#547) → a separate store keyed by game id, with "reset to original".
- Q18 (resolved 2026-10-26) will be reversed by #568: the song folder becomes the only store, and `song.json` replaces `piece.json`.

## Resolved 2026-10-26

- Q21 third-party Workshop fixture (#586) → maintainer decision: the Tabletop Simulator Workshop import stays; games from the Workshop or other outside sources are loaded at runtime and never stored in the repository. `src/games/tabletop/tabletopsimulator/2500271578.{json,png}` removed; `ttsParser.test.ts` and `steamWorkshopApi.test.ts` use a small hand-made save. `logic/gameValidator.ts` lost the migrations written for that one game (image hashes, hex back URL, board size, snap offsets, scaling); hex shape now follows only the clip path or the 210×182 size.
- Q20 learn mode and latency calibration with pults (#573, #546) → maintainer decision: practising (learn mode, which waits) is for one player alone — the toggle is off with two or more players and a second player switches to practice; a single pult player is waited for until the pult's judgement arrives. Latency is calibrated by best practice: tap-along to clicks per input source (screen/keys, MIDI, microphone), on the stage and on each pult; network jitter only affects the clock sync, judging happens on the device. [sync-protocol §3](tech/sync-protocol.md#3-multi-channel-sync-usemultichannelsynct)
- Q11 ONNX model tracked in git → `server/models/` untracked (it is already in `.gitignore`; `audio-separator` downloads the model into `MODELS_DIR` on first use). `server/.vapid_keys.json` (unused by any code) and the generated `dev-dist/` untracked too.

## Resolved 2026-10-25

- Q18 one storage place for Melodiq Notes sheet music (#534, #486) → maintainer decision: (a) and (b) yes — the Notes library is the only score store; a piece links a Melodiq song with `songId` and plays with its mix, bar marks live in the piece; song-folder scores are imported once on startup (non-destructive, marker file). (c) `POST`/`DELETE /api/songs/:id/scores` answer `410`; reads and marks routes stay as deprecated aliases of the linked pieces. [song-pipeline §4](tech/song-pipeline.md#4-sheet-music-for-melodiq-notes)

## Resolved 2026-10-18

- Q15 issues #353–#361 vs branch state → #384 merged; #353, #354, #355, #357, #358 closed, specs moved to [archive/issue-specs](archive/index.md). Open: #356, #359, #360 ([tasks](tasks/index.md)); #361 closed 2026-10-21.

- Q0 unauthenticated tabletop routes / master token in media URLs → fixed in PR #394: auth on all tabletop routes, management rights for directory changes, caller token in `/raw` and `/api/songs` URLs. [server-security](tech/server-security.md)
- Q1 release job called a removed `npm run package` → fixed in PR #394: esbuild bundle + `@yao-pkg/pkg` Node 24 binaries. [deployment §4c](tech/deployment.md#4c-standalone-binaries)
