---
type: Report
title: 'One table, one session: party mode, tabletop, dice games and pass-and-play'
description: 'Audit of how party mode, tabletop, the dice games and the async games handle sessions and players today, and the slice plan for one session layer (local or with phones), a pass-and-play handover with hidden hands, mobile layout, plus the VirtualTabletop and Tabletop Simulator import gaps found on the way.'
tags: [party, session, tabletop, dice, pass-and-play, mobile, import, plan]
status: stable
generated:
  at: 2026-10-22T13:00:00+02:00
  by: claude-code
verified:
  at: 2026-10-22
  method: 'Read src/features/party/**, src/App.tsx, src/lib/gameRegistry.tsx, src/games/{tabletop,kniffel,knister,qwixx,garticphone,guessart,storyteller}; imported 579 VirtualTabletop library variants and the Workshop fixture 2500271578 through our parsers in a scratch harness.'
sources:
  - 'src/features/party/logic/universalPartyManager.ts'
  - 'src/features/party/logic/partyRoutes.ts'
  - 'src/lib/gameRegistry.tsx'
  - 'src/games/tabletop/TabletopGame.tsx'
  - 'src/games/tabletop/logic/pcioNormalizer.ts'
  - 'src/games/tabletop/logic/steamWorkshopApi.ts'
---

# One table, one session (2026-10-22)

Goal from the maintainer: open a session once, everybody joins, then play any table game together — tabletop games and the dice games — either on one device (pass and play, with hands hidden between players) or with phones. Everything must work well on a phone.

## 1. Where we are

