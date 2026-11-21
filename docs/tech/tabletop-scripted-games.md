---
type: Reference
title: 'Tabletop: scripted card games (Schwimmen, Durak, Arschloch, Skat, Mau-Mau)'
description: 'Card games with enforced rules on the Spieltisch: the rule-script contract, the session reducer, the TV table and phone views, sync and storage, and the house rules of each game.'
resource: src/games/tabletop/scripted/
tags: [tabletop, cards, scripted, skat, durak, schwimmen, arschloch, maumau, sync]
status: stable
generated:
  at: 2026-11-16T16:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-21
  method: 'Wrote and read src/games/tabletop/scripted/**, TabletopEntry.tsx, logic/tableCatalog.ts; ran the Vitest suites in scripted/logic/__tests__; played Skat, Durak, Schwimmen and Arschloch locally and a Durak room (host table + two player tabs) in headless Chromium.'
sources:
  - 'src/games/tabletop/scripted/logic/scriptTypes.ts'
  - 'src/games/tabletop/scripted/logic/session.ts'
  - 'src/games/tabletop/scripted/components/CardTable.tsx'
  - 'src/games/tabletop/TabletopEntry.tsx'
  - 'src/games/tabletop/scripted/logic/scriptExport.ts'
---

# Scripted card games

The free tabletop ([tabletop-engine](tabletop-engine.md)) moves widgets and knows no rules. Scripted card games are first-party TypeScript rule scripts: the app deals, accepts only legal moves, keeps the turn order and scores. They live in `src/games/tabletop/scripted/` and are listed on the Spieltisch under "Kartenspiele" (`CARD_GAMES` in `logic/tableCatalog.ts`). [ADR-0005](../adr/0005-tabletop-scripting-for-imported-games.md) is unchanged: imported third-party content still runs only as declarative routines; these scripts are app code, not content.

## 1. How a game is played

| Mode                                | Route                                       | Component           |
| ----------------------------------- | ------------------------------------------- | ------------------- |
| One device, passed around           | `/games/tabletop?local=1&gameId=<id>`       | `LocalScriptedGame` |
| TV table + own devices (party room) | `/games/tabletop?room=<room>&gameId=<id>&…` | `RoomScriptedGame`  |

`TabletopEntry.tsx` (exported as `TabletopGame`) opens these for ids in `scriptRegistry.ts` and the tabletop engine for everything else. The party lobby needs no change: `/party?launch=tabletop&gameId=skat` and the game picker (`PartyGamePickerModal`) start them like any tabletop game.

**Party room.** The host opens the game on its device and sees `RoomSetup`: the roster, the switch "this device only shows the table" (on by default when the other players are enough for the game) and the start button. A device with a seat shows that player's hand and buttons. A device without a seat — the host as table, or anyone who joined as spectator — shows the public table in the TV theme: seats, table cards, status, round result, no hand. The intended setup: cast or mirror the table device to the TV, every player uses their own phone. If the host wants to play on the device that is mirrored, a second device has to be the table (join as spectator).

**One device.** `LocalScriptedGame` asks for the names (`useLobbyPlayers`, `STORAGE_KEYS.TABLETOP_CARD_PLAYERS`) and covers the screen with `HandoverCover` (`modules/pass-and-play`) whenever another seat has to act.

## 2. Script contract (`logic/scriptTypes.ts`)

A `GameScript<G>` is a pure state machine:

- `start(playerCount, rng)` — a new match with the first deal.
- `move(state, seat, move, rng)` — the next state, or **the same object** when the move is not allowed. Moves are `{ kind: 'cards', cards, target? }` (hand cards, optionally onto a table card) or `{ kind: 'action', id, arg? }` (a button).
- `view(state, viewer)` — what a seat (or `null`, the table) sees: `status`, `info` chips, `seats` (card count, chips, optionally revealed cards), `active` seats, `piles` (`row` of open cards with optional `cover`/`seat`, `stock`), the viewer's sorted `hand`, `select` (`none` / `one` / `many`), `targets` (table cards that can be picked), `actions` (buttons), `playLabel`, and a `summary` between rounds.

Texts are `Text`: a plain string or `{ key, params, seat }`, resolved under `games.tabletop.scripted.*` in `public/locales` with the seat's name as `{{name}}` (`hooks/useScriptText.ts`). The UI holds no rules: whether the picked cards can be played is asked from the script (`moveAllowed` in `logic/session.ts` tries the move). Every seat acts in turn; `active` has one seat or none.

`ranks` lists every rank the game can deal (all four suits); the export builds its deck from it.

