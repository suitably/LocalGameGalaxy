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
  at: 2026-10-27
  method: 'Read logic/{hiddenZoneRedaction,privateHandChannel,handPrivacy}.ts, hooks/useTabletopSelection.ts, components/surface/{BoardDragOverlay,DockDragOverlay,FlyingCardsLayer,ObscuredPlaceholder}.tsx (hidden zones, #551); logic/{gameSource,gameSourceLoaders}.ts, components/saves/TemplateActions.tsx, TabletopGame.tsx (local default templates, #547); hooks/useTableSaves.ts, logic/saveNames.ts, components/saves/* (named saves, #538); logic/tableGestures.ts, hooks/{useTabletopEngine,usePanPinch,sourcePress,useTableKeyShortcuts}.ts, components/surface/SurfaceContextMenu.tsx (gestures); logic/{handFan,seatLogic}.ts, hooks/useSeatView.ts, components/surface/{HandDockStrip,HandFan,CardZoomDialog}.tsx (hand dock, spectators); logic/zOrder.ts, reducers/viewReducer.ts (z-order); src/games/tabletop/logic/{tabletopReducer,widgetEdits,editHistory,stateDelta,syncProtocol,tabletopStorage,tabletopServerApi,serverGameSnapshot}.ts, hooks/useGameManager.ts, logic/reducers/*, hooks/{useTabletopSync,useTabletopAutosave}.ts and their tests.'
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