| Area         | State on `main`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Party mode   | `src/features/party`: `universalPartyManager.ts` (room, roster, host over BroadcastChannel `party_bc_<room>` + MQTT `party_<room>` + localStorage mirror, presence ping every 3 s), `partyMailbox.ts` (`lgg/party`), `partyRoutes.ts`. Launches only Gartic Phone, GuessArt and tabletop (`PartyGameType`). `/party` is routed twice (`App.tsx` and the registry entry `party`).                                                                      |
| Gartic Phone | Seeds players from the party roster, but syncs over BroadcastChannel only (phones never get the game) and has no registry entry, so `/games/garticphone` is a dead route.                                                                                                                                                                                                                                                                             |
| GuessArt     | Launching it from the party drops the room; it has its own async share links (now on player seats, #466).                                                                                                                                                                                                                                                                                                                                             |
| Tabletop     | Own room (`useTabletopSync`, host-authoritative deltas, private hands sealed per seat). The phone's seat is the **index in the party roster**, which shifts when people leave and has nothing to do with tabletop seat widgets. `?local=1` is a single-device view with `PlayerSeatSelector` and `HandDockStrip`, but there is no handover screen: the next player sees the previous hand. The tabletop lobby's "Party" button drops the chosen game. |
| Dice games   | Kniffel and Knister keep `players[]` + `SWITCH_PLAYER` in localStorage, no sync; Qwixx is one sheet per device (`roomId`/`isMultiplayer` stubs unused). They share only `Die3D`/`useDiceRollAnimation`, nothing with tabletop.                                                                                                                                                                                                                        |
| Rosters      | Five or more separate room/roster systems (party, GuessArt `lgg/ga`, Storyteller `lgg/storyteller/v1`, Melodiq WebRTC `?party=`, Gartic, local `useLobbyPlayers` lists). The party player name is stored under `guessart_player_name`.                                                                                                                                                                                                                |

## 2. Target

- **One session layer** (`src/modules/session/`): a room with a host device, a roster of **stable seat ids** (`seat_<id>`, name, colour, `deviceId | null` from `lib/deviceIdentity.ts`), the active game and the mode. Host-authoritative like tabletop (intents in, state out, snapshot on join), transport `useMultiChannelSync` (BroadcastChannel + MQTT). Replaces `universalPartyManager`; GuessArt/Storyteller keep their async links (they are multi-day games) but use the same seats model.
- **"Spieltisch" in the hub**: one entry for all table games — tabletop games (cards, board games, Liar's Dice …) and the dice games (Kniffel, Knister, Qwixx). The dice games keep their own UIs (score sheets); they are not rebuilt as widgets. Picking a game asks for the mode:
  - **Auf diesem Gerät** (local): players are added on the spot; turn changes use the handover below.
  - **Mit Handys** (session): QR code / link, players join with their phone; the host device (TV/tablet) shows the table, each phone shows its own hand or sheet.
- **Pass-and-play handover** (`src/modules/pass-and-play/`): a "Spieler wechseln" button opens a bottom sheet with the players, the next one preselected (one tap to confirm); a full-screen cover "Gerät an Anna geben — zum Aufdecken tippen" hides every private element (hands, hidden zones, own sheet) until the chosen player taps. Two taps per turn change in total. Games say what is private; the cover is shared.
- **Mobile first**: thumb-reachable bottom bars, 44 px touch targets, `100dvh`, safe areas (`docs/tech/styling.md`), no hover-only actions, portrait layouts for every table view.

## 3. Slices

Each slice is one PR (logic + tests first, UI last, components ≤ 250 lines).

1. **Pass-and-play handover** — `modules/pass-and-play` (pure turn-order helpers + `HandoverCover` + `PlayerSwitchSheet`), used by tabletop `?local=1` (hide `HandDockStrip` and owner-only hidden zones while covered). _(needs nothing else; biggest local win)_
2. **Session core** — pure session/roster reducer with stable seat ids, host election, join/leave/rename, active game; tests. Then `useSession` on `useMultiChannelSync`; `universalPartyManager` becomes a thin adapter; tabletop phones get `seat=<seatId>` instead of the roster index; one `/party` route; player name under a party key.
3. **Spieltisch hub + mode picker** — registry category `table` for tabletop and the dice games, one start screen with "Auf diesem Gerät" / "Mit Handys", the tabletop lobby's party button keeps the chosen game.
4. **Dice games local** — Kniffel and Knister switch players through the shared sheet; Qwixx gets a local multi-sheet mode.
5. **Dice games with phones** — each phone keeps its own sheet, the host shows the scoreboard and the dice; per-game sync messages on the session channel.
6. **Gartic Phone** — register the route and move its sync to the session channel (MQTT), or drop it from the picker until it is.
7. **Mobile pass** over session lobby, tabletop controller, dice games (Playwright screenshots at 390 × 844).
8. **Storyteller on player seats** (as GuessArt in #466) and the share dialog's invited/joined status.

## 4. Imports found on the way

- **Tabletop Simulator Workshop**: the save file of 2500271578 parses (186 widgets, also as BSON). The failure is the Steam metadata call: it goes through `/api/steam`, which only the Vite dev server provides; Steam's Web API sends no CORS headers. Fixed messages in this round; **decision needed** for a real fix: a tiny Worker on the existing Cloudflare deploy that proxies only `GetPublishedFileDetails` and downloads from `*.steamusercontent.com` (size-limited), or Workshop import stays companion-only with the upload hint up front. See [open-questions](../open-questions.md).
- **VirtualTabletop**: all 579 library variants import without errors, but as a static picture. Cheap wins (S each): accept `.vtt`/`.pcio` uploads with images, read `_meta` (name, rules, player count) instead of creating a token, map labels/timers/spinners/buttons to our widget types, dice faces and `faces[]` → `states`, keep `display:false` widgets, store assets once. Medium: built-in `/i/…` card and dice images (52 % of files; map to our own assets, do not bundle VTT's without a licence check), per-seat hands and `onlyVisibleForSeat`, variants, containment, old file versions. Large: VTT export, routines (translate the trivial subset first; a full interpreter is the scripting decision from the 2026-10-21 plan).