Adding a game: one script file, an entry in `scriptRegistry.ts` and `CARD_GAMES`, strings (`games.<id>`, `rules.<id>` and the script's keys) in both locales, tests. `__tests__/playthrough.ts` plays any script with random legal moves found through its view.

## 3. Session, sync, storage

`logic/session.ts`: `sessionReducer` over `{ scriptId, players, seed, step, game }` with `START` (players in seat order, seed), `MOVE` (seat, move) and `END` (back to the setup). Randomness comes from `seededRng(seed, step)`, so the reducer is pure and the same actions give the same table.

In a room the party host runs the reducer in a `SealedRoomPeer` (`logic/sealedRoomPeer.ts`, channel `cards-<id>_<room>`; `hooks/useRoomSession.ts`, kept across lobby visits by `retainRoomPeer`). A guest sends `hello` (with its public key) and `action`; the host accepts a `MOVE` only for the sender's own seat (`sessionAllows`) and only if the script's `move` changes the state. The host never publishes the state: each `views` message holds the public table packet and, per seat, that seat's `SeatPacket` (`logic/sealedViews.ts`: players, step, `script.view(state, seat)`, `hints`) sealed through `PrivateHandChannel.sealFor` / `openFromHost` (`tabletop/logic/privateHandChannel.ts`, `sealCrypto.ts`). Hands, stock and skat stay on the host. The table device sends "next round" as seat 0.

Whether a pick is playable is decided on the host: `hints` lists the single-card moves the script accepts now; larger picks (`many`) and buttons are tried optimistically on the device and refused by the host if illegal. Without WebCrypto (plain-HTTP LAN origins) a seat's packet is sent unsealed, still only its own.

The owner of the state keeps the running game in `STORAGE_PREFIXES.TABLETOP_SCRIPTED` + game id (`logic/sessionStore.ts`), one entry per game with its scope (`local` or the room id); it is removed when the game ends.

**Limit:** a device that reads the room traffic of its own seat sees that seat's hand only. Spectators and the table see the public view (Q24 resolved).

## 3a. Export and import as a game file

The header menu of a running scripted game has "Export as .json" (`onExportJson`, `useScriptedHeader`). It writes the tabletop's own format, the same `TabletopGameDefinition` the free table exports and the import dialog reads (`logic/nativeGameFile.ts`): `scriptedGameDefinition` in `logic/scriptExport.ts` builds the full deck from `script.ranks` (`buildDeck`, shuffled on start, cards labelled via `games.tabletop.labels.card`), a discard pile, one hand per seat up to `maxPlayers`, the rule text (`rules.<id>`) and `ruleScript: '<script id>'`. The file names the script, it carries no code ([ADR-0005](../adr/0005-tabletop-scripting-for-imported-games.md)).

Imported again (import dialog "Upload file", a device or server game), the game keeps `ruleScript` (`validateAndSanitizeGame` accepts `[a-z0-9-]{1,40}`). When `TabletopGame` resolves a game whose `ruleScript` this app knows (`ruleScriptOf`), it replaces `gameId` in the URL with the script id, so `TabletopEntry` opens the scripted game with enforced rules; other query parameters (`local`, `room`, …) stay. An app without that script ignores the field and shows the free table with the same cards. **Limit:** in a party room every device resolves the game itself, so a phone that has neither the file nor the companion copy cannot open it — use the built-in entry in `CARD_GAMES` there.

## 4. UI (`components/`)

`CardTable` is the one table for all games and both roles: `SeatBadges` (players, card counts, chips, active seat), the felt with `TablePiles` or `RoundSummaryPanel`, the status line, then the buttons and `HandFan` (reuses `fanLayout` from `logic/handFan.ts`). Picking: a tap lifts a card, a second tap or the play button plays it; with `targets` a tap on the table card plays at once (`hooks/useCardSelection.ts`, rules in `logic/selection.ts`). In `one` mode cards that cannot be played are dimmed. A phone vibrates when its turn starts. Header: `hooks/useScriptedHeader.tsx` registers back, rules (`RulesDialog` with `rules.<id>`) and restart through `useTabletopHeader`.

## 5. Rules as implemented

- **Schwimmen** (`schwimmen.ts`, 2–9): 32 cards; the dealer keeps the first hand or takes the second, the other goes to the middle. Swap one, swap all, pass, knock (then everyone else once more). Everyone passed → three new middle cards, or showdown when the stock is short. 31 or three aces (33) end the round at once and everyone else loses a life; three of a kind 30.5. Lowest hand loses a life, ties lose together, a tie of everyone costs nothing. Three lives, then swimming, then out.
- **Durak** (`durak.ts`, 2–6): 36 cards, podkidnoy. Lowest trump attacks first, later the player before the durak. Attack with cards of one rank; throw-ins of ranks on the table, asked in turn after each full defence (attackers who cannot add are skipped); at most six attack cards and never more than the defender held. Taking picks up at once (no throw-in after taking) and skips the defender. No passing on (perevodnoy).
- **Arschloch** (`arschloch.ts`, 3–8): 32 cards up to four players, 52 above, ace high. Same count of a higher rank or pass; a pass lasts for the trick. Points per round: players − 1 for the president down to 0. Exchange before the next round: Arschloch → president two best cards (one with three players), vices one from four players; the winners choose what to return. The Arschloch leads.
- **Mau-Mau** (`maumau.ts`, 2–5): 32 cards, five each; the start card has no effect. Suit or rank on the top card. 7: the next seat draws two or answers with a 7 (stacking +2). 8: the next seat is skipped. Jack: on anything but a jack, wishes a suit for the next card (action `wish` with the suit as `arg`). Drawing one card leaves only that card playable, otherwise pass; an empty stock reshuffles the discard pile under its top card. First empty hand wins the round; round wins are counted, the round starter rotates. Replaced the pass-and-play game `src/games/maumau` (2026-11-21, [migration plan](../tasks/CARD-GAMES-TO-SPIELTISCH.md)).
- **Skat** (`skat.ts`, `skatRules.ts`, exactly 3): bidding middlehand → forehand, rearhand → winner, forehand alone at 18 when nobody bid; all pass → next dealer. Pick up and discard two, or hand. Suit, grand, null, null ouvert (also as hand). Values per the International Skat Order including matadors, hand, schneider, schwarz, overbidding (lost at the next multiple of the base value) and lost games counted double. Not implemented: announced schneider/schwarz, ouvert suit/grand games, Ramsch, Kontra/Re, a fourth player sitting out.

## 6. Existing scripts that were checked

Nothing ready-made fits (2026-11-16): the fully scripted Skat mod on the Steam Workshop is third-party Tabletop Simulator Lua (ADR-0005: never bundled, and the Lua runtime does not exist yet); no VirtualTabletop or PlayingCards.io presets with enforced rules for these four games were found; `skaat` (npm) is a JavaScript Skat loop with an unconfirmed licence. In the repo, `src/games/cards` only keeps scores (Schwimmen lives) and may not be imported from another game.
