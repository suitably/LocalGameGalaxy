---
type: Report
title: 'Tabletop player areas: one hand / hidden-area / opponent-strip model for scripted and free-table games'
description: 'Audit of how the built-in card games and the free table (imported, generic games) show hands, hidden zones and other players; how other apps solve it on phones; a target model with per-player show/hide; a slice plan; and what it means for the Elfenland, Catan and 7 Wonders Duel Workshop mods.'
tags: [tabletop, cards, hands, hidden-zones, mobile, scripted, tts-import, plan]
status: stable
generated:
  at: 2026-11-18T17:30:00+01:00
  by: claude-code
verified:
  at: 2026-11-18
  method: 'Read-only scout over src/games/tabletop (logic, hooks, components, scripted); symbols re-checked with grep; Durak, Skat (scripted) and standard-cards (free table) run locally in headless Chromium at 390×844; open PRs and issues read on GitHub; web research on other apps from search summaries (several vendor doc hosts were not reachable); Steam Workshop pages of the three mods read for title and description only — their save files were not downloaded.'
sources:
  - 'src/games/tabletop/scripted/logic/scriptTypes.ts'
  - 'src/games/tabletop/scripted/components/CardTable.tsx'
  - 'src/games/tabletop/scripted/components/SeatBadges.tsx'
  - 'src/games/tabletop/components/surface/HandDockStrip.tsx'
  - 'src/games/tabletop/components/controller/TabletopControllerView.tsx'
  - 'src/games/tabletop/logic/types.ts'
  - 'src/games/tabletop/logic/hiddenZoneLogic.ts'
  - 'src/games/tabletop/logic/handPrivacy.ts'
  - 'src/games/tabletop/logic/seatLogic.ts'
  - 'src/games/tabletop/logic/myArea.ts'
  - 'src/games/tabletop/logic/intentAuthorization.ts'
---

# Tabletop player areas plan (2026-11-18)

Goal from the maintainer: generic games on the Spieltisch (free table, imported TTS / VTT games) take over the presentation of the built-in card games. Hands and hidden areas work the same everywhere; a player's hidden area also shows up at the top with the other players; every player decides whether their hand and their hidden area are visible to the others.

## 1. What exists today

Two separate stacks live in `src/games/tabletop/`:

| Concern             | Scripted card games (`scripted/`: Schwimmen, Durak, Arschloch, Skat)                                  | Free table (everything else: `standard-cards`, imports, own games)                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Data                | No widgets. `ScriptView` per viewer: `seats[]` (`cards` count, `revealed?`, `chips`), `hand`, `piles` | Widgets. Hand = `HolderWidget.isHand` + `SeatWidget.hand`; hidden area = `HiddenZone` (`ownerSeat`, `revealed`)                             |
| Other players       | `SeatBadges`: chip per seat at the top with colour, name, hand count, status chips, revealed cards    | Nothing comparable. `PlayerSeatSelector` (seat picker) and `PlayerOverviewHud` (stats dialog); the phone controller shows only the own seat |
| Own hand            | `scripted/components/HandFan.tsx` under the table, action buttons above it                            | `HandDockStrip` + `surface/HandFan.tsx` (table device), `CardHandDock` (phone controller); two `HandCardItem.tsx` copies                    |
| Hidden area         | None (the script decides what is open)                                                                | `HiddenZoneLayer`, a rectangle on the table; `ZoneRevealToggle` → `TOGGLE_ZONE_REVEAL`, owner-only (`intentAuthorization.ts`)               |
| Show hand to others | Rule-driven only (`SeatView.revealed`, e.g. Skat ouvert in `skatView.ts`)                             | **Missing.** A hand has no `revealed` flag; only zones have one                                                                             |
| Who is "me"         | `viewer` seat passed to `script.view`                                                                 | `resolveSeatView`, `seatsForHands` (`seatLogic.ts`), `myAreaBounds` (`myArea.ts`: own hands + own zones)                                    |
| Privacy on the wire | Whole state to every device (Q24); draft PR #783 seals per seat                                       | Hands sealed per seat (`privateHandChannel.ts`), zone contents redacted (`hiddenZoneRedaction.ts`)                                          |

Phone check (390×844, local mode):

- Durak / Skat: seat chips at the top (wrap to two rows with three players), table in the middle, action row, hand fan at the bottom. Readable; ten Skat cards still fit the fan.
- `standard-cards`: only the table and "Your hand". No hint who else plays, how many cards they hold or whose turn it is. Floating edit / zoom toolbars and the "Player 1 done" button cover the lower third of the table.

Work by other agents that overlaps:

