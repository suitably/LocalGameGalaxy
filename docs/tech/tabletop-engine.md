---
type: Reference
title: 'Tabletop engine: reducer, edits, history, sync, storage'
description: 'How the tabletop game state changes: sub-reducers, editor actions, undo/redo deltas, host-authoritative sync and autosave.'
tags: [tabletop, reducer, editor, undo, sync, persistence]
status: stable
generated:
  at: 2026-10-21T23:45:00+02:00
  by: claude-code
verified:
  at: 2026-10-21
  method: 'Read src/games/tabletop/logic/{tabletopReducer,widgetEdits,editHistory,stateDelta,syncProtocol,tabletopStorage}.ts, logic/reducers/*, hooks/{useTabletopSync,useTabletopAutosave}.ts and their tests.'
sources:
  - 'src/games/tabletop/logic/tabletopReducer.ts'
  - 'src/games/tabletop/logic/reducers/'
  - 'src/games/tabletop/logic/widgetEdits.ts'
  - 'src/games/tabletop/logic/editHistory.ts'
  - 'src/games/tabletop/logic/stateDelta.ts'
  - 'src/games/tabletop/hooks/useTabletopSync.ts'
---

# Tabletop engine

Roadmap and comparison with VirtualTabletop: [2026-10-21 plan](../reports/2026-10-21-tabletop-vtt-plan.md) (epic #449).

## 1. Reducer

`logic/tabletopReducer.ts` holds the action union (`TabletopAction`) and the table actions (move, flip, rotate, snap to holder, counters, dice, animation, seats). Groups live in `logic/reducers/`:

| File                  | Actions                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `deckReducer.ts`      | `SHUFFLE_DECK`, `DRAW_CARD`, `RETURN_CARD_TO_DECK`                                           |
| `bagReducer.ts`       | `DRAW_FROM_BAG`                                                                              |
| `pieceReducer.ts`     | `TAKE_PIECE_FROM_SUPPLY`, `PLAY_CARD_FROM_HAND`                                              |
| `viewReducer.ts`      | `SCALE_WIDGETS`, `RESET_WIDGET_SCALE`, `SET_WIDGET_SHOW_ALWAYS`, hidden zones                |
| `tableToolReducer.ts` | `TOGGLE_TIMER`, `RESET_TIMER`, `SPIN_SPINNER`, `NEXT_STATE` (rules in `logic/tableTools.ts`) |
| `editReducer.ts`      | `PATCH_WIDGETS`, `ADD_WIDGET`, `DELETE_WIDGETS`, `UPDATE_TABLE`                              |
| `holderMembership.ts` | helper `removeFromHolderAndUpdateHand`                                                       |

Holder positions (hand, stack, fan, grid) come from `logic/holderLayout.ts`.

## 2. Editor operations and undo

- `logic/widgetEdits.ts` — pure `patchWidgets` (never `id`/`type`), `addWidget`, `deleteWidgets` (a deck takes its cards; deleted widgets leave holders and decks), `cloneWidget`, `updateTable`.
- `logic/editHistory.ts` — `recordChange(history, before, after)` stores the forward delta and its inverse (`diffGame(after, before)`); `undoStep` / `redoStep` return the delta to dispatch as `APPLY_EDIT_DELTA`. Limit 100 entries.

## 3. Button routines

`ButtonWidget.routine` is a JSON list of steps from a fixed vocabulary (`SHUFFLE`, `DRAW`, `ROLL`, `FLIP`, `MOVE`, `SET`, `COUNTER`, `TIMER`, `SPIN`, `NEXT_STATE`) — no expressions, no code. `logic/routines.ts` validates them (`parseRoutine`: unknown ops, missing fields, `SET` on `id`/`type`/`routine`, max 50 steps, max 60 draws) and maps them to ordinary actions (`routineToActions`). `RUN_ROUTINE` applies them in order, so a routine syncs as one intent, runs its random steps on the host and is undoable like any other edit. Edited in the inspector with `RoutineEditor`.

## 4. Editor UI

`components/editor/` (mounted by `TabletopGame` for the TV host and local play): `TabletopEditor` wraps the surface, `EditorToolbar` (edit mode, undo/redo, add widget from `logic/widgetTemplates.ts`, table settings), `WidgetInspector` + `InspectorFields` (common and per-type fields, duplicate, delete), `WidgetJsonEditor` (raw JSON, parsed by `parseWidgetPatch`), `TableSettingsDialog`, `DeckBuilderDialog` (deck from image URLs or a spritesheet via `logic/deckBuilder.ts`, added with `ADD_WIDGETS`). State lives in `useTabletopEditor` (selection, history recorded while edit mode is on; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, Delete). `ImageUploadButton` (inspector image, table background) stores uploaded images as WebP data URLs scaled to 512 px (`logic/imageUpload.ts`) — frontend-only, but every image travels with the game state through sync, so keep them few and small. `SelectionHandles` (portal into the table canvas) resizes (Shift keeps the aspect ratio) and rotates (15° steps, Alt for free) the selected widget and commits one `PATCH_WIDGETS` on release (`logic/handleMath.ts`). `TableMotionStyles` (mounted by `TabletopEditor`) animates position changes of board widgets and replays a flip on cards (`data-card-flip`), respecting reduced motion. Selection works through `data-widget-id` on board widgets and holders, so the surface itself is unchanged.

### Pass and play (local)

In local play (`?local=1`) `TabletopGame` mounts `components/views/TabletopPassAndPlay.tsx` on top of the editor: a "switch player" button covers the screen for the next seat (`modules/pass-and-play`), the cover can be pointed at another seat, and only the reveal dispatches `SELECT_SEAT` — so the hand dock and seat-only hidden zones never show the previous player's content to the next one. The seat chips (`PlayerSeatSelector`) are hidden in this mode (`hideSeatSelector`). Games with hand holders but no seat widgets (the built-in card deck, Liar's Dice) get one seat per hand owner (`seatsForHands` in `logic/seatLogic.ts`: `index` = `ownerSeat`, `hand` = the holder), added once with `ADD_WIDGETS`; `findPlayerHandHolder` prefers an exact `ownerSeat` match over the `index - 1` fallback.

