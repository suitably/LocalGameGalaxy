---
type: Report
title: 'Tabletop Simulator compatibility plan: from static imports to running Workshop games'
description: 'Tiers of "a Workshop game runs on the Spieltisch", the compatibility harness that measures them, the decisions taken (ADR-0005) and the ordered slice plan with acceptance criteria and effort.'
tags: [tabletop, tts-import, scripting, lua, routines, assets, performance, plan]
status: stable
generated:
  at: 2026-11-08T22:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-08
  method: 'Built on the four subagent reports in 2026-11-08-melodiq-notes-and-tabletop-analysis.md (code read: src/games/tabletop logic/hooks/components, server/src/plugins/tabletop, cloudflare/worker.ts; python statistics over the Catan and Elfenland Workshop exports); symbols re-checked with grep.'
sources:
  - 'src/games/tabletop/logic/ttsParser.ts'
  - 'src/games/tabletop/logic/ttsContainers.ts'
  - 'src/games/tabletop/logic/steamWorkshopApi.ts'
  - 'src/games/tabletop/logic/types.ts'
  - 'src/games/tabletop/logic/syncProtocol.ts'
  - 'src/games/tabletop/logic/serverGameSnapshot.ts'
  - 'src/games/tabletop/logic/publishValidator.ts'
  - 'cloudflare/worker.ts'
  - 'docs/adr/0005-tabletop-scripting-for-imported-games.md'
---

# TTS compatibility plan (2026-11-08)

Goal set by the maintainer: as many Tabletop Simulator Workshop games as possible run on the Spieltisch. Ceiling, stated up front: TTS is a 3D physics sandbox; the Spieltisch is a 2D synced table. The reachable target is **every flat game (cards, tiles, tokens, boards, bags, dice) imports correctly and its setup automation works; a growing, measured subset of scripted games runs end to end; 3D/physics/AssetBundle mods are rejected with a readable report instead of a broken table.** Findings this plan rests on: [analysis report](2026-11-08-melodiq-notes-and-tabletop-analysis.md) §2–§4. Decisions: [ADR-0005](../adr/0005-tabletop-scripting-for-imported-games.md).

## 1. What "runs" means — tiers

| Tier | Definition (acceptance) | Today |
|---|---|---|
| **A — Components** | Every object converted or reported; decks hold all their cards; faces and rotations as in TTS; seats dense and ≤ `maxPlayers`; images load or are reported as dead | Fails on both samples: GUID collisions empty 5 Catan decks, 276/281 tokens are blank circles, 0/167 cards face up, Elfenland blank (http imgur) |
| **B — Setup** | Buttons, deal, shuffle, bags, states, counters and turn order work from routines; untranslated script parts listed | Only hand-authored routines (10 ops) |
| **C — Rules** | Script-driven flows (phases, scoring, `Wait`, zone events) run via the host-only Lua runtime | None |
| **D — Out of scope** | Physics, 3D models beyond a top-down sprite, AssetBundles, `XmlUI` beyond panels/buttons/text, `WebRequest` | Rejected with a badge |

Progress is measured, not guessed: §2.

## 2. Compatibility harness (slice 0)

- `scripts/tts-compat/` (dev-only, Node): `corpus.json` holds Workshop ids only (public identifiers, no content, per [Q21](../open-questions.md)); saves are fetched at run time into a git-ignored cache; nothing from the corpus is committed.
- Per mod the harness runs `parsePcioFile`/`ttsParser` and emits JSON: objects per TTS type → converted / degraded / dropped; cards per deck vs. `cardIds`; image hosts and HTTP status; seats; scripts present (Global, per object, `XmlUI`), script size, and — via `luaparse` — the set of TTS API functions and events called. Aggregate: tier reached per mod, top-N API calls by mod count.
- The aggregate is the **prioritisation input** for the shim (slices 8–9) and the regression gate: a slice may not lower any mod's tier. Results are summarised in a dated report, never stored raw.
- Also exercises the two local fixtures (`ttsParser.test.ts` hand-made save) so the unit suite stays offline.

Effort S–M. No UI.

## 3. Decisions taken (best practice, no open items left)

