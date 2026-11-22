---
type: Spec
title: 'One game catalogue: restructure hub, Spieltisch and party picker'
description: 'Migration plan in seven phases: one typed catalogue in every game folder replaces the five hand-kept game lists; hub, Spieltisch lobby and party picker become views of it; party room becomes a mode, Spieltisch an engine, tools get their own area; Werewolf and Imposter get a party mode; sync, players and i18n are consolidated. One PR per step, old links keep working.'
tags: [games, registry, catalog, hub, party, tabletop, migration, spec]
status: stable
generated:
  at: 2026-11-22T18:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-22
  method: 'Read src/lib/gameRegistry.tsx, src/lib/extraGameEntries.ts, src/lib/areas.ts, src/features/hub/Hub.tsx, src/games/tabletop/logic/tableCatalog.ts, src/features/party/components/PartyGamePickerModal.tsx, src/features/party/logic/{partyRoutes,partyGameTitles,universalPartyManager}.ts, src/App.tsx, package.json scripts (main @ 4e60bbd).'
sources:
  - 'src/lib/gameRegistry.tsx'
  - 'src/lib/extraGameEntries.ts'
  - 'src/lib/areas.ts'
  - 'src/features/hub/Hub.tsx'
  - 'src/games/tabletop/logic/tableCatalog.ts'
  - 'src/features/party/components/PartyGamePickerModal.tsx'
  - 'src/features/party/logic/partyRoutes.ts'
  - 'src/features/party/logic/partyGameTitles.ts'
  - 'src/features/party/logic/universalPartyManager.ts'
  - 'src/App.tsx'
---

# One game catalogue

## 1. Problem

There is no single model of "a game". Five hand-kept lists describe the same games and drift apart:

| List                                                                                      | File                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Hub registry + `extraEntries`                                                             | `src/lib/gameRegistry.tsx`, `src/lib/extraGameEntries.ts` |
| Hub exclusions (`TABLE_GAME_IDS`)                                                         | `src/features/hub/Hub.tsx`                                |
| Spieltisch (`TABLETOP_STARTERS`, `CARD_GAMES`, `DICE_GAMES`, `SCORE_TRACKERS`)            | `src/games/tabletop/logic/tableCatalog.ts`                |
| Party picker (`BUILTIN_TABLETOP`, a copy of `TABLETOP_STARTERS`, five hard-coded buttons) | `src/features/party/components/PartyGamePickerModal.tsx`  |
| `PartyGameType`, `ROOM_DICE_GAMES`, `LAUNCHABLE_GAMES`, `PARTY_GAME_TITLES`               | `src/features/party/logic/*`                              |

On top of that, concepts are mixed: the party room (a mode) and the Spieltisch (an engine) are hub tiles; Drawpot, Darts and the score tracker (tools) sit under "party" or on the Spieltisch; dice games are hidden from the hub; Gartic Phone is reachable only from the lobby; `category` (7 values) is shadowed by `areas` (5); Werewolf and Imposter have no party-room mode although they need private roles most.

## 2. Principles

1. **Single source of truth.** Every list a screen shows is derived from one typed catalogue; nothing else names game ids.
2. **Colocation.** Each game folder exports its own `definition.ts`; the registry only collects.
3. **Separate the axes.** _What_ (game vs. tool, area), _how_ (modes: solo, pass and play, party room, async) and _with what_ (route vs. Spieltisch script/asset) are independent fields.
4. **Strangler, not big bang.** New catalogue first, old lists derived from it, then removed. Every PR is releasable.
5. **Behaviour parity first.** Snapshot tests of today's hub, Spieltisch and picker lists before refactoring; the first phases change no visible behaviour.
6. **Stable URLs and data.** Old routes and `/party?launch=…` links keep working (redirects); storage keys never change.
7. **Decide before building UI.** The navigation change (phase 3) needs an ADR accepted by the maintainer.
8. **Guarded by tooling.** A catalogue consistency test and a `check:architecture` rule stop new hand-kept lists.

## 3. Target model