## 5. Sync

Host-authoritative over `useMultiChannelSync`, see [sync-protocol](sync-protocol.md): non-host devices send `INTENT`s (every action except `LOAD_GAME`, `APPLY_REMOTE_DELTA`, `ANIMATE_CARD_TO_TABLE`, `FINISH_ANIMATION`), the host broadcasts `STATE_DELTA` (`logic/stateDelta.ts`) with a sequence number, gaps and joins get a `STATE_SNAPSHOT`. Random results are decided on the host.

### Private hands

Cards in a hand holder with an `ownerSeat` are private (`logic/handPrivacy.ts`). The host redacts them in every outgoing snapshot and delta (front replaced by the back, no label) and seals the real faces per seat (`logic/privateHandChannel.ts`, `logic/sealCrypto.ts`): each phone sends an ECDH P-256 public key with `REQUEST_SNAPSHOT` (`seat`, `publicKey`); the host derives an AES-GCM key per seat and sends its own public key in `STATE_SNAPSHOT` (`hostKey`, `sealed`). Only that seat's device can restore its cards. Limits: no device authentication (a participant could claim another seat), and without WebCrypto (plain-HTTP LAN origins) data passes unredacted as before.

## 6. Storage

`galaxy_tabletop_db` v3 (see [persistence](persistence.md)): `custom_games` for imported/edited definitions, `sessions` for running games. `useTabletopAutosave` saves 1 s after a change on the host or in local play; `TabletopGame` resumes a saved session first, `RestartGameButton` deletes it.

## 7. Import

- **Tabletop Simulator** (Workshop ID/URL or the mod's `.json`): `logic/steamWorkshopApi.ts` (metadata comes from the companion server if one is configured, else from the deploy's `/api/steam` worker — `cloudflare/worker.ts` — or the Vite dev proxy; a failing companion is reported with its reason: HTTP page vs HTTPS app, unreachable, token, HTTP status), `ttsParser.ts`, `ttsContainers.ts`.
- **VirtualTabletop / playingcards.io** (`.json`, `.vtt`, `.pcio`, `.zip` via the import dialog; archives bring their images): `logic/pcioParser.ts` (`pickStateJson` takes the first variant `0.json`, `readVttMeta` reads name, rules and player range from `_meta`), `pcioNormalizer.ts`, `vttWidgets.ts` (label, button, spinner, timer and dice keep their type; basic widgets with several `faces` become `states`). Not imported yet: routines (buttons arrive without one, [Q15](../open-questions.md)), per-seat hands and `onlyVisibleForSeat`, VTT's built-in `/i/…` images, other variants. Gaps and effort: [2026-10-22 plan §4](../reports/2026-10-22-table-session-plan.md#4-imports-found-on-the-way).