| # | Decision | Why |
|---|---|---|
| D1 | Routines are the canonical executable model; Lua is an adapter (translator, then host-only runtime); no in-page JS plugin API for third-party content | ADR-0005 |
| D2 | Steam access without a companion = the existing Cloudflare Worker (`cloudflare/worker.ts`: `GetPublishedFileDetails` + allow-listed, size-limited CDN download); browser-direct first, Worker fallback, companion optional. Closes the 2026-10-22 proxy question | Already deployed with the PWA; no new infrastructure |
| D3 | Assets are cached **per device** into `assetFiles` (IndexedDB blobs) at import; `http://` → `https://` rewrite for every host; a proxy only for hosts without CORS (Worker allow-list, companion `/tabletop/proxy-image`). Dead hosts are reported, not retried forever | Private copy on the user's device is fine; mirroring is not |
| D4 | Imported third-party games never leave the device as content: `publishValidator` rejects `format: 'tts-workshop'`, `prepareGameForServer` marks such snapshots private to that companion, the import dialog shows source URL, author and a rights notice | Steam Subscriber Agreement licenses UGC within Steam only; Catan/Elfenland scans are infringing regardless (Q21) |
| D5 | Renderer stays DOM + viewport culling; optimise (memo, precomputed membership sets, coalesced deltas) and **measure** at 800 widgets. Canvas rewrite only if p95 frame time stays > 16 ms afterwards | Avoid a rewrite without data |
| D6 | Per-seat intent authorization lands before any script may emit actions | Scripts act as the host; today any phone can `PATCH_WIDGETS` |
| D7 | `Custom_Model` → `CustomMesh.DiffuseURL` as sprite first; a top-down orthographic render of `MeshURL` + texture (three.js in a Worker, lazy chunk) only if the harness shows models in ≥ 20 % of corpus mods | Texture atlases often look wrong; measure before the heavier path |
| D8 | Lua runtime = `wasmoon` (Lua 5.4 WASM), pinned, lazy chunk loaded only when a game has scripts and the flag is on; fengari as documented fallback | ADR-0005 alternatives |
| D9 | Compatibility report shown in the import dialog and stored in the game JSON (`importReport`), so a player sees "setup button X not translated" at the table | Silent degradation is the current main failure |

## 4. Slices (one PR each; logic + tests first, UI last; components ≤ 250 lines)

