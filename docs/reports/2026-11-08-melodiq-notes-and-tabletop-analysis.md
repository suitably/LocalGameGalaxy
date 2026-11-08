---
type: Report
title: 'Melodiq Notes and Spieltisch (tabletop): what makes sense, what does not, what to extend'
description: 'Multi-agent audit of src/games/melodiq-notes and src/games/tabletop (engine, sync, UX, server plugin, publishing) plus a research brief on running Tabletop Simulator Workshop scripts in a browser; prioritised recommendations.'
tags: [melodiq-notes, tabletop, tts-import, scripting, lua, sync, audit, plan]
status: stable
generated:
  at: 2026-11-08T20:30:00+01:00
  by: claude-code
verified:
  at: 2026-11-08
  method: 'Three read-only subagents read src/games/melodiq-notes, src/games/tabletop (logic, hooks, components), server/src/plugins/{tabletop,melodiq}, docs/tech/tabletop-engine.md; one research agent read TTS API mirrors, fengari/wasmoon repos, VirtualTabletop wiki, Steam Subscriber Agreement. A fourth subagent read ttsParser.ts, ttsContainers.ts, steamWorkshopApi.ts, useWorkshopImport.ts, server workshop routes and ran python statistics over the four uploaded Workshop exports (Elfenland, Catan).'
sources:
  - 'src/games/melodiq-notes'
  - 'src/games/tabletop'
  - 'server/src/plugins/tabletop'
  - 'docs/reports/2026-10-21-tabletop-vtt-plan.md'
  - 'https://github.com/tts-community/api'
  - 'https://github.com/fengari-lua/fengari'
  - 'https://github.com/ceifa/wasmoon'
  - 'https://github.com/ArnoldSmith86/virtualtabletop/wiki/Functions'
---

# Melodiq Notes and Spieltisch — analysis (2026-11-08)

Builds on the [2026-10-21 tabletop VTT plan](2026-10-21-tabletop-vtt-plan.md) and the [2026-10-22 table session plan](2026-10-22-table-session-plan.md); slices 1 (host-authoritative sync), 2 (autosave), 3–5 (deltas, undo, editor) of that plan are done on `main` now. Open scripting decision: [Q15](../open-questions.md).

## 1. Melodiq Notes

Size: 17 002 lines / 29 test files (`docs/tech/game-catalog.md:39` says 6 530 / 3 — stale).

### 1.1 What it is

Band stage on one screen (up to 4 players, `stage/engine/players.ts:7`, canvas renderer `stage/render/*`) with views for keys, strings (tab highway + fretboard), drums, sung pitch and scrolling notation; modes learn / practice / perform; count-in, bar loops, speed 25–150 %, guided practice ladder, results with stars. Inputs: computer keys, touch, Web MIDI (`useMidiInput.ts`), microphone pitch (`hooks/useMicPitch.ts`). Phones join as **pults** via the party room (`pult/`), judge locally and send batched judgements; clock sync by ping/pong median. Songs: 3 demos, local files (.mxl/.musicxml/.mid/.gp), browser folder import (Dexie), companion-server library with faceted search, recordings aligned in the browser to bar marks, YouTube download through the server's yt-dlp.

### 1.2 Makes sense (keep)

- Framework-free `StageEngine` with pure helpers (`advance.ts`, `judging.ts`, `transport.ts`), `PultEngine extends StageEngine` — one rule set, well tested.
- Timing model: frame clock pulled toward the audio clock (`stage/useStage.ts:30-45`), output latency drawn behind the clock, input latency subtracted (`stage/engine/input.ts:31-35`), recording re-seek above 250 ms drift, WAV re-encode for inexact MP3 seeks.
- Pult protocol: monotonic `seq` (`stage/engine/remote.ts:62-71`), chart re-request, idle heartbeat, shared `modules/room-game`.
- Parser in `modules/music-score/musicXml.ts`: divisions, backup/forward, chords, ties, transpose, unpitched → drums, repeats + endings, pickup bars; plus MIDI, .mxl, Guitar Pro, UltraStar.

