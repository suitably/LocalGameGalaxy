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

## Q11 — 63.7 MB ONNX model tracked in git

`server/models/UVR-MDX-NET-Inst_HQ_3.onnx` is tracked (hygiene check warns). The rule "never track server media" names `server/music/` only.
Resolve _(user)_: keep (offline Docker builds) or move to Git LFS / download on first use like `separator.ts` already supports via `MODELS_DIR`.

## Q12 — CHANGELOG structure broken

`CHANGELOG.md` contains four `## [Unreleased]` sections (lines 1, 77, 150, 158) and a second `# Changelog` header at line 70 — merge artefacts. Which entries shipped in 1.1.0 is unclear.
Resolve _(user)_: consolidate into one `[Unreleased]` section before the next release.

## Q13 — ADR-0004 no longer matches the separation stack

ADR-0004 says "Demucs via PyTorch". `server/src/plugins/melodiq/services/separator.ts` runs `audio-separator[cpu]` with model `UVR-MDX-NET-Inst_HQ_3.onnx` and aligns lyrics with `whisper-timestamped` (`server/src/scripts/align_lyrics.py`). The ADR now carries a note; a superseding ADR is a maintainer decision.

## Q15 — VirtualTabletop routines on import

**[user]** VirtualTabletop games rely on routines (14 580 in its library); our button routines express about 1.2 % of them, so imported buttons do nothing. Options: translate the trivial subset and list the rest in an import report, or build a sandboxed interpreter for VTT's routine language (the scripting-scope question from the [2026-10-21 plan](reports/2026-10-21-tabletop-vtt-plan.md), slice 9).

## Q16 — Tabletop hidden-zone leaks outside the board

Since #539 board widgets inside a non-revealed hidden zone render as placeholders for other seats, but `BoardDragOverlay`, `DockDragOverlay`, `FlyingCardsLayer` and select-all / shift-multiselect (`SelectionHighlightLayer`, `WidgetContextMenu`) do not check zones; sync still sends full widget data to every device. A device without a selected seat falls back to the first seat as viewer. Decide whether to close these gaps in a follow-up.

## Q17 — Docker Hub namespace of the server and signaling images (#530)

Compose files, README and [deployment](tech/deployment.md) pull `nexumia/galaxy-signaling`, `nexumia/nexumia-server` and the deprecated `nexumia/melodiq-server`. Until #530 the workflow pushed to `${DOCKERHUB_USERNAME}/…`, so the pulled name only existed if that secret was `nexumia`. The workflow now pushes to the literal `nexumia` namespace. **(user)** Confirm that the Docker Hub account behind `DOCKERHUB_USERNAME` owns the `nexumia` namespace, and decide when to stop publishing `melodiq-server`.

## Q18 — One storage place for Melodiq Notes sheet music (#534)

Since #534 Melodiq Notes shows one library (`stage/logic/scoreCatalog.ts`) that merges Notes library pieces (`NOTES_DIR`) with the scores in Melodiq song folders; song-folder scores are read-only there, except that their bar marks are still written to `<score>.marks.json` in the song folder while they play with the song's own mix. The server keeps `POST`/`DELETE /api/songs/:id/scores`; since #486 the YouTube import ("Find on YouTube") uploads the score on stage into the song folder it downloaded the recording into, so (c) would have to move that flow to the Notes library as well. **(user)** Decide whether to (a) move song-folder scores into the Notes library (a piece that references the Melodiq song's mix instead of a copy), (b) store their marks in the Notes library too, and (c) remove the upload/delete score routes from the `melodiq` plugin.

## Q19 — Local default template for tabletop games (#538)

Since #538 a player can store the running table as a server game's default template (`PUT /api/tabletop/games/:id/template`, permission `allowTabletopTemplates`). On the device there is no such option: writing the table into `custom_games` under the game's id would shadow the starter JSON and the server game forever, because `TabletopGame` loads IndexedDB first. **(user)** Decide whether device-only games (and starter games) should get a local "save as default template", and how to reset it.

## Resolved 2026-10-18

- Q15 issues #353–#361 vs branch state → #384 merged; #353, #354, #355, #357, #358 closed, specs moved to [archive/issue-specs](archive/index.md). Open: #356, #359, #360 ([tasks](tasks/index.md)); #361 closed 2026-10-21.

- Q0 unauthenticated tabletop routes / master token in media URLs → fixed in PR #394: auth on all tabletop routes, management rights for directory changes, caller token in `/raw` and `/api/songs` URLs. [server-security](tech/server-security.md)
- Q1 release job called a removed `npm run package` → fixed in PR #394: esbuild bundle + `@yao-pkg/pkg` Node 24 binaries. [deployment §4c](tech/deployment.md#4c-standalone-binaries)