```ts
// src/lib/catalog/types.ts
export type Area = 'party' | 'cards' | 'dice' | 'board' | 'music' | 'solo';
export type Mode = 'solo' | 'pass_and_play' | 'party_room' | 'async';

export interface CatalogEntry {
  id: string;
  kind: 'game' | 'tool';
  area: Area;
  titleKey: string;
  descKey: string;
  icon: AreaIcon; // one icon source for all views
  players: { min: number; max: number };
  modes: Mode[];
  launch:
    | { type: 'route'; route: string; component: LazyComponent; nestedRoutes?: NestedRoute[] }
    | { type: 'script'; scriptId: string } // Spieltisch rule script
    | { type: 'asset'; assetId: string }; // Spieltisch free table preset
  party?: { launch: string; gameId?: string }; // how the lobby starts it
  hidden?: boolean; // reachable, not listed (e.g. during migration)
}
```

Views (pure functions, unit-tested):

- `hubEntries(filter)` — every listed entry; filters by area and by mode.
- `spieltischEntries()` — `launch.type !== 'route'` plus dice games with a sheet.
- `partyPickerEntries()` — entries with `modes.includes('party_room')`.
- `PartyGameType` = union derived from the catalogue (`as const` list), titles via `titleKey`.

## 4. Phases (one PR per numbered step)

### Phase 0 — Decide and secure (no code change in behaviour)

0.1 ADR-0011 "One game catalogue and hub navigation": target model, hub layout (party room in the header, Spieltisch as engine, Tools area), redirect policy. Maintainer accepts.
0.2 Characterisation tests: snapshot of the ids and order shown by the hub, each Spieltisch section and each picker tab; tests that every current route and every `launch=` value resolves.

### Phase 1 — Catalogue beside the old lists

1.1 `src/lib/catalog/` with types, `entries.ts` and views. Each game folder gets `definition.tsx` (start: move entries 1:1 out of `gameRegistry.tsx`; Drawpot already has one).
1.2 Consistency test: unique ids, every `titleKey`/`descKey` exists in de and en, every `party_room` entry has `party.launch`, every `script` id exists in `scriptRegistry.ts`, `players.min ≤ max`.
1.3 `gameRegistry` becomes a thin adapter over the catalogue; delete `extraGameEntries.ts`. Snapshot tests stay green.

### Phase 2 — Derive the other lists

2.1 Spieltisch lobby reads `spieltischEntries()`; `tableCatalog.ts` keeps only engine helpers (`playModesOf`).
2.2 Party picker reads `partyPickerEntries()`; delete `BUILTIN_TABLETOP` and the hard-coded buttons; icons and colours now match the Spieltisch.
2.3 Derive `LAUNCHABLE_GAMES` and titles (`partyGameTitle()` replaces `PARTY_GAME_TITLES` and its hard-coded "Tabletop Spiel"); `PartyGameType` and `ROOM_DICE_GAMES` stay the wire contract, kept in step by `catalog.test.ts` (ADR-0011 §4).
2.4 Hub reads `hubEntries()`; delete `TABLE_GAME_IDS`. Drop `category` and `AREA_BY_CATEGORY` (`area` is set directly).
2.5 `check:architecture` rule: game ids as string literals outside `src/games/<id>/` and `src/lib/catalog/` fail.

Snapshot tests must still pass unchanged at the end of phase 2.

### Phase 3 — New navigation (after ADR-0011)

3.1 Hub header: "Create room / Join" as primary action; remove the `party` tile (route `/party` stays).
3.2 All games listed in the hub, including dice, card and board games; filter chips for area and for "one device / everyone with their phone / over days".
3.3 Spieltisch is no longer a hub tile: card/dice/board entries open it directly; "Free table / import" becomes one entry in area `board` (or the Spieltisch header).
3.4 Area `tools`-like section (`kind: 'tool'`): Drawpot, Darts, score tracker.
3.5 Gartic Phone gets a hub entry that opens the lobby with `launch=garticphone`.
3.6 Update snapshots intentionally; screenshots at 360×720 and desktop; DESIGN.md §8.2 updated.

### Phase 4 — Close mode gaps

4.1 Werewolf `party_room`: roles on own devices, TV/host as narrator, on `modules/room-game`.
4.2 Imposter `party_room`: word on own device, voting on phones.
4.3 Optional: group mode for Wordle (same word, race) — only if wanted.