| File                  | Actions                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deckReducer.ts`      | `SHUFFLE_DECK`¹, `DRAW_CARD`, `RETURN_CARD_TO_DECK`                                                                                                           |
| `bagReducer.ts`       | `DRAW_FROM_BAG`                                                                                                                                               |
| `pieceReducer.ts`     | `TAKE_PIECE_FROM_SUPPLY`, `PLAY_CARD_FROM_HAND`                                                                                                               |
| `viewReducer.ts`      | `SCALE_WIDGETS`, `RESET_WIDGET_SCALE`, `SET_WIDGET_SHOW_ALWAYS`, `SET_Z_ORDER`, hidden zones (`MOVE_HIDDEN_ZONE`, `RESIZE_HIDDEN_ZONE`, `TOGGLE_ZONE_REVEAL`) |
| `tableToolReducer.ts` | `TOGGLE_TIMER`, `RESET_TIMER`, `SPIN_SPINNER`, `NEXT_STATE` (rules in `logic/tableTools.ts`)                                                                  |
| `editReducer.ts`      | `PATCH_WIDGETS`, `ADD_WIDGET`, `DELETE_WIDGETS`, `UPDATE_TABLE`                                                                                               |
| `holderMembership.ts` | helper `removeFromHolderAndUpdateHand`                                                                                                                        |

¹ `SHUFFLE_DECK` also counts `DeckWidget.shuffleCount`; the change syncs like any delta and `components/widgets/DeckShuffleOverlay.tsx` plays a short riffle above the deck on every device (none with reduced motion, #556).

Holder positions (hand, stack, fan, grid) come from `logic/holderLayout.ts`.

### Stacking order

`logic/zOrder.ts` holds the pure rules on `zIndex` (widgets without a `parent` only). `MOVE_WIDGET` without an explicit `zIndex` puts the moved widget above all others, unless it has `keepZOrder` (editor checkbox "Keep layer when moved", e.g. labels above pieces) (`raiseWidget`; the stack is renumbered to 1..n once it passes `Z_RENUMBER_LIMIT`, so it stays below hidden zones). `SET_Z_ORDER { widgetIds, op }` (`front`, `forward`, `backward`, `back`) comes from the widget context menu (`WidgetContextMenu`; a widget inside the selection moves the whole selection) and from Ctrl/Cmd+`]`/`[` (Shift: front/back, `hooks/useZOrderShortcuts.ts`, acts on the selection). Forward/backward pass the next overlapping widget (bounding boxes, rotation ignored); front/back go past all. An explicit send to back sticks until that widget is moved again. Only `zIndex` values change, so it syncs as an ordinary intent and delta. The editor's selection (`selectedId`) gets the same shortcuts (`useTabletopEditor`; whichever handler runs first marks the key event handled, so a widget is never reordered twice). On touch, a 500 ms press without moving opens the context menu too (`hooks/useTouchLongPress.ts` on `BoardWidgetRenderer`), because iOS Safari sends no `contextmenu`; a native one cancels it.

## 2. Editor operations and undo

- `logic/widgetEdits.ts` — pure `patchWidgets` (never `id`/`type`), `addWidget`, `deleteWidgets` (a deck takes its cards; deleted widgets leave holders and decks), `cloneWidget`, `updateTable`.
- `logic/editHistory.ts` — `recordChange(history, before, after)` stores the forward delta and its inverse (`diffGame(after, before)`); `undoStep` / `redoStep` return the delta to dispatch as `APPLY_EDIT_DELTA`. Limit 100 entries.

## 3. Button routines

`ButtonWidget.routine` is a JSON list of steps from a fixed vocabulary (`SHUFFLE`, `DRAW`, `ROLL`, `FLIP`, `MOVE`, `SET`, `COUNTER`, `TIMER`, `SPIN`, `NEXT_STATE`) — no expressions, no code. `logic/routines.ts` validates them (`parseRoutine`: unknown ops, missing fields, `SET` on `id`/`type`/`routine`, max 50 steps, max 60 draws) and maps them to ordinary actions (`routineToActions`). `RUN_ROUTINE` applies them in order, so a routine syncs as one intent, runs its random steps on the host and is undoable like any other edit. Edited in the inspector with `RoutineEditor`.

## 4. Editor UI

`components/editor/` (mounted by `TabletopGame` for the TV host and local play): `TabletopEditor` wraps the surface, `EditorToolbar` (edit mode, undo/redo, add widget from `logic/widgetTemplates.ts`, table settings), `WidgetInspector` + `InspectorFields` (common and per-type fields, duplicate, delete), `WidgetJsonEditor` (raw JSON, parsed by `parseWidgetPatch`), `TableSettingsDialog`, `DeckBuilderDialog` (deck from image URLs or a spritesheet via `logic/deckBuilder.ts`, added with `ADD_WIDGETS`). State lives in `useTabletopEditor` (selection, history recorded while edit mode is on; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, Delete). `ImageUploadButton` (inspector image, table background) stores uploaded images as WebP data URLs scaled to 512 px (`logic/imageUpload.ts`) — frontend-only, but every image travels with the game state through sync, so keep them few and small. `SelectionHandles` (portal into the table canvas) resizes (Shift keeps the aspect ratio) and rotates (15° steps, Alt for free) the selected widget and commits one `PATCH_WIDGETS` on release (`logic/handleMath.ts`). `TableMotionStyles` (mounted by `TabletopEditor`) animates position changes of board widgets and replays a flip on cards (`data-card-flip`), respecting reduced motion. Selection works through `data-widget-id` on board widgets and holders, so the surface itself is unchanged.

### Hidden zones

A hidden zone (`HiddenZone`, `logic/hiddenZoneLogic.ts`) belongs to one seat (`ownerSeat`). Other seats see widgets whose center lies inside a non-revealed zone only as an inert placeholder (`getHiddenWidgetIds` → `hooks/useObscuredWidgetIds.ts` → `BoardWidgetRenderer` `obscured`); the owner always sees them, `revealed: true` shows them to everyone, `showAlways` widgets are never obscured. In edit mode the owner drags and resizes the zone (`components/surface/useHiddenZoneEditing.ts`); `MOVE_HIDDEN_ZONE` moves contained widgets in the same reducer step (one undo step) except locked ones (`isWidgetLocked`: `pinned` or `movable === false`), and `RESIZE_HIDDEN_ZONE` clamps to `MIN_ZONE_SIZE` and the table. The in-zone eye toggle (`HiddenZoneControls.tsx`) dispatches `TOGGLE_ZONE_REVEAL`. The same placeholder (`components/surface/ObscuredPlaceholder.tsx`) replaces such a widget in the board drag overlay (`BoardDragOverlay` `obscured`), the dock drag overlay (`DockDragOverlay` `obscured`) and card flights to or from it (`FlyingCardsLayer` `obscuredIds`); `useTabletopSelection({ obscuredIds })` never selects it (shift-click, selection mode, `selectAll`) and drops it from the selection once it enters a zone (#551). Over the network the host redacts it too, see [Hidden zones on the wire](#hidden-zones-on-the-wire).

### Pass and play (local)

In local play (`?local=1`) `TabletopGame` mounts `components/views/TabletopPassAndPlay.tsx` on top of the editor: a "switch player" button covers the screen for the next seat (`modules/pass-and-play`), the cover can be pointed at another seat, and only the reveal dispatches `SELECT_SEAT` — so the hand dock and seat-only hidden zones never show the previous player's content to the next one. The seat chips (`PlayerSeatSelector`) are hidden in this mode (`hideSeatSelector`). Games with hand holders but no seat widgets (the built-in card deck, Liar's Dice) get one seat per hand owner (`seatsForHands` in `logic/seatLogic.ts`: `index` = `ownerSeat`, `hand` = the holder), added once with `ADD_WIDGETS`; `findPlayerHandHolder` prefers an exact `ownerSeat` match over the `index - 1` fallback. The first seat is selected (`SELECT_SEAT`) as soon as the seats exist, and "switch player" rotates through the seats only; the cover can also be pointed at the spectator.

### Seats, spectators and the hand dock

`resolveSeatView(widgets, currentSeatId)` (`logic/seatLogic.ts`, hook `hooks/useSeatView.ts`) is the one place that decides the viewer's seat and hand: the chosen seat, else the first seat; the seat's `hand` link, else `findPlayerHandHolder` by index (index 0 included). `TabletopSurface` passes that hand to `useTabletopEngine` (`handHolderId`: tap on a deck, drop on the dock) and `HandDockStrip` shows the same hand, so a draw always lands in the hand the dock shows. `currentSeatId === SPECTATOR_SEAT_ID` (`'spectator'`; eye chip in `PlayerSeatSelector`, or the pass-and-play cover) is a spectator: no hand, the engine gets `canDraw: false` (decks move like ordinary widgets), the dock shows a note. On phones, `role=spectator` opens `TabletopControllerView` with `mySeat: null` (no hand, no decks to draw from, no seat key for private hands); the party lobby hands it out: a non-host player switches "Zuschauen" on in the roster (`PartyPlayer.spectator`, `setSpectator` in `universalPartyManager`; no `slot`, `getGameRoute({ spectator })` adds `role=spectator`). Spectators are read-only: `acceptIntent` (`logic/syncProtocol.ts`) makes the host reject every synced intent from a spectator. The host decides that with `senderIsSpectator`: phones send their party player id (`playerId` in `REQUEST_SNAPSHOT` and `INTENT`), and with a party roster for the room only a listed member without `PartyPlayer.spectator` may play, so a client cannot opt out by leaving the flag off; the sender's own `spectator` flag can only restrict, and without a party it alone decides (#550); `useTabletopSync({ spectator })` sends none, and `TabletopSurface`/`TabletopControllerView` get `readOnly` (`useSeatView` returns a no-op `dispatch`: no drag, flip, context menu, roll, counters, selection tools). Players keep tap-to-roll.

The dock (`HandDockStrip` → `HandFan`) lays the hand out as an overlapping, slightly arced fan (`fanLayout` in `logic/handFan.ts`: cards spread while there is room, overlap down to a 22 px strip, then scroll; `handSlots` keeps stacks of identical cards as one slot with a count). A tap on a card opens `CardZoomDialog` for that card (play to the table centre, return to deck), the zoom button in `HandDockHeader` opens the whole hand; a drag still plays the card where it is dropped. The phone controller's `CardHandDock` uses the same overlap and zoom dialog and draws into its own hand (`myHolders[0]`).

### Table gestures

Pure rules in `logic/tableGestures.ts`, pointer handling in `hooks/useTabletopEngine.ts` (pan and pinch in `hooks/usePanPinch.ts`, deck/bag presses in `hooks/sourcePress.ts`). Decks with cards and non-empty or infinite bags are _sources_ (`sourceKind`; never for spectators):

| Gesture                                 | Deck                                                                               | Bag                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tap                                     | top card into the viewer's hand                                                    | item next to the bag (`DRAW_FROM_BAG`)                           |
| Drag                                    | top card follows the pointer, face down unless the pile is open (`deckShowsFront`) | an item (infinite bag: a clone with a fresh `spawnedId`) follows |
| Long press (`LONG_PRESS_MS`), then drag | the whole deck moves                                                               | the whole bag moves                                              |
| Long press, release without moving      | context menu                                                                       | context menu                                                     |

`DRAW_CARD` takes `faceUp` with a `position`. Flipping a card: F, double tap, or the context menu (`flipActionFor`). Shuffling a deck and rolling a die are one action (`shakeActionFor`): S, shaking while dragging (`createShakeTracker`: four direction changes of at least 18 px within 900 ms), or the context menu. Keys act on the dragged widget, else the one under the pointer (`hooks/useTableKeyShortcuts.ts`). Dragging a die never rolls it (`DieWidgetView` ignores the click after a drag); a tap still rolls. The context menu (`SurfaceContextMenu`) also carries the z-order entries again. While a deck or bag is pressed the native touch context menu is suppressed (`isPressingSource`).

### Spieltisch (lobby)

`components/views/TabletopLobbyView.tsx` is the entry for all table games: the built-in tabletop games, the dice games (Kniffel, Knister, Qwixx; `Hub.tsx` hides them from the hub) and imported games, from `logic/tableCatalog.ts`. A game with one supported mode opens directly; otherwise `PlayModeSheet` asks: **Ein Gerät für alle** (`?local=1`, pass and play) or **Jeder am eigenen Gerät** (`/party?launch=tabletop&gameId=…`: the party lobby shows the chosen game, `PartyPendingGame`, and the host starts it once players have joined). Dice games are one-device only until they sync (#467 slice 5).

## 5. Sync

Host-authoritative over `useMultiChannelSync`, see [sync-protocol](sync-protocol.md): non-host devices send `INTENT`s (every action except `LOAD_GAME`, `APPLY_REMOTE_DELTA`, `ANIMATE_CARD_TO_TABLE`, `FINISH_ANIMATION`), the host broadcasts `STATE_DELTA` (`logic/stateDelta.ts`) with a sequence number, gaps and joins get a `STATE_SNAPSHOT`. Random results are decided on the host.

### Private hands

Cards in a hand holder with an `ownerSeat` are private (`logic/handPrivacy.ts`). The host redacts them in every outgoing snapshot and delta (front replaced by the back, no label) and seals the real faces per seat (`logic/privateHandChannel.ts`, `logic/sealCrypto.ts`): each phone sends an ECDH P-256 public key with `REQUEST_SNAPSHOT` (`seat`, `publicKey`); the host derives an AES-GCM key per seat and sends its own public key in `STATE_SNAPSHOT` (`hostKey`, `sealed`). Only that seat's device can restore its cards. Limits: no device authentication (a participant could claim another seat), and without WebCrypto (plain-HTTP LAN origins) data passes unredacted as before.

### Hidden zones on the wire

The host keeps the full state and redacts only what it sends (`logic/hiddenZoneRedaction.ts`, applied by `PrivateHandChannel.outgoingSnapshot` / `outgoingDelta`, #551). `zoneAudience` gives the seats that may see a widget hidden by zones: the owners of the non-revealed zones around it that no other zone hides it from (none for a zone without `ownerSeat`); `null` means no zone hides it (revealed zone, `showAlways`, the board). In every `STATE_SNAPSHOT` and `STATE_DELTA` such a widget keeps only geometry and structure (`redactHiddenWidget`: position, size, z-order, parent/child ids, …; face, image, label, text, colours and routines are removed or blanked), and each seat of the audience gets it back as a secret in its sealed box, as the hand rules let that seat see it (`redactZoneWidgets` runs on top of the hand redaction, and a hand owner outside the audience loses its card face for that widget). Spectators and devices without a seat get no box, so they see no hidden zone. When zones change (revealed, hidden again, moved, resized, removed, new owner), `withZoneVisibilityChanges` adds every widget whose audience changed to the delta, so a revealed zone delivers the real data again. Zone redaction runs whenever the host has WebCrypto, even before any seat registered; without WebCrypto data passes unredacted, as for hands.

## 6. Storage

`galaxy_tabletop_db` v5 (see [persistence](persistence.md)): `custom_games` for imported/edited definitions, `sessions` for running games, `named_saves` for named table states, `local_templates` for this device's default templates. `useTabletopAutosave` saves 1 s after a change on the host or in local play; `RestartGameButton` deletes the session.

**Game loading.** `TabletopGame` calls `resolveTableGame` (`logic/gameSource.ts`, sources from `createGameSourceLoaders` in `logic/gameSourceLoaders.ts`): a saved session first, else the original game — `custom_games` (origin `device`), `public/games/tabletop/<id>.json` (`starter`), the companion server (`server`). The resolved `TableOrigin` goes to `SaveStateButton`; for a resumed session only the origin is probed, the server game is not loaded.

**Named saves (#538).** `SaveStateButton` (host and local play, next to restart) opens `components/saves/SaveStateDialog.tsx`, driven by `hooks/useTableSaves.ts`: save the running table under a name on this device (`named_saves`, always allowed) or on the companion server (`POST/PUT /api/tabletop/saves[/:id]`, needs the API key permission `allowTabletopSaves`), and load or delete saves of the running game. Loading dispatches `LOAD_GAME` with the running game's id, so autosave and resume continue on the same table and the host's sync broadcasts the new state. Names are unique per game (trimmed, case-insensitive, `logic/saveNames.ts`); a taken name offers "name (2)", one of the player's own saves can be overwritten. Server saves record the owner (API key name, or "Master"); everyone can load them and save a copy under their own name, only the owner overwrites or deletes (the "Only mine" switch filters the list). With `allowTabletopTemplates`, "Save as default template" stores the table as the server game's start state (`PUT /api/tabletop/games/:id/template`, served by `GET …/raw` instead of the game file). Device-only and starter games (#547, [Q19](../open-questions.md)) get "Save as default (this device)" and, once one exists, "Reset to original" instead (`components/saves/TemplateActions.tsx`): the table is stored in `local_templates` keyed by game id (`putLocalTemplate`), and a new table of that game starts from it; reset deletes it (`deleteLocalTemplate`), so the original loads again. The original stays untouched in `custom_games` or the starter JSON. A local template never applies to a server game, and deleting a device game also deletes its template. The server template button is hidden for these games.

With a companion server, the game manager (`hooks/useGameManager.ts`) lists the server's games and, below, the games only on this device. "Save to server" moves a device game into the server library (`logic/tabletopServerApi.ts` → `POST /api/tabletop/games`); editing a saved server game overwrites it (`PUT`), editing a read-only one saves a copy. Before upload `logic/serverGameSnapshot.ts` turns `blob:` and `/tabletop/media?…&token=` URLs into data URLs and unwraps `/tabletop/proxy-image`, so a stored `game.json` holds no token. Games in this app's own format load from the server as they are, keyed by the server id (`parseServerGame`); other formats go through the importer.

## 7. Import

- **Tabletop Simulator** (Workshop ID/URL or the mod's `.json`): `logic/steamWorkshopApi.ts` (metadata comes from the companion server if one is configured, else from the deploy's `/api/steam` worker — `cloudflare/worker.ts` — or the Vite dev proxy; a failing companion is reported with its reason: HTTP page vs HTTPS app, unreachable, token, HTTP status), `ttsParser.ts`, `ttsContainers.ts`.
- **VirtualTabletop / playingcards.io** (`.json`, `.vtt`, `.pcio`, `.zip` via the import dialog; archives bring their images): `logic/pcioParser.ts` (`pickStateJson` takes the first variant `0.json`, `readVttMeta` reads name, rules and player range from `_meta`), `pcioNormalizer.ts`, `vttWidgets.ts` (label, button, spinner, timer and dice keep their type; basic widgets with several `faces` become `states`). Not imported yet: routines (buttons arrive without one, [Q15](../open-questions.md)), per-seat hands and `onlyVisibleForSeat`, VTT's built-in `/i/…` images, other variants. Gaps and effort: [2026-10-22 plan §4](../reports/2026-10-22-table-session-plan.md#4-imports-found-on-the-way).