### 1.3 Makes no sense / half-finished

- **Microphone is onset-blind**: a hit fires only when the rounded pitch *changes* (`stage/useStageInput.ts:72`) → repeated notes never register; cents are lost while `PITCH_TOLERANCE` is 0.8 (`advance.ts:12`); `autoCorrelate` is basic (`modules/audio/AudioUtils.ts:62`).
- OSMD-era leftovers: `logic/musicXmlParser.ts` (regex parser, still used by folder sync `logic/folderSync.ts`, hex palette `:128`), `extractPartsFromXml`, unused `DemoSong.difficulty/stems/sync_offset_ms` (`types.ts:5-11`), `useAudioSynth.ts` (second AudioContext for a settings preview).
- 64 of 73 `games.melodiq_notes.*` locale keys unused; `MELODIQ_NOTES_VIEW_MODE` / `_SHEET_RENDER_MODE` registered but unused (`src/lib/storage.ts:94-95`).
- Hub description names competitors ("Yousician/Flowkey practice modes") and ignores band, pults, guitar/bass/drums/vocals.
- Device-library songs load with origin `example` (`SongPicker.tsx:69`) so "remember last song" silently fails for them (`stage/useResumeLastSong.ts:17-21`).
- Batch import stores the unreviewed top YouTube hit (`stage/logic/batchImport.ts:104`); same legal exposure as Melodiq's yt-dlp path.
- Pult clock has a constant offset, no drift model (`pult/logic/stageClock.ts:24`); learn mode with a pult waits ≥ 60 ms + RTT by design.
- Folder sync: Chromium-only handle persistence, `.xml/.mxl` only, `requestPermission` outside a user gesture (`folderSync.ts:146`).
- Capacitor: no back-button handling, no wake lock on the stage (only `pult/PultView.tsx:43`); Web MIDI in the Android WebView **unverified**.
- Docs: `melodiq-architecture.md` never mentions Notes; no doc for engine, latency model or pult protocol (`pult/logic/protocol.ts` is the de-facto spec).

### 1.4 Extend (prioritised)

| # | Recommendation | Effort | Risk |
|---|---|---|---|
| 1 | Rewrite hub description (en/de); drop competitor names | S | none |
| 2 | Delete legacy parser + test, unused `DemoSong` fields, unused locale and storage keys | S | low |
| 3 | Route folder/device import through `readScoreFile` with its own `SongOrigin` (fixes "last song", adds .mid/.gp) | S–M | low |
| 4 | Mic: RMS onset gating + fractional pitch → real guitar/ukulele via microphone | M | medium |
| 5 | `docs/tech/melodiq-notes-architecture.md` (engine, latency, pult protocol); fix catalog counts | S | none |
| 6 | Stage wake lock + back button; verify Web MIDI / BLE MIDI in the WebView | S | low |
| 7 | Batch import: confirmation or duration-match heuristic before storing a YouTube hit | S | low |
| 8 | Move synth / soundfont / sound settings / `useMidiInput` to `src/modules/` (Melodiq calibrators build their own oscillators) | M | medium |
| 9 | Parser: multi-verse lyrics, D.C./D.S./coda, `<harmony>` chords (→ chord/strum mode) | M | medium |
| 10 | Persisted per-song results + party leaderboard; colour-blind palette and shape coding | M–L | medium |

Further ideas: metronome-only mode (clicks exist, `players.ts:88-91`), alternate tunings/capo/left-handed (`modules/music-score/instruments.ts:11`), offline Workbox cache for `/media` + marks, teacher mode (demo-play + per-bar error heatmap), IMSLP/OpenScore as legal catalog sources (MuseScore has no public API — keep links).

## 2. Spieltisch — engine, sync, UX

### 2.1 Makes sense