### Phase 5 — One player concept

5.1 Party roster becomes the player source; `useLobbyPlayers` (Imposter, cards tracker, local scripted games) reads/writes the same local roster with one storage key; old keys read once as migration, never deleted.

### Phase 6 — One sync path and one i18n path (one PR per game)

6.1 Live games on `useRoomReducer`/`useRoomEvents`; Melodiq's direct `BroadcastChannel` moves behind `useMultiChannelSync`. WebRTC stays only where media needs it (record in ADR).
6.2 Per-game i18n bundles move to one scheme (either all per game via `addResourceBundle` or all global — decide in ADR-0011); no German fallbacks in components.

### Phase 7 — Clean up

7.1 Remove adapters (`gameRegistry` facade if unused), dead keys, docs: `game-catalog.md`, `architecture.md`, `tabletop-scripted-games.md`, AGENTS.md bundle list, `docs/log.md`.

## 5. Definition of done (every PR)

- `npm run lint`, `npm test`, `check:architecture`, `check:budget`, `check:duplicates` green.
- Characterisation snapshots unchanged, or changed on purpose in the same PR with the reason.
- Old URLs and `launch=` links resolve (route tests).
- No storage key renamed.
- Docs updated in the same commit; changelog fragment when users notice it (phase 3, 4).

## 6. Risks

| Risk                                   | Counter-measure                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Shared invite links break              | Redirect table + route tests (0.2)                                                   |
| Lazy loading regresses (bundle size)   | `definition.ts` imports only `lazy()` pages, no logic; check build chunk sizes       |
| Hub becomes too long with all games    | Area and mode filters; decided in ADR-0011 with a mock-up                            |
| Migration stalls half-way, two systems | Phase 2 finishes the derivation before any UI change; 2.5 blocks new hand-kept lists |
| Saved players lost (phase 5)           | Read old keys, write new key, keep old keys                                          |

## 7. Progress

| Step                       | Status                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1, 0.2, 1.1–1.3, 2.1–2.5 | done: ADR-0011, `src/lib/catalog/`, `catalog.test.ts`, rule 11 (one PR, behaviour-neutral)                                                                                                                                                                                                                                                                                       |
| 3.1–3.6                    | done: party-room entry, all games by area, own-phones filter, tools section, Gartic tile, Spieltisch as place (one PR)                                                                                                                                                                                                                                                           |
| 4.2                        | done: Imposter party room on the shared `SealedRoomPeer` (moved from the tabletop to `src/modules/room-game/sealed/`, used through `useSealedPartyGame`)                                                                                                                                                                                                                         |
| 4.1                        | done: Werewolf party room on `useSealedPartyGame` (roles, night turns, votes and hunter shot per phone; host narrates; subset of roles, see werewolf-architecture §6a)                                                                                                                                                                                                           |
| 5.1                        | done: `STORAGE_KEYS.LOBBY_PLAYERS` read and written by `useLobbyPlayers` (Imposter, cards, Spieltisch one device, GuessArt, Storyteller); old keys via `migrateFrom`, read once, kept. Werewolf keeps `WEREWOLF_SETUP_PLAYERS` (players carry roles)                                                                                                                             |
| 6.2                        | done: every game's strings in `src/games/<id>/i18n/{de,en}.json` via `registerGameBundle` (ADR-0011 §7); start-up `de` locale 155 KB → 49 KB; no `t()` defaults (ESLint), 59 missing keys added                                                                                                                                                                                  |
| 6.1                        | audit done: live games on `useRoomReducer`/`useRoomEvents` or `useSealedPartyGame`, Melodiq on `useMultiChannelSync`. Open: Melodiq's phone RPC (queue, search, host settings, feedback) still uses WebRTC data channels — moving it to the MQTT room breaks standalone/offline Melodiq; decided: room API over a WebRTC `RoomTransport`, tracked in #813 (sub-issues #814–#820) |
| 7.1                        | done: 351 unread translation keys removed; scaffolder and doc-sync gate know game bundles; docs updated. `gameRegistry` stays (routes, path lookup, settings)                                                                                                                                                                                                                    |
