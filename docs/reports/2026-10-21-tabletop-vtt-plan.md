---
type: Report
title: 'Tabletop: path to a VirtualTabletop-style editor, frontend-only'
description: 'Audit of src/games/tabletop against VirtualTabletop.io (data model, editor, sync, TTS import) and the ordered slice plan that came out of it.'
tags: [tabletop, editor, sync, tts-import, architecture, plan]
status: stable
generated:
  at: 2026-10-21T23:30:00+02:00
  by: claude-code
verified:
  at: 2026-10-21
  method: 'Read src/games/tabletop (logic/*, hooks/*, components/*), server/src/plugins/tabletop, scripts/*baselines.json; read the VirtualTabletop README, wiki (Widgets, Functions, Internals, Edit Mode) and server/room.mjs, client/js/widgets/widget.js, client/js/editor/sidebar/undo.js, LICENSE via the web.'
sources:
  - 'src/games/tabletop/logic/types.ts'
  - 'src/games/tabletop/logic/tabletopReducer.ts'
  - 'src/games/tabletop/hooks/useTabletopSync.ts'
  - 'src/games/tabletop/logic/ttsParser.ts'
  - 'src/games/tabletop/logic/steamWorkshopApi.ts'
  - 'https://github.com/ArnoldSmith86/virtualtabletop'
---

# Tabletop: path to a VirtualTabletop-style editor (2026-10-21)

Goal from the maintainer: the tabletop should work like [VirtualTabletop](https://github.com/ArnoldSmith86/virtualtabletop) — in-app editor, better and more modern presentation, frontend-only — and Tabletop Simulator (TTS) games should import better.

## 1. Where we are

| Area        | State on `main`                                                                                                                                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data model  | 8 widget types (`card, deck, holder, token, die, counter, seat, bag`) in `logic/types.ts`; game = `widgets: Record<id, widget>` + table, hidden zones, assets.                                                                                                                                                                                              |
| Reducer     | `tabletopReducer.ts` (945 lines, 23 actions). Not deterministic: shuffle, die roll and bag spawn ids use `Math.random`/`Date.now` inside the reducer.                                                                                                                                                                                                       |
| Sync        | `useTabletopSync.ts` over `useMultiChannelSync` (BroadcastChannel + MQTT). **Bug:** only `RETURN_TO_LOBBY` and `FLICK_CARD_TO_TABLE` are sent; moves, draws, rolls and counter changes stay local, the host never re-sends snapshots → devices drift apart.                                                                                                 |
| Persistence | Raw IndexedDB `galaxy_tabletop_db` (game definitions only, assets stripped). No autosave/resume of a running game.                                                                                                                                                                                                                                          |
| Rendering   | DOM + MUI (`components/surface/*`, `components/widgets/*`), viewport culling. No zoom/pan model of its own.                                                                                                                                                                                                                                                 |
| Editor      | Metadata only (`EditGameDialog.tsx`); scale/show-always via context menu. No create/delete/duplicate, no property inspector, no JSON editor, no undo.                                                                                                                                                                                                       |
| TTS import  | Decks, cards, dice, hand zones, boards, tokens, snap points, lock, rules tab, spritesheets. **Gaps:** bags become decks (bag code is dead), no `States`, `Custom_Tile` shapes, decals, fog of war, `Custom_Model`/AssetBundle; Steam metadata needs the server or the dev proxy (fails in a production build without server); server BSON path returns 400. |
| Server      | Optional: local game folders, media, Workshop download. Everything else already runs in the browser.                                                                                                                                                                                                                                                        |

## 2. What to take from VirtualTabletop

- **One flat widget map + deltas** (`{widgetId: {prop: value}}`, `null` deletes): the same shape for sync, undo and editor. Our `Record<id, widget>` already fits; what is missing is a generic `PATCH_WIDGETS` action and inverse deltas.
- **Editor**: edit-mode toggle, selection handles (move/resize/rotate/clone), generated property panel, per-widget JSON editor, add-widget palette, deck editor, room-wide undo history.
- **Holders/piles/seats**: auto-aligned children, piles when cards overlap, seats with colour/turn linked to a hand holder.
- **Table scaling**: fixed logical table (VTT: 1600×1000), scaled to the viewport with CSS transforms; zoom separate.
- **Not to copy**: hidden hands are only hidden by CSS there (every client has the full state). With a host peer we can send each seat a filtered snapshot instead.
- **License**: VirtualTabletop is **GPL-3.0**. Copying its code would put Nexumia under GPLv3. We take ideas and the JSON format (import), not code.

## 3. Target architecture (frontend-only)

- **Host-authoritative intents**: clients send intents (`MOVE_WIDGET`, `DRAW_CARD`, …); the host applies them with the pure reducer and broadcasts the resulting delta with a sequence number. Random results (shuffle order, roll value, new ids) are decided once by the host and carried in the delta, so the reducer becomes deterministic.
- **Transport**: keep `useMultiChannelSync` (BroadcastChannel + MQTT); WebRTC data channel later as an option. Late joiners and gaps → snapshot.
- **Privacy**: the host filters hand/hidden-zone contents per seat before sending.
- **Storage**: running games autosave to IndexedDB (via `src/modules/async-game`), assets as blobs.
- **Server stays optional** for local folders and Workshop downloads; frontend fallbacks for everything else (file import, paste URL/JSON).

## 4. Slice plan

Each slice is one PR (logic + tests first, UI last, components ≤ 250 lines).

1. **Sync fix** — intents + host-applied deltas, random values decided by the host, snapshot on join/gap. Fixes the drift bug. _(foundation for everything below)_
2. **Autosave/resume** of a running game in IndexedDB.
3. **Generic widget deltas** — `PATCH_WIDGETS` / `ADD_WIDGET` / `DELETE_WIDGET` with inverse deltas; split the reducer into deck/bag, holder, zone and scale sub-reducers (#414 follow-up).
4. **Undo/redo** on top of inverse deltas.
5. **Editor v1** — edit mode, selection with move/resize/rotate, property inspector, add/clone/delete, per-widget JSON editor, table size/background.
6. **Editor v2** — deck builder (images, spritesheets, card backs), asset panel (blobs).
7. **Presentation** — logical table size scaled with CSS transforms, zoom/pan, flip/move animations, holder auto-layout and piles, seat colours.
8. **TTS import** — real `BagWidget`s (revives `DRAW_FROM_BAG`), `States`, `Custom_Tile` shapes, fog-of-war → hidden zones, Steam metadata without server (manual URL/JSON paste), BSON on the server, i18n for hard-coded German import errors.
9. **More widget types** (later): spinner, timer, label, button; routines only after a design decision (scope and security of a scripting language).
10. **VirtualTabletop/PCIO JSON import** next to the existing `pcioNormalizer.ts` (format only, no code reuse).

Smaller cleanup found on the way: two `HandCardItem.tsx` copies (controller/ and surface/), client and server both fetch Steam details.