- Host-authoritative intents → `STATE_DELTA` with seq, snapshot on gap (`hooks/useTabletopSync.ts:93-104,168-192`, `logic/syncProtocol.ts:103-107`); delta-based undo; clean `logic/zOrder.ts`; per-seat sealing of hand faces via ECDH/AES-GCM (`logic/privateHandChannel.ts`, `hiddenZoneRedaction.ts`).
- Gestures, deal/draw context menu, hand fan + zoom, pass-and-play cover, named saves/templates, inspector + JSON editor + deck builder, 10-op button routines (`logic/types.ts:216-227`, `logic/routines.ts`).
- 48 test files, strong on logic (reducer, redaction, privacy, z-order, gestures, routines, holder layout, saves). `docs/tech/tabletop-engine.md` matches the code.

### 2.2 Makes no sense / risks

- **Authorization gap**: `acceptIntent` (`syncProtocol.ts:62-63`) checks only spectator + `redacted`; any seated phone may `PATCH_WIDGETS` (e.g. take over a hand holder's `ownerSeat`), `DELETE_WIDGETS`, `UPDATE_TABLE`, draw into another seat's hand. Seat is an unauthenticated URL param (`TabletopGame.tsx:36`).
- **Redaction holes**: hands are blanked only once a seat registered a key (`privateHandChannel.ts:57-59`); spectator-only rooms get faces in clear in `LOAD_GAME`; plain-HTTP LAN origins have no WebCrypto → clear text over public MQTT (`src/modules/sync/MqttMailboxService.ts:16-18`).
- **Randomness inside the reducer** (shuffle `reducers/deckReducer.ts:57-60`, `ROLL_DIE`, bag ids via `Date.now` `bagReducer.ts:19-21`) — works only because non-hosts are overwritten; the 2026-10-21 plan's "host carries random values" was not done. A rejected optimistic intent is never rolled back on the phone.
- **Performance with 500–800 widgets** (the Catan/Elfenland imports): DOM node per widget, no `React.memo`; `filterBoardWidgets` runs `isCardInDeck`/`isCardInHand`/`isItemInBag` per widget → O(n²) per frame (`logic/boardFilter.ts:16-38,211-229`); `MOVE_WIDGET` per rAF clones the map, diffs, broadcasts one delta per frame over BroadcastChannel + MQTT and records one undo step per frame (`components/editor/useTabletopEditor.ts:32-41`, history limit 100) — a long drag likely floods MQTT and flushes undo (**verify in browser**).
- Catan-specific name heuristics decide hand layout and supplies (`logic/handLayout.ts:16-90`, `boardFilter.ts:117-131`, `seatLogic.ts:49-95`); checkerboard by label match (`HolderWidgetView.tsx:16-19`); "board never hidden" = `pinned && size ≥ 500` (`hiddenZoneLogic.ts:107`).
- Dead: `table.gridSnap` set by the validator (`gameValidator.ts:260`) but never read; `SeatWidget.turn` read in `seatLogic.ts:161`, never written. Two `HandCardItem.tsx` copies; dock heights 156 vs 140 (`useTabletopEngine.ts:57`, `useDockDragDrop.ts:48`); flick fallback hard-coded (700,400) and German `Tisch:` (`TabletopControllerView.tsx:48,103`); German errors in `useTabletopGames.ts:42-44`.
- Server plugin: `useTabletopCompanion.ts` reads `tunnelActive ?? isTunnelActive ?? tunnelUrl` while the server returns `publicUrl` → tunnel chip always "No tunnel"; duplicates `companionHttp`; deleting a saved game reuses `allowSongDeletion`.
- **Publishing = PR to this repo** with a user PAT in localStorage (`src/lib/github.ts:7-9`, `logic/publishValidator.ts:48-52`): repo-write token on a party device, 3 MB JSON with embedded images into git, no licence check — contradicts Q21 (no third-party games in the repo). Replace with export + share link / server library, or a GitHub Issue with attachment.
- Missing basics: multi-select move/rotate/flip (selection only scales), snap grid, deck search, turn order/timer, score tracking beyond counters, card-on-card piles (#558), peek/request hands (#557), roll-all (#672).

### 2.3 Top 10

| # | Recommendation | Effort | Risk |
|---|---|---|---|
| 1 | Coalesce `MOVE_WIDGET`: one undo step per drag, one delta per ~50 ms | S | low |
| 2 | Precompute in-deck/in-hand/in-bag sets once per `filterBoardWidgets`; `React.memo` on widget views | S | low |
| 3 | Fix `useTabletopCompanion.ts` (`publicUrl`, reuse `companionHttp`), controller strings, German errors | S | low |
| 4 | Redact hands whenever sealing is possible, not only after a seat key; spectators always blanked | S | low |
| 5 | Per-seat intent authorization in `acceptIntent`: editor actions host-only, draws only into own hand, reject `ownerSeat` patches | M | medium |
| 6 | Wire or remove `table.gridSnap`; update `game-catalog.md:45` | S | low |
| 7 | Multi-select move/flip/rotate/delete via batched `PATCH_WIDGETS` | M | low |
| 8 | Replace GitHub-PR publishing with export + server library / share link | M | medium |
| 9 | Turn order (`NEXT_TURN`, `seat.turn`) + roll-all routine templates | M | low |
| 10 | Card-on-card piles and peek/request-hand protocol with redaction rules (after 5) | L | medium |

## 3. Running Workshop scripts — research and recommendation

Facts (sources in front matter; several primary hosts were unreachable, details marked):

- TTS saves carry scripts as plain strings: `LuaScript`, `LuaScriptState`, `XmlUI` on Global and per `ObjectState`. Includes are already inlined by the editor plugins. Typical Global script 10–200 KB. Lua dialect is MoonSharp (≈ Lua 5.2, no `io`/`require`).
- Most of the API is 3D/physics-centric (positions, rotations, zones, collisions, snap points). A 2D widget table can map faithfully only: `getObjectFromGUID`, `getAllObjects`, `Object.{setPosition,flip,shuffle,deal,takeObject,putObject,getObjects,createButton,setVar/call}`, `Player`, `Turns`, `Notes`, `Wait`, `JSON`, `broadcastToAll`, events `onLoad/onSave/onObjectDrop/onPickUp/onObjectEnterContainer/onPlayerTurn`.
- Browser Lua VMs: **wasmoon** (Lua 5.4 WASM, ~130 KB gz, fast, last commit 2025-01, single maintainer) and **fengari** (Lua 5.3 JS, ~69 KB gz, ~25× slower, 32-bit ints, v0.1.5 2025-12). lua.vm.js dead. No existing project runs TTS Lua outside TTS; Tabletop Playground imports TTS objects but not scripts (**unverified**).
- Sandboxing: whitelist libs, `debug.sethook` instruction budget per coroutine (availability in both VMs **unverified**). Determinism: run on the host only and broadcast resulting deltas — fits the existing authority model.
- Steam: `GetPublishedFileDetails` needs no key but has no CORS → proxy stays (companion or a Cloudflare Worker, open decision in the 2026-10-22 plan); public downloader sites died in 2022. Subscriber Agreement grants rights within Steam only; scans of commercial games are infringing regardless — fetch on the user's device on request, never mirror or bundle, show Workshop URL + author.
- Declarative models worth copying: PlayingCards.io automations (already imported as .pcio), VirtualTabletop routines (`CLICK, CLONE, COUNT, FLIP, FOREACH, IF, MOVE, SHUFFLE, TURN, SCORE, VAR…`, GPL-3.0 — format only, no code), Tabletop Playground's JS event/object model as template for a plugin API; boardgame.io (MIT) as a possible rules host.

**Recommendation (staged):**

1. **Declarative macros first** (M): extend the existing 10-op routines with conditions and triggers (`onDrop`, `onTurnStart`, `onCounter`) and a `TURN` op over seats. Pure data in the game JSON, executed by the reducer, synced as actions, trivially sandboxed; covers the setup/deal/shuffle/score/next-turn that most Workshop and VTT scripts do. Also closes Q15's "trivial subset". Prerequisite: §2.3 #5 (authorization).
2. **JS plugin API second** (L): TTPG-like `onLoad/onObjectDrop/onPlayerTurn` with object handles, scripts in a Web Worker with a structured-clone bridge, host-only execution, timeouts. No runtime cost, TypeScript typings.
3. **Lua VM + TTS shim last, opt-in experimental** (L, high risk): wasmoon on the host only, emitting the same reducer actions as 1–2; keep `LuaScript`/`LuaScriptState` in the import for this purpose (the parser drops them today, §4.3). Expect most mods to break silently (3D API); target card/token-only mods.

## 4. TTS import parser and the sample exports

The two uploads per game are byte-identical (one export per game; "v13.1.1"/"v13.0.5" is the mod's `VersionNumber`). Scratch scripts: `analyze.py`, `collide.py` in the session scratchpad (not in the repo).

### 4.1 Pipeline

`ImportWorkshopDialog.tsx` → `hooks/useWorkshopImport.ts`: `fetchWorkshopDetails` (`logic/steamWorkshopApi.ts:199`) via companion `GET /api/tabletop/workshop/:id/meta` or `POST /api/steam/…GetPublishedFileDetails` (dev proxy `vite.config.ts:25`, Cloudflare `cloudflare/worker.ts:22-64`). Download A (companion, `useWorkshopImport.ts:107-122` → `server/src/plugins/tabletop/routes/workshop.ts:86-149`): writes `<tabletopDir>/workshop/<id>.json`, **no asset download, BSON rejected** (l. 117) although Steam serves most saves as BSON (the client decodes it, `steamWorkshopApi.ts:260-281`). Download B: browser fetches `steamusercontent-a.akamaihd.net` directly (CORS `*`). Conversion `logic/ttsParser.ts`: `x=posX, y=posZ` × `TTS_SCALE=50`, `posY → zIndex`; images stay remote, only Steam hosts rewritten to HTTPS (`sanitizeTtsUrl`, l. 741-757). The companion `/tabletop/proxy-image` route (`workshop.ts:152-222`) is never used by the TTS path.

### 4.2 Handled well

Decks/cards via `CustomDeck` spritesheets (100 % of cards in both exports have a sprite front), UniqueBack, hex/circle cards; bags / Infinite_Bag, Custom_Tile shapes, FogOfWarTrigger → hidden zone, `States` (`ttsContainers.ts`), snap points incl. board stretch/rotation, Custom_Board sizing, HandTrigger → seat by FogColor, Rules tab → `ruleText`, dice; robust `WorkshopError` codes, BSON decode, legacy `cloud-3` rewrite.

### 4.3 Lost / mis-mapped (evidence from the exports)

- **GUID collisions destroy decks (bug).** Card ids = `obj.GUID` (`ttsParser.ts:313`); TTS mods copy objects with identical GUIDs. Catan: 12 decks list 274 `cardIds`, only 65 card widgets exist; the five resource decks (19 cards each) own 0 cards — overwritten by decks 8–12. 46 bag items are referenced by two bags each (`convertBag` writes `out[child.id]`, `ttsContainers.ts:86`).
- **Custom_Model**: skipped at top level (l. 663) but converted to a plain circle inside bags/states (`convertChild`, l. 569-575); `CustomMesh.DiffuseURL` never read. Catan: 46 circles = the hex terrain tiles and frames (the board itself); Elfenland: 48 = all transportation counters. Tokens without image: Catan 100/101, Elfenland 176/180.
- **Face/rotation**: `faceUp = !HideWhenFaceDown` (l. 324), `rotation: 0` (l. 325); `rotZ≈180` and `rotY` ignored → 0 of 167 cards face up, including pinned reference cards.
- **Images**: Elfenland's 305 refs are `http://i.imgur.com` (3 URLs) — not rewritten, mixed content on the HTTPS PWA → the game renders blank (and imgur purged old anonymous uploads).
- **Seats**: `FOG_COLOR_SEAT` (l. 81-93) gives sparse seats (Elfenland 0,2,4,5,7,8; Catan 0,1,2,3,5,7) with `maxPlayers` 6 → seats 7/8 unreachable.
- **Dropped silently**: Global/object `LuaScript`, `LuaScriptState`, `XmlUI` (`ttsTypes.ts:93-96, 139-141`, "ignored for import"), `Tags`, `Description`, `GMNotes`, decals, Tablet/Notecard (l. 677), AssetBundle/PDF (l. 589), `TabStates` other than one titled exactly `Rules` (Catan got none). No import report.
- Snap points become 80×120 "Ablage" holders (l. 207-210); Catan's 27 hex snaps are rectangles because `hasAnyHexDeck` keys on `CustomDeck.Type`.

### 4.4 Dead weight

`ScriptingTrigger` → 7 pinned 228 px circles labelled "ScriptingTrigger"; `3DText` → 8 pinned circles labelled "3DText" (text lost); Custom_Token "True"/"False" script toggles → tokens. German literals (`Karte ${id}` ×98, `Kartenstapel`, `Spielbrett`, `Ablage`, `Hand N`) bypass `localizeLabels.ts`/`labelKey`. `description = Note || Tags.join` → Catan's description is its tag list. Companion Path A adds nothing over Path B. Hands at `-99999` are intentional (`gameValidator.ts:84-91`).

### 4.5 Scripting, seen from the parser

Nothing of the script layer survives; the parser cannot even tell the user a mod is script-driven (Catan is tagged "Scripting"). Shim feasibility (~40 functions, coordinates = inverse of `projectPosition`) and the host-only execution model match §3. The declarative route already has its model: `RoutineStep` (10 ops, `types.ts:234-244`), `ButtonWidget`, `RUN_ROUTINE` (`tabletopReducer.ts:80`), `routines.ts` (`MAX_ROUTINE_STEPS` 50). Straight-line Lua idioms are translatable with `luaparse`: `createButton{click_function}` → button, `deck.shuffle()` → SHUFFLE, `deal(n)`/`takeObject{position}` → DRAW/MOVE, `flip()` → FLIP, toggles → NEXT_STATE; new ops needed: `DEAL` (n to every seat), `TAKE_FROM_BAG`, `PLACE_IN_HOLDER`, `SET_STATE`, per-seat `COUNTER`. Coverage must be measured on a Workshop corpus loaded at runtime (Q21 forbids storing it).

### 4.6 Top 10 for the importer

| # | Recommendation | Effort |
|---|---|---|
| 1 | Unique ids per converted object (`GUID` + suffix on repeat) in `convertCard`/`convertBag` | S |
| 2 | `Custom_Model`: `CustomMesh.DiffuseURL` as image, else labelled token; same rule top-level and in bags | S |
| 3 | `3DText` → label widget, `ScriptingTrigger` → drop or invisible zone, Tablet/Notecard → rule text | S |
| 4 | Face from `rotZ`, rotation from `rotY` | S |
| 5 | Rewrite `http://i.imgur.com` → https; flag unreachable hosts; optionally cache images to `assetFiles` via `/tabletop/proxy-image` | S–M |
| 6 | Dense seat numbering (FogColor order, clamp to `maxPlayers`) for hands and fog zones | S |
| 7 | Labels via `labelKey`, no German literals; description from `Note` only | S |
| 8 | Import report in the dialog (converted/degraded/dropped per TTS type, scripts present, image hosts) | S–M |
| 9 | Script sidecar + viewer; label-only buttons from `createButton` | M |
| 10 | Lua-idiom → `RoutineStep` translator with new ops; host-only Lua VM only as a later flagged experiment | M → L |

Also: server Path A should download assets or leave the TTS flow; `serverGameSnapshot.ts` inlines images as data URLs = redistribution on the companion server — prefer per-device IndexedDB caching at import.
