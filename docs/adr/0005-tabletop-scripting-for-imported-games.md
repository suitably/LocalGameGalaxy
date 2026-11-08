---
type: Architecture Decision Record
title: 'ADR-0005: Scripting model for imported tabletop games'
description: 'Declarative routines are the only executable model the tabletop persists and syncs; Workshop Lua runs host-only in a sandboxed VM that may only emit reducer actions; no in-page JS plugin API for third-party content.'
resource: src/games/tabletop/
tags: [adr, tabletop, scripting, lua, routines, tts-import, security]
status: stable
generated:
  at: 2026-11-08T22:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-08
  method: 'Read src/games/tabletop/logic/{types.ts,routines.ts,tabletopReducer.ts,syncProtocol.ts,ttsParser.ts,ttsTypes.ts}, hooks/useTabletopSync.ts, cloudflare/worker.ts; research brief in docs/reports/2026-11-08-melodiq-notes-and-tabletop-analysis.md §3'
sources:
  - 'src/games/tabletop/logic/types.ts'
  - 'src/games/tabletop/logic/routines.ts'
  - 'src/games/tabletop/logic/syncProtocol.ts'
  - 'docs/reports/2026-11-08-melodiq-notes-and-tabletop-analysis.md'
  - 'docs/reports/2026-11-08-tts-compatibility-plan.md'
---

# ADR-0005: Scripting model for imported tabletop games

## Status

Accepted 2026-11-08 (maintainer instruction: decide by best practice). Resolves [open question Q15](../open-questions.md) and slice 9 of the [2026-10-21 tabletop plan](../reports/2026-10-21-tabletop-vtt-plan.md). Implementation plan: [2026-11-08 TTS compatibility plan](../reports/2026-11-08-tts-compatibility-plan.md).

## Context

- The Spieltisch imports Tabletop Simulator (TTS) Workshop saves and VirtualTabletop/PlayingCards.io files. TTS saves carry Lua (`LuaScript`, `LuaScriptState`, `XmlUI`) on the table and on every object; VirtualTabletop carries JSON routines; PlayingCards.io carries automation steps. Today all of it is dropped (`ttsTypes.ts:93-96`, "ignored for import"), so imported games are static pictures and setup buttons do nothing.
- The table is **host-authoritative**: phones send intents, the host applies the pure reducer and broadcasts `STATE_DELTA` with a sequence number (`syncProtocol.ts`, `useTabletopSync.ts`). Undo, redaction of hidden hands and autosave all work on reducer actions and deltas.
- A 10-op declarative routine model already exists (`RoutineStep` in `types.ts:234-244`, `RUN_ROUTINE`, `routines.ts`).
- Workshop scripts are untrusted third-party code. Most of the TTS API is 3D/physics (positions, zones, collisions); a 2D table can honour only a subset.

## Decision

1. **Declarative routines are the canonical executable model.** Everything the table persists, syncs, undoes and shows in the editor is a `RoutineStep[]` with triggers and conditions (extended per the plan). Game JSON never contains executable code that the reducer runs directly.
2. **Workshop Lua is an adapter, not a model.** Lua scripts are kept verbatim in a per-game sidecar (`scripts` field: Global + per widget, `LuaScriptState`, `XmlUI`, `Tags`, `GMNotes`) for a viewer and for translation.
   - First a **static translator** (`luaparse`) turns straight-line idioms (`createButton`, `shuffle`, `deal`, `takeObject`, `flip`, state toggles) into routines; untranslated functions go into the import report.
   - Then a **runtime**: Lua 5.4 via `wasmoon`, lazy-loaded chunk, executed **only on the host**, inside a Web Worker, behind a feature flag. The TTS API shim may only emit existing reducer actions (`MOVE_WIDGET`, `SHUFFLE_DECK`, `DRAW_CARD`, `ADD_WIDGET`, `NEXT_STATE`, …) through the same intent path a phone uses. Clients never run Lua; they receive deltas.
   - Sandbox: whitelisted libraries only (`string`, `table`, `math`, `coroutine`, `JSON`, shim); `debug.sethook` instruction budget per coroutine; Worker terminated on timeout; `WebRequest`, `io`, `os`, `require` absent; unshimmed calls log to the report instead of throwing.
   - Determinism: randomness (`math.random`, shuffle order, dice) is decided on the host and travels in the delta, as for every other action.
3. **No in-page JavaScript plugin API for third-party content.** Lua in a WASM VM is a sandbox by construction; JS from the Workshop would need an iframe/CSP sandbox and still share the origin's attack surface. A JS API may later serve first-party games; it is out of scope for imports.
4. **Scripts need authorization first.** Per-seat intent authorization in `acceptIntent` (editor actions host-only, draws only into the own hand, no `ownerSeat` patches from phones) lands before any script may emit actions.
5. **Content stays runtime-only.** Workshop saves and assets are fetched on the user's device on the user's request (browser direct, the existing Cloudflare Worker `/api/steam/*`, or the companion); cached per device in IndexedDB; never bundled, never published from the app (`format: 'tts-workshop'` is rejected by `publishValidator`), and companion copies are private to that server (see [Q21](../open-questions.md)).

## Alternatives considered

- **Routines only, no interpreter**: safe and cheap, but scripted Workshop games would never progress beyond setup buttons. Kept as the first stage and as the fallback when the runtime is off.
- **Lua VM first, routines later**: would make the VM the only path for VTT/PCIO automations too and leave the editor without an authorable model. Rejected.
- **fengari (Lua 5.3 in JS)**: smaller (~69 KB gz) but ~25× slower, 32-bit integers, no `__gc`; acceptable as a fallback VM if wasmoon's maintenance stalls. Both are low-cadence single-maintainer projects — pinned versions, vendored types.
- **Transpiling Lua to JS**: no maintained projects; coroutines and metatables translate poorly.
- **Running scripts on every device**: breaks determinism and redaction; rejected.
- **Full TTS fidelity (3D, physics, AssetBundles, `XmlUI`)**: out of scope; such mods are rejected with a report badge.

## Consequences

**Positive**: one executable model for the editor, VTT/PCIO imports and Workshop translation; sync, undo, redaction and autosave unchanged; runtime isolated and optional (bundle grows only when a scripted mod is opened); coverage can be measured and grown by corpus data instead of API completeness.

**Negative**: two code paths for Lua (translator + runtime) until the runtime proves itself; most physics-centric mods will still fail; dependency on a small-community VM; the host device carries the script CPU load.

**Follow-ups**: `docs/tech/tabletop-engine.md` gains a "Routines and scripts" section when the first slice lands; the compatibility harness report is the gate for growing the shim.