| # | Slice | Scope | Acceptance | Effort | Depends on |
|---|---|---|---|---|---|
| 0 | Harness | §2 | Report JSON for the corpus; tier per mod | S–M | — |
| 1 | Parser fidelity | Unique ids on GUID repeats (`convertCard`, `convertBag`); face from `rotZ`, rotation from `rotY`; `3DText` → label widget; `ScriptingTrigger` dropped (kept as invisible zone id for slice 8); dense seats clamped to `maxPlayers`; all `TabStates` → rules; description from `Note` only; `labelKey` instead of German literals; snap hex detection from tile shape | Catan: 12 decks hold 274 cards; Elfenland starting-player card face up; no label "ScriptingTrigger"/"3DText"; unit tests per rule | S (≈ 8 small fixes) | — |
| 2 | Import report + script sidecar | `importReport` (per TTS type converted/degraded/dropped, scripts present, image hosts) in the game JSON and dialog; `scripts` sidecar (Global, per widget, `LuaScriptState`, `XmlUI`, `Tags`, `GMNotes`); read-only script viewer in the inspector | Report visible for both samples; sidecar round-trips through save/load | S–M | 1 |
| 3 | Assets | https rewrite for all hosts; per-device cache into `assetFiles` at import with progress; Worker/companion proxy allow-lists; dead-host marking; `Custom_Model` → `DiffuseURL` sprite else labelled token (same rule top-level and in bags) | Elfenland renders; offline reload shows cached images; Catan hexes show a texture | M | 1 |
| 4 | Rights and publishing | `publishValidator` rejects `tts-workshop`; `prepareGameForServer` private flag; dialog notice (source, author, rights); companion Path A downloads assets or leaves the TTS flow; BSON accepted on the companion | No imported game can reach the GitHub PR path; companion import equals browser import | S | 2 |
| 5 | Performance | `React.memo` on widget views; `filterBoardWidgets` precomputes in-deck/in-hand/in-bag sets once; `MOVE_WIDGET` coalesced (one delta per ≤ 50 ms, one undo step per drag); measurement script with 800 widgets | p95 frame ≤ 16 ms on a mid-range phone at 800 widgets; one undo entry per drag | S–M | — |
| 6 | Authorization | `acceptIntent`: editor actions host-only (or edit-mode token), `DRAW_CARD`/`PLAY_CARD_FROM_HAND` only for the own hand, reject `ownerSeat` patches from phones; hands redacted whenever sealing is possible, spectators always blanked | Tests: a phone cannot take over a hand or delete widgets; spectator rooms never receive faces | M | — |
| 7 | Routines++ | New ops `DEAL` (n to every seat), `TAKE_FROM_BAG`, `PLACE_IN_HOLDER`, `SET_STATE`, `TURN`, per-seat `COUNTER`; triggers `onDrop`, `onTurnStart`, `onEnterZone`, `onCounter`; `IF` with simple conditions; `NEXT_TURN` writes `seat.turn`; editor for triggers/conditions | Standard-cards and Liar's Dice starters express their setup as routines; VTT/PCIO imports map their trivial subset (closes Q15 part 1) | M | 6 |
| 8 | Lua → routine translator | `luaparse` static pass over the sidecar: `createButton{click_function}` → `ButtonWidget` + routine; `shuffle()`, `deal(n)`, `dealToColor`, `takeObject{position}`, `putObject`, `flip`, `setState`, `setName`, `broadcastToAll` → ops; everything else listed in `importReport.untranslated` with function names; coverage number per mod from the harness | ≥ 50 % of corpus setup buttons translated (harness metric); untranslated buttons visible but inert with a tooltip | M | 2, 7 |
| 9 | Lua runtime MVP (flag) | wasmoon in a Worker on the host; shim v1 (~40 functions): `getObjectFromGUID/getAllObjects/getObjectsWithTag`, position/rotation (inverse `projectPosition`), `flip/shuffle/deal/takeObject/putObject/getObjects/getQuantity`, name/description/GM notes, `getVar/setVar/call`, `createButton/editButton/clearButtons`, `broadcastToAll/printToAll/printToColor`, `Wait.time/frames/condition` on a host tick, `Player[color]`, `getSeatedPlayers`, `Turns`, `Notes`, `JSON`, `onLoad(script_state)/onSave`, events `onObjectDrop/onPickUp/onObjectEnterContainer/onObjectLeaveContainer/onObjectEnterScriptingZone/onPlayerTurn`; every mutation = one intent through `acceptIntent`; `LuaScriptState` persisted in table saves; instruction budget + timeout kill; unshimmed calls → report | A corpus mod with a scripted setup runs its `onLoad` and buttons on the host; phones see deltas only; killing the Worker leaves the table consistent | L | 6, 7, 8 |
| 10 | Shim growth by corpus | Add functions/events in harness top-N order; Lua-side `Vector`/`Color` libs vendored; `onObjectRandomize`, `onObjectDestroy`, `spawnObject(JSON)` → `ADD_WIDGET` | Tier C count rises each release; no tier regressions | ongoing | 9 |
| 11 | `Custom_Model` top-down render | Only if D7's threshold is met: OBJ + texture → orthographic PNG in a Worker at import | Catan hex tiles look like tiles | M | 3, harness data |
| 12 | `XmlUI` subset | Panels, text, buttons as overlay widgets bound to routines/Lua callbacks; everything else ignored and reported | Scoreboards/turn panels of corpus mods appear | M–L | 9 |

Not planned: physics, animations, AssetBundles, `WebRequest`, 3D camera, voice/chat.

## 5. Order and rough timeline

1. Slices 0, 1, 5 in parallel (independent) — ≈ 2 weeks. After this both sample games are playable by hand and the harness exists.
2. Slices 2, 3, 4, 6 — ≈ 2–3 weeks. Imports are honest (report), legal, cached and authorised.
3. Slice 7, then 8 — ≈ 3–4 weeks. Tier B for most flat mods; Q15 closed.
4. Slice 9 — ≈ 6–8 weeks MVP; 10 ongoing; 11–12 by data.

Each stage is shippable on its own; stopping after stage 3 is a valid product (setup automation without an interpreter).

## 6. Risks and mitigations

- **Most Workshop scripts are physics-centric** → the shim will miss calls; the report makes it visible, the translator keeps setup usable, the runtime is opt-in.
- **VM maintenance** (wasmoon single maintainer) → pinned version, vendored typings, fengari documented as drop-in fallback; the shim depends on a thin VM interface.
- **Host CPU/battery** on a phone acting as table → Worker, instruction budget, scripts paused when the tab is hidden.
- **Dead assets** (imgur purge, `cloud-3` 403) → cannot be fixed; report says "images unavailable (host)"; cached copies keep a once-working game working.
- **Legal takedowns** → nothing hosted by us; caches are per device; import dialog carries the notice; companion copies private.
- **Scope creep toward a TTS clone** → tiers and harness numbers decide; D-tier is rejected, not emulated.

## 7. Metrics to publish per release

Corpus size; mods per tier; median converted-object ratio; top 10 untranslated/unshimmed API functions; p95 frame time at 800 widgets; bundle size of the lazy script chunk.