- **Draft PR #783** `feature/scripted-sealed-seat-views` — per-seat sealed `script.view` for scripted rooms (Q24). Touches `RoomScriptedGame` and the room hook, not the components named below; land it first or rebase on it.
- **Issue #557** "view of other hands" — maintainer decision 2026-11-07: (1) view requests with accept / reject / random, (2) offer / give cards. Needs exactly the opponent strip planned here; the show/hide toggle below is its simplest case.
- **Draft PR #784** — Cabo, Golf, Mau-Mau, Schwarzer Peter in `src/games/cards` (a different game; no cross-game imports). Sharing UI with it would mean moving it to `src/modules/`; out of scope here.
- "My area" (`myArea.ts`), hidden-zone move / resize (`docs/tasks/ISSUE-539-tabletop-hidden-space.md`), #672 (usability polish), #467 (table epic).
- No branch, spec or TODO for a unified area model exists.

## 2. How other apps do it

From search summaries; rows on Tabletop Playground, UNO!, Marvel Snap could not be verified and are left out.

| App                                               | Own hand                                                          | Other players                                                | Hidden area and reveal                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Tabletop Simulator                                | Hand zone per seat in 3D                                          | Card backs at the seats                                      | Hidden zones (zone visible, content not). One global `Hands.hiding`: owner only / everyone but owner / all |
| Tabletopia                                        | Tray at the bottom edge                                           | Count of items in others' hidden areas (can be switched off) | Hidden area owned by a player; attach it to another player to show or pass cards; phone app is limited     |
| playingcards.io                                   | Private hand holder at the bottom                                 | Seat widgets with the hand count                             | Hand only; reveal = drag the card onto the table. Text gets small on phones                                |
| Board Game Arena                                  | Per game, usually under the board                                 | Player panels move to the top on phones, with counts         | Rule-enforced. Known phone problems: hand under the iOS home bar, zoomed card off screen                   |
| Screentop.gg / Roll20                             | Containers / hand tray                                            | Count only                                                   | Visibility policy per container or deck, set by the designer, not the player                               |
| Hearthstone, MTG Arena, Exploding Kittens (phone) | Collapsed fan at the bottom, tap to expand, long-press to inspect | Avatar and card backs or count at the top                    | Rule-enforced. Known problems: mis-plays from ambiguous gestures, layouts that break with large hands      |

What carries over:

1. Hand anchored at the bottom inside the safe area; a fan up to about 7–10 cards, then a scroll row.
2. Other players as a strip of chips at the top: colour, name, turn marker, counts. Tap a chip to open that player's area in a sheet instead of squeezing it onto the table.
3. One visibility value per zone, owned by the player, synced as host state — not a global setting (TTS's global mode cannot say "only I show my hand").
4. A permanent marker on the own hand / zone while others can see it, mirrored on the chip the others see.
5. Revealing a whole hand is a deliberate act (toggle with a visible state, undo by toggling back); a single card is revealed by playing it to the table.
6. Hidden content is removed before sending, not only hidden in the UI. Counts are a separate flag from contents (some games keep counts secret).
7. Inspect (tap / long-press, card centred on screen) and play (drag or button) are different gestures.

## 3. Target model

One view model, two adapters, one UI.

```ts
// logic/playerAreas.ts (pure)
type ZoneVisibility = 'owner' | 'all';
interface AreaZoneView {
  id: string;
  kind: 'hand' | 'hidden';
  label?: string;
  count: number; // cards or pieces inside
  visibility: ZoneVisibility;
  items?: AreaItem[]; // only when the viewer may see them
  canToggle: boolean; // viewer owns it and the game leaves it to the player
}
interface PlayerAreaView {
  seat: number;
  name: string;
  color: string;
  active: boolean;
  out?: boolean;
  me: boolean;
  chips: string[];
  zones: AreaZoneView[];
}
```

- `areasFromScriptView(view, names, viewer)` — maps `SeatView` (`cards`, `revealed`, `chips`, `out`) and `view.active`. `canToggle` is false: the rules decide.
- `areasFromTable(game, viewerSeat, players)` — built on `seatsForHands`, `HiddenZone.ownerSeat`, `isWidgetHiddenForViewer`; the same grouping `myAreaBounds` already uses. Zone items can be tokens, not only cards.
- UI (shared inside the tabletop game): `PlayerAreaStrip` (today's `SeatBadges`, generalised: one count per zone with an eye icon when it is open), `PlayerAreaSheet` (tap a chip → that player's zones; faces when visible, backs and count otherwise), one `HandFan` and one `HandCardItem` instead of two each, and a show/hide button on the own hand and the own zone.
- State on the free table: `HolderWidget.revealed?: boolean` next to `HiddenZone.revealed`; new action `TOGGLE_HAND_REVEAL`, owner-only like `TOGGLE_ZONE_REVEAL`; `privateCardOwners` (`handPrivacy.ts`) skips revealed hands so the host stops redacting them. Nothing new on the wire.
- Phone layout of the free-table controller follows `CardTable`: strip at the top, table viewport ("my area" focus, pan / pinch), action row, hand at the bottom. A game without hands (7 Wonders Duel) gets no hand dock.

Why this and not "turn scripted games into widgets" or "one renderer for both tables": the scripted table is a rule view without positions, the free table is a positioned canvas; forcing one into the other breaks either the rule scripts or imported layouts. The player-area layer is the part both really share.

## 4. Slice plan

Each slice is one PR; order matters.

| #   | Slice                                                                                                                                | Size | Notes                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------- |
| 0   | Wait for / rebase on #783                                                                                                            | —    | Avoids conflicts in the scripted room path                                   |
| 1   | `logic/playerAreas.ts`: types, both adapters, tests                                                                                  | S    | Pure; no UI change                                                           |
| 2   | `PlayerAreaStrip` replaces `SeatBadges` in `CardTable` (same look), fed by `areasFromScriptView`                                     | S    | Refactor PR; screenshots must not change                                     |
| 3   | Merge the two `HandFan` / `HandCardItem` pairs into one shared pair                                                                  | M    | Removes duplication; `TabletopSurface.tsx` is at 249 lines, do not add to it |
| 4   | Strip on the free table: table device and phone controller, read-only (counts, turn, own marker)                                     | M    | First visible change for generic games                                       |
| 5   | `PlayerAreaSheet`: tap a chip → zones of that player; hidden zones listed with count                                                 | M    | Hidden area "at the top with the other players"                              |
| 6   | `TOGGLE_HAND_REVEAL` + reducer, authorization, redaction, tests; show/hide buttons on hand and zone with the "visible to all" marker | M    | Server-side nothing; sync doc and engine doc updated in the same PR          |
| 7   | Free-table phone layout: toolbars out of the table area, no hand dock without a hand                                                 | M    | Overlaps #672                                                                |
| 8   | #557 step 1 (view requests) on top of the sheet                                                                                      | L    | Separate issue                                                               |

Risks: `logic/tabletopReducer.ts` (538 lines) — put the new case in `reducers/viewReducer.ts`; Catan-specific heuristics in `handLayout.ts` and `seatLogic.ts` (2026-11-08 analysis) must not leak into the adapter; i18n keys in both locales.

## 5. Decisions for the maintainer

1. **Scripted games:** may a player show their hand voluntarily (outside the rules), or stays it rule-driven? Recommendation: rule-driven, toggle only on the free table.
2. **Counts:** are hand and hidden-zone counts always public? Recommendation: yes by default, a per-game switch later if a game needs it.
3. **Visibility values:** `owner` / `all` now; "everyone but me" (Hanabi) and "show to one player" (#557) later? Recommendation: yes, later.
4. **Pass-and-play on one device:** the strip shows the same counts; the sheet shows contents only for revealed zones. Agreed?

## 6. The three Workshop mods

Pages read: Elfenland (2–6 players, id 2501274807, 272 KB), The Settlers of Catan "The Scripts of Catan" (3–6, id 660395369, 632 KB, Lua: board generation, score, yield marking), 7 Wonders Duel "Fully Scripted" (id 2125928622, 263 KB). **Not done:** importing the three saves and screenshotting them on a phone — the download of the save files was not permitted in this session. Catan and Elfenland exports were measured in the [2026-11-08 analysis](2026-11-08-melodiq-notes-and-tabletop-analysis.md) §4 (deck GUID collisions, `Custom_Model` boards, imgur images, sparse seats); whether those are all fixed since was not re-checked. The rule notes below are from general knowledge of the games, not from the mods.

| Game           | Hand                                 | Hidden in front of the player                                           | Open in front of the player                            | What the model must handle                                                                                                                                      |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catan          | Resource cards and development cards | Unplayed development cards (kept apart from resources)                  | Played knights, special cards, pieces on the board     | Two zones per player (two hands or hand + hidden zone); counts must be public (robber); large board → the phone shows "my area", a table device shows the board |
| Elfenland      | Travel cards (up to 8)               | One face-down transport counter; secret destination card in the variant | Open transport counters, collected town markers        | Hidden zone holding **tokens**, not cards → `AreaItem` must not assume cards                                                                                    |
| 7 Wonders Duel | None                                 | Nothing owned; face-down cards belong to the shared card structure      | Built cards by colour, wonders, coins, progress tokens | No hand dock; the value is the sheet showing the opponent's open tableau; needs "open" areas per seat later (not in slices 1–7)                                 |

All three are Lua-scripted; on the Spieltisch they stay hand-operated until the Lua runtime (#705) exists. The seat chips, counts and show/hide work without scripts.
