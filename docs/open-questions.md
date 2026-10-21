# Open questions & unresolved contradictions

Living list. Each item: what is unclear or broken, the evidence, what would resolve it. When resolved, move the answer into the owning doc, delete the item here, and record it in [log.md](log.md). Items tagged **[user]** need a decision by the maintainer; agents must not pick a side silently.

Found by the [2026-10-18 docs-vs-code audit](reports/2026-10-18-docs-vs-code-audit.md) unless noted.

## Q4 — Melodiq uses inline `BroadcastChannel`

The anti-pattern matrix forbids inline `BroadcastChannel` sync in games, but Melodiq creates channels directly in `hooks/useTVMode.ts`, `hooks/useTVReceiver.ts`, `hooks/SettingsContext.tsx`, `gameplay/hooks/useSessionEnd.ts` (channel `melodiq_tv_control`) and `hooks/useQueue.ts` (queue sync). The party lobby does the same in `src/features/party/logic/universalPartyManager.ts` (`party_bc_<roomId>`) — outside `src/games`, so the rule's wording does not cover it. `check-architecture.mjs` does not check this rule.
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

## Q10 — Node version drift

`.nvmrc` = 24, root `package.json` `engines.node >=24`, CI uses `.nvmrc`. But `server/Dockerfile` builds on `node:20-slim` and README "Prerequisites" says Node 20.
Resolve: bump the Dockerfile base image (check the `full` AI stage too) and README.

## Q11 — 63.7 MB ONNX model tracked in git

`server/models/UVR-MDX-NET-Inst_HQ_3.onnx` is tracked (hygiene check warns). The rule "never track server media" names `server/music/` only.
Resolve _(user)_: keep (offline Docker builds) or move to Git LFS / download on first use like `separator.ts` already supports via `MODELS_DIR`.

## Q12 — CHANGELOG structure broken

`CHANGELOG.md` contains four `## [Unreleased]` sections (lines 1, 77, 150, 158) and a second `# Changelog` header at line 70 — merge artefacts. Which entries shipped in 1.1.0 is unclear.
Resolve _(user)_: consolidate into one `[Unreleased]` section before the next release.

## Q13 — ADR-0004 no longer matches the separation stack

ADR-0004 says "Demucs via PyTorch". `server/src/plugins/melodiq/services/separator.ts` runs `audio-separator[cpu]` with model `UVR-MDX-NET-Inst_HQ_3.onnx` and aligns lyrics with `whisper-timestamped` (`server/src/scripts/align_lyrics.py`). The ADR now carries a note; a superseding ADR is a maintainer decision.

## Resolved 2026-10-18

- Q15 issues #353–#361 vs branch state → #384 merged; #353, #354, #355, #357, #358 closed, specs moved to [archive/issue-specs](archive/index.md). Open: #356, #359, #360 ([tasks](tasks/index.md)); #361 closed 2026-10-21.

- Q0 unauthenticated tabletop routes / master token in media URLs → fixed in PR #394: auth on all tabletop routes, management rights for directory changes, caller token in `/raw` and `/api/songs` URLs. [server-security](tech/server-security.md)
- Q1 release job called a removed `npm run package` → fixed in PR #394: esbuild bundle + `@yao-pkg/pkg` Node 24 binaries. [deployment §4c](tech/deployment.md#4c-standalone-binaries)
