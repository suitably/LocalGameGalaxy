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

| File                  | Actions                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `deckReducer.ts`      | `SHUFFLE_DECK`, `DRAW_CARD`, `RETURN_CARD_TO_DECK`                             |
| `bagReducer.ts`       | `DRAW_FROM_BAG`                                                                |
| `pieceReducer.ts`     | `TAKE_PIECE_FROM_SUPPLY`, `PLAY_CARD_FROM_HAND`                                |
| `viewReducer.ts`      | `SCALE_WIDGETS`, `RESET_WIDGET_SCALE`, `SET_WIDGET_SHOW_ALWAYS`, hidden zones  |
| `tableToolReducer.ts` | `TOGGLE_TIMER`, `RESET_TIMER`, `SPIN_SPINNER` (rules in `logic/tableTools.ts`) |
| `editReducer.ts`      | `PATCH_WIDGETS`, `ADD_WIDGET`, `DELETE_WIDGETS`, `UPDATE_TABLE`                |
| `holderMembership.ts` | helper `removeFromHolderAndUpdateHand`                                         |

Holder positions (hand, stack, fan, grid) come from `logic/holderLayout.ts`.

## 2. Editor operations and undo

- `logic/widgetEdits.ts` — pure `patchWidgets` (never `id`/`type`), `addWidget`, `deleteWidgets` (a deck takes its cards; deleted widgets leave holders and decks), `cloneWidget`, `updateTable`.
- `logic/editHistory.ts` — `recordChange(history, before, after)` stores the forward delta and its inverse (`diffGame(after, before)`); `undoStep` / `redoStep` return the delta to dispatch as `APPLY_EDIT_DELTA`. Limit 100 entries.

## 3. Editor UI

`components/editor/` (mounted by `TabletopGame` for the TV host and local play): `TabletopEditor` wraps the surface, `EditorToolbar` (edit mode, undo/redo, add widget from `logic/widgetTemplates.ts`, table settings), `WidgetInspector` + `InspectorFields` (common and per-type fields, duplicate, delete), `WidgetJsonEditor` (raw JSON, parsed by `parseWidgetPatch`), `TableSettingsDialog`, `DeckBuilderDialog` (deck from image URLs or a spritesheet via `logic/deckBuilder.ts`, added with `ADD_WIDGETS`). State lives in `useTabletopEditor` (selection, history recorded while edit mode is on; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, Delete). `TableMotionStyles` (mounted by `TabletopEditor`) animates position changes of board widgets and replays a flip on cards (`data-card-flip`), respecting reduced motion. Selection works through `data-widget-id` on board widgets and holders, so the surface itself is unchanged.

## 4. Sync

Host-authoritative over `useMultiChannelSync`, see [sync-protocol](sync-protocol.md): non-host devices send `INTENT`s (every action except `LOAD_GAME`, `APPLY_REMOTE_DELTA`, `ANIMATE_CARD_TO_TABLE`, `FINISH_ANIMATION`), the host broadcasts `STATE_DELTA` (`logic/stateDelta.ts`) with a sequence number, gaps and joins get a `STATE_SNAPSHOT`. Random results are decided on the host.

## 5. Storage

`galaxy_tabletop_db` v3 (see [persistence](persistence.md)): `custom_games` for imported/edited definitions, `sessions` for running games. `useTabletopAutosave` saves 1 s after a change on the host or in local play; `TabletopGame` resumes a saved session first, `RestartGameButton` deletes it.
