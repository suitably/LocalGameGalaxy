---
type: ADR
title: 'ADR-0011: One game catalogue; hub, Spieltisch and party picker are views of it'
description: 'Every game, tool and place declares one typed catalogue entry next to its code (definition.tsx); src/lib/catalog collects them and derives every list a screen shows. Area, play modes, listing and launch are separate fields. PartyGameType stays the wire contract, kept complete by a test. The hub becomes a party-room entry plus all games grouped by area, with tools apart.'
resource: src/lib/catalog/
tags: [adr, catalog, registry, hub, party, tabletop, navigation]
status: stable
generated:
  at: 2026-11-22T20:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Implemented and tested in src/lib/catalog/{types,entries,views,defineGame}.ts, src/games/*/definition.tsx, src/games/tabletop/catalog.ts; catalog.test.ts pins the lists; check:architecture rule 11 (scripts/lib/game-lists.mjs).'
sources:
  - 'src/lib/catalog/types.ts'
  - 'src/lib/catalog/entries.ts'
  - 'src/lib/catalog/views.ts'
  - 'src/lib/catalog/catalog.test.ts'
  - 'scripts/lib/game-lists.mjs'
  - '../tasks/GAME-CATALOG-RESTRUCTURE.md'
---

# ADR-0011: One game catalogue

## Status

Accepted 2026-11-22. The maintainer asked for the restructuring in [GAME-CATALOG-RESTRUCTURE](../tasks/GAME-CATALOG-RESTRUCTURE.md) to be carried out by agents end to end.

## Context

Five hand-kept lists described the same games: the hub registry (plus `extraGameEntries.ts`), the hub's exclusion list, the Spieltisch catalogue (`TABLETOP_STARTERS`, `CARD_GAMES`, `DICE_GAMES`, `SCORE_TRACKERS`), the party picker (a copy of the starters with other icons, five hard-coded buttons) and the party lists (`LAUNCHABLE_GAMES`, `ROOM_DICE_GAMES`, `PARTY_GAME_TITLES` with a hard-coded German title). Seven `category` values were shadowed by five areas. Places (party room, Spieltisch) and tools (Drawpot, Darts, score tracker) were filed like games; dice games were hidden from the hub; Gartic Phone had a hand-written route in `App.tsx`.

## Decision

1. **One entry per game, next to its code.** `src/games/<id>/definition.tsx` exports `definition` (built with `defineGame`); the Spieltisch presets and rule scripts, which have no page of their own, are data in `src/games/tabletop/catalog.ts`; the party room's entry is `src/features/party/definition.tsx`. `src/lib/catalog/entries.ts` is the only file that lists them; its order is display order.
2. **Separate axes.** `kind` (game, tool, place), `area` (symbol and colour), `modes` (solo, pass and play, party room, async), `listing` (hub, a Spieltisch section, hidden) and `launch` (own route or Spieltisch id) are independent fields; `category` and `AREA_BY_CATEGORY` are gone.
3. **Views, not lists.** Hub tiles, Spieltisch sections, party picker tabs, party titles and the `launch=` allow-list are functions in `src/lib/catalog/views.ts`. `gameRegistry` only registers routes and finds a game by path.
4. **Wire contract stays explicit.** `PartyGameType` and `ROOM_DICE_GAMES` are protocol values stored in rooms and links, so they stay hand-written; `catalog.test.ts` fails unless every `PartyGameType` has exactly one way to start and the room dice games equal the catalogue's dice entries with a party mode.
5. **Guards.** `catalog.test.ts` checks unique ids, translated keys, party launch and script ids, and pins what each screen lists (a change to a screen updates the test on purpose). `check:architecture` rule 11 fails on a string array naming two or more catalogue ids outside `src/lib/catalog/` and `src/games/`.
6. **Navigation** (built in the next step): the hub opens with a party-room entry (create or join a room); below it every game, including the Spieltisch card, dice and board games and Gartic Phone, grouped by area, with an area filter and a "with own devices" filter; tools in their own section at the end; the Spieltisch stays reachable as the place for imported and own games. Old routes and `/party?launch=` links keep working; storage keys never change.

## Consequences

- Adding a game is one `definition.tsx` and one line in `entries.ts` (the scaffolder does both); screens pick it up by its fields.
- Picker tiles now use the area symbols and colours of the Spieltisch instead of their own icons; the order of Melodiq and Melodiq Notes in the picker follows the catalogue.
- A list a screen shows can no longer drift: the tests or rule 11 fail first.
- Lazy loading is unchanged: definitions import only icons and `lazy()` pages. Melodiq's queue route imports `SongsProvider` from its hook file instead of the whole game index.
