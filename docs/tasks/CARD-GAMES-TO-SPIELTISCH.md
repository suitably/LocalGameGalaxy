---
type: Spec
title: 'Move the standalone card games onto the Spieltisch'
description: 'Migration plan: Mau-Mau, Schwarzer Peter, Golf and Cabo become rule scripts of the Spieltisch (CardTable, party rooms with sealed hands); the cards score tracker is listed on the Spieltisch as a score tracker without cards. One PR per game.'
tags: [games, cards, tabletop, scripted, migration, spec]
status: draft
generated:
  at: 2026-11-21T14:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-21
  method: 'Read src/games/{cabo,golf,maumau,schwarzer-peter,cards}/logic headers, src/games/tabletop/scripted/logic/scriptTypes.ts, scriptRegistry.ts, tableCatalog.ts, src/lib/extraGameEntries.ts; ported Mau-Mau and ran its Vitest suite.'
sources:
  - 'src/games/tabletop/scripted/logic/scriptTypes.ts'
  - 'src/games/tabletop/logic/tableCatalog.ts'
  - 'src/lib/extraGameEntries.ts'
---

# Card games onto the Spieltisch

## 1. Request (maintainer, 2026-11-21)

Cabo, Mau-Mau, Golf and Schwarzer Peter were built as standalone pass-and-play hub games with their own table UI ([CARD-CLASSICS](CARD-CLASSICS.md)). That is wrong: card games belong on the Spieltisch and use its one visualisation (`CardTable`, [tabletop-scripted-games](../tech/tabletop-scripted-games.md)). Decisions:

- All four become rule scripts in `src/games/tabletop/scripted/logic/`, listed in `CARD_GAMES`.
- The hub tile, the game folder, its i18n bundle and its `*_LOBBY_PLAYERS` storage key are deleted. No shortcut tile.
- The `cards` score tracker (`src/games/cards`: Schwimmen lives, Oh Hell bids, universal counter) moves onto the Spieltisch too, **as a score tracker without cards**.
- One PR per game.
- Every Spieltisch card game can be exported in the format the app imports (native `.json`); imported again, it plays with the same enforced rules. Done for all scripted games ([tabletop-scripted-games §3a](../tech/tabletop-scripted-games.md#3a-export-and-import-as-a-game-file)); a new script gets it through `ranks`.

## 2. Per game

| Game            | Status                     | Fits the contract?                                                                                           |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Mau-Mau         | done (`maumau.ts`)         | Yes. Suit wish = four `wish` actions with the suit as `arg`.                                                 |
| Schwarzer Peter | done (`schwarzerPeter.ts`) | Drawing blind from the neighbour's hand is a `slot` move on face-down slots (slice 0).                       |
| Golf            | done (`golf.ts`)           | No: a 2×3 grid per seat, face down even for its owner, flips and slot swaps.                                 |
| Cabo            | open                       | No: four face-down slots, peeks of own/other slots, blind swaps, Cabo call.                                  |
| cards tracker   | open                       | Not a script: no cards. Listed on the Spieltisch like `DICE_GAMES` (`kind: 'route'`), hub tile filtered out. |

Port the house rules of the existing engines unchanged (header comments of `src/games/<id>/logic/engine.ts`); their tests are the checklist for the new script tests.

## 3. Slice 0 — face-down slots in the script contract (done with Schwarzer Peter)

`ScriptView.hand` is the viewer's open hand; `SeatView.revealed` is all-or-nothing. Golf and Cabo need per-seat slots that can be face down for everyone, known to one seat, or open. Implemented as below ([tabletop-scripted-games §2](../tech/tabletop-scripted-games.md#2-script-contract-logicscripttypests)):

- `SeatView.slots?: (CardId | null)[]` — one entry per slot, `null` = face down for this viewer. The script decides per viewer, so sealing stays correct.
- `ScriptView.slotTargets: { seat: number; slot: number }[]` and a move `{ kind: 'slot', seat, slot }` (flip, peek, swap the drawn card in, blind-swap pick).
- Golf/Cabo plan: a drawn card is shown as an open pile (`row`), swapping it in is a tap on a slot, discarding it a button.
- `CardTable`/`SeatBadges`: render slots as a small grid per seat (own seat larger). `candidateMoves` in `__tests__/playthrough.ts` must try every `slotTargets` entry.

## 4. Per-PR checklist

1. Script (with `ranks`, so "Export as .json" works) + tests in `scripted/logic/` (`__tests__/<id>.test.ts`, random playthrough with min/max players, card conservation).
2. `scriptRegistry.ts`, `CARD_GAMES` in `tableCatalog.ts`.
3. Strings in both locales: `games.tabletop.scripted.games.<id>`, `rules.<id>`, `<id>.*`.
4. Delete `src/games/<id>`, its `extraGameEntries.ts` line, its `STORAGE_KEYS` entry, `games.<id>` hub keys; update AGENTS.md §6 bundle list, `docs/tech/game-catalog.md`, `docs/tech/architecture.md` §3.2 users, §5 of the scripted-games doc.
5. Once Cabo, Golf and Schwarzer Peter are gone, check whether `src/modules/playing-cards` and `HandoverCover` without `players` still have users; remove dead code in a separate PR.
