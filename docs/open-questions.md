# Open questions & unresolved contradictions

Living list. Each item: what is unclear or broken, the evidence, what would resolve it. When resolved, move the answer into the owning doc, delete the item here, and record it in [log.md](log.md). Items tagged **[user]** need a decision by the maintainer; agents must not pick a side silently.

Found by the [2026-10-18 docs-vs-code audit](reports/2026-10-18-docs-vs-code-audit.md) unless noted.

## Open

- Q25 **[user]** copyright holder wording for own files (#594). `REUSE.toml` names `LocalGameGalaxy` as holder of everything that is not third-party, because the repository has no copyright line anywhere (LICENSE is the bare AGPL text, `package.json` files have no `author`, README §8 names no holder) and `LocalGameGalaxy` is the only author wording in use (`public/games/tabletop/manifest.json`). A project name is not a legal person. Resolve: the maintainer picks the holder line (e.g. their name, or "<name> and LocalGameGalaxy contributors") and confirms that the brand and icon images (`design/`, `public/pwa/`, `public/og-image.png`, Android launcher/splash PNGs) are own work; then update the default annotation in `REUSE.toml`. [dependencies](tech/dependencies.md)
- Q26 **[user]** Melodiq phone RPC transport (GAME-CATALOG-RESTRUCTURE 6.1). Queue, library search, host settings and feedback travel between host and phones as messages on Melodiq's WebRTC data channels (`components/PhoneQueueBridge.tsx`, `HostSettingsRpcBridge.tsx`, `FeedbackRpcBridge.tsx`, `PhoneClientEngine.tsx`), not on `useRoomEvents`. A move to the MQTT room transport would (a) not work for standalone Melodiq, which has no party room or room key, (b) need a broker that may be unreachable offline, while (c) phones still need WebRTC for microphone audio and the song proxy, and (d) lose the per-peer sender identity the admin-role check relies on. Options: keep WebRTC and record it in ADR-0011; or give Melodiq a `RoomTransport` over its WebRTC manager (`roomTransport.ts` allows swapping transports) so the RPC uses the room API without MQTT. Resolve by a maintainer choice.

## Resolved 2026-11-20

- Q23 Wordle's unregistered `i18n` bundle → maintainer decision (2026-11-20): deleted, like Sudoku's. `src/games/wordle/i18n/index.ts` and its re-export are gone; ten keys the code calls via `t()` but `public/locales` lacked (`not_in_dictionary`, `settings.dictionary_only` and `_hint`, `key_enter`, `key_delete`, `letter_state.*`) were added to both locale files (before, they fell back to the inline defaults or showed the key). [i18n-strategy](tech/i18n-strategy.md)
- Q22 tabletop drag p95 at 800 widgets → maintainer measured it on a real mid-range phone (2026-11-20) and found it fast enough (p95 at or below 16 ms; exact figure not recorded). The DOM renderer stays; the Canvas renderer of TTS plan D5 is not needed. [tabletop-engine, Performance](tech/tabletop-engine.md#performance-684)

## Resolved 2026-11-17

- Q24 scripted card games sent all hands to every device → maintainer decision (2026-11-17): seal hands per seat. The host keeps the state and sends each seat only `script.view(state, seat)`, sealed with the seat's key (`PrivateHandChannel`); `moveAllowed` for single-card picks runs on the host (`hints`). [scripted card games](tech/tabletop-scripted-games.md)

## Resolved 2026-11-15

- Q22 deleting a saved tabletop game → maintainer decision (2026-11-15): a dedicated API key flag `allowTabletopGameDeletion`; keys from older configs get their `allowSongDeletion` value on load, so nothing changes for existing installs. [server-security](tech/server-security.md)
- Q7 scaffolder → aligned with the existing pattern instead of adopting manifests: `scripts/scaffold-game.mjs` now generates `logic/` + test, `hooks/use<Game>State.ts`, a registered `STORAGE_KEYS` entry, locale keys and a `definitions` entry in `gameRegistry.tsx` (the old registry patch no longer matched the file). [scripts/README](../scripts/README.md)
- Q5 root `config.example.json` → maintainer decision (2026-11-15): deleted; README step 2 copies `server/config.example.json`. [secrets-management](tech/secrets-management.md)
- Q6 dead `imposter.json` locale files → maintainer decision (2026-11-15): deleted. They held a legacy word/hint list (1066 keys per language) superseded by `src/games/imposter/logic/wordPairs_{de,en}.ts`; none of the keys is referenced.
- Q13 ADR-0004 vs. separation stack → maintainer decision (2026-11-15, "whichever is more stable"): the running stack is documented. [ADR-0006](adr/0006-audio-separator-onnx-whisper-alignment.md) supersedes ADR-0004 (`audio-separator[cpu]` + `UVR-MDX-NET-Inst_HQ_3.onnx`, `whisper-timestamped`, CPU PyTorch kept for Whisper); the Demucs → ONNX rationale is marked **Unverified:** there.
- Q4 Melodiq inline `BroadcastChannel` → maintainer decision (2026-11-15): migrate. TV control (`melodiq_tv_control`), settings, session end and queue sync (`melodiq_queue_channel`) now use `useMultiChannelSync` with the new `selfEcho: false` option; channel names and messages are unchanged. [sync-protocol §3](tech/sync-protocol.md#3-multi-channel-sync-usemultichannelsynct)

## Resolved 2026-11-08

- Q15 VirtualTabletop routines on import → maintainer decision (by best practice, 2026-11-08): routines stay the canonical executable model and gain triggers, conditions and new ops; VTT/PCIO trivial subsets and straight-line TTS Lua idioms are translated into them, the rest is listed in an import report; a host-only sandboxed Lua runtime follows behind a flag. [ADR-0005](adr/0005-tabletop-scripting-for-imported-games.md), [TTS compatibility plan](reports/2026-11-08-tts-compatibility-plan.md) slices 7–9. Part 1 (routines++, VTT/PCIO trivial subset, starters as routines) done in #694.

## Resolved 2026-10-27

Decisions in [2026-10-27 maintainer decisions](reports/2026-10-27-maintainer-decisions.md); implementation follows in each issue.

- Q16 tabletop hidden-zone leaks (#551) → close the UI leaks **and** redact hidden widgets per seat on the host.
- Q17 Docker Hub namespace → the account owns `nexumia`; `nexumia/melodiq-server` is no longer published from 1.2.0 (`docker-publish.yml`).
- Q19 local tabletop templates (#547) → a separate store keyed by game id, with "reset to original".
- Q18 reversed by #568 → the song folder is the only store for Melodiq and Melodiq Notes: scores, `<score>.marks.json` and Notes recordings live in it, `song.json` replaces `piece.json` (title, artist, score labels) and gives a song without `.txt` a stable id. `/api/notes/pieces…`, `/notes/media` and the deprecated `/api/songs/:id/scores` routes are replaced by song-folder routes (no aliases); the old Notes library moves into song folders once (non-destructive, marker file). [song-pipeline §4](tech/song-pipeline.md#4-sheet-music-for-melodiq-notes)

## Resolved 2026-10-26

- Q21 third-party Workshop fixture (#586) → maintainer decision: the Tabletop Simulator Workshop import stays; games from the Workshop or other outside sources are loaded at runtime and never stored in the repository. `src/games/tabletop/tabletopsimulator/2500271578.{json,png}` removed; `ttsParser.test.ts` and `steamWorkshopApi.test.ts` use a small hand-made save. `logic/gameValidator.ts` lost the migrations written for that one game (image hashes, hex back URL, board size, snap offsets, scaling); hex shape now follows only the clip path or the 210×182 size.
- Q20 learn mode and latency calibration with pults (#573, #546) → maintainer decision: practising (learn mode, which waits) is for one player alone — the toggle is off with two or more players and a second player switches to practice; a single pult player is waited for until the pult's judgement arrives. Latency is calibrated by best practice: tap-along to clicks per input source (screen/keys, MIDI, microphone), on the stage and on each pult; network jitter only affects the clock sync, judging happens on the device. [sync-protocol §3](tech/sync-protocol.md#3-multi-channel-sync-usemultichannelsynct)
- Q11 ONNX model tracked in git → `server/models/` untracked (it is already in `.gitignore`; `audio-separator` downloads the model into `MODELS_DIR` on first use). `server/.vapid_keys.json` (unused by any code) and the generated `dev-dist/` untracked too.

## Resolved 2026-10-25

- Q18 one storage place for Melodiq Notes sheet music (#534, #486) → _reversed 2026-10-27 by #568 (see above)_; maintainer decision then: (a) and (b) yes — the Notes library is the only score store; a piece links a Melodiq song with `songId` and plays with its mix, bar marks live in the piece; song-folder scores are imported once on startup (non-destructive, marker file). (c) `POST`/`DELETE /api/songs/:id/scores` answer `410`; reads and marks routes stay as deprecated aliases of the linked pieces. [song-pipeline §4](tech/song-pipeline.md#4-sheet-music-for-melodiq-notes)

## Resolved 2026-10-18

- Q15 issues #353–#361 vs branch state → #384 merged; #353, #354, #355, #357, #358 closed, specs moved to [archive/issue-specs](archive/index.md). Open: #356, #359, #360 ([tasks](tasks/index.md)); #361 closed 2026-10-21.

- Q0 unauthenticated tabletop routes / master token in media URLs → fixed in PR #394: auth on all tabletop routes, management rights for directory changes, caller token in `/raw` and `/api/songs` URLs. [server-security](tech/server-security.md)
- Q1 release job called a removed `npm run package` → fixed in PR #394: esbuild bundle + `@yao-pkg/pkg` Node 24 binaries. [deployment §4c](tech/deployment.md#4c-standalone-binaries)
