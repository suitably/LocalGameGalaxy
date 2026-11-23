---
type: Spec
title: 'Classic card games: Golf, Mau-Mau, Schwarzer Peter (pass-and-play)'
description: 'Agent-ready spec for three rule-enforced classic card games on one device, built on the shared playing-cards and pass-and-play modules, with the lessons from the Cabo review.'
tags: [games, cards, pass-and-play, spec]
status: draft
generated:
  at: 2026-11-17T10:00:00+01:00
  by: claude-code
verified:
  at: 2026-11-17
  method: 'APIs named below checked in src/modules/playing-cards, src/modules/pass-and-play/HandoverCover.tsx, src/modules/player-management, src/games/cabo on branch ccr-9f24cfd2-mxv95b'
sources:
  - 'src/modules/playing-cards/index.ts'
  - 'src/modules/pass-and-play/HandoverCover.tsx'
  - 'src/games/cabo/'
---

# Classic card games: Golf, Mau-Mau, Schwarzer Peter

## 1. Request

The user asked for more classic card games next to Cabo, built with subagents. The orchestrator chose three public-domain classics that work on one device: **Golf** (6-card golf, Cabo's closest relative, all information public), **Mau-Mau** (German Crazy Eights, hidden hands) and **Schwarzer Peter** (Old Maid, hidden hands). One slice-implementer per game; the games are independent.

## 2. Facts (shared building blocks — reuse, never re-implement)

- **Cards** — `src/modules/playing-cards` (import from `'../../../modules/playing-cards'`):
  - Types `Card { id; rank; suit }`, `Rank` (`'A'…'K' | 'JOKER'`), `Suit`.
  - `createDeck({ ranks?, jokers? })`, `shuffledDeck(opts)`, `STANDARD_RANKS`, `SKAT_RANKS` (7…A), `SUITS`, `isRed`, `cardText`, `SUIT_SYMBOL`.
  - `<PlayingCard card faceUp selected highlighted dimmed size="sm|md" onClick label />`: without `onClick` it is static.
- **Pass and play** — `HandoverCover` from `'../../../modules/pass-and-play'`: props `player`, `onReveal`.
  - Do **not** pass `players`, `onRetarget` or `onCancel`. Turn order is fixed, so no player may claim the device or skip the cover.
- **Players** — `useLobbyPlayers({ storageKey: STORAGE_KEYS.<KEY>, defaultPlayers, minPlayers, maxPlayers })` and `<PlayerManagerCard>` from `'../../../modules/player-management'`. Storage keys are already registered in `src/lib/storage.ts`: `GOLF_LOBBY_PLAYERS`, `MAUMAU_LOBBY_PLAYERS`, `SCHWARZER_PETER_LOBBY_PLAYERS`.
- **Layout/title** — `GameLayout` (`src/components/Layout/GameLayout`), `usePageTitle` (`src/context/TitleContext`).
- **Reference implementation: `src/games/cabo/`** — copy its structure, not its code:
  - `logic/types.ts` + `logic/engine.ts`: `applyAction(state, action) → { ok, state } | { ok: false, error }`, pure, tested.
  - `hooks/use<Game>Game.ts`: pure reducer `<game>StageReducer` + hook, tested; a `start` action takes optional `deck` for deterministic tests.
  - `i18n/index.ts`: `init<Game>I18n()` adds `games.<id>.*` for `de` and `en`, called at module load in the entry component.
  - `definition.ts`: hub entry built with `createElement` (a `.tsx` file trips the fast-refresh lint rule).
  - `index.ts`: exports the entry component.
- **Lessons from the Cabo review (must hold in every game):**
  1. Never end a turn in the same step that reveals private information. Show what was drawn or peeked, then end the turn on an explicit "Done / pass the device" action.
  2. While the cover is shown, do **not** render the private board at all (render the cover instead of the table, not on top of it).
  3. No hard-coded user-facing strings, including chips such as "Mau" (use `t()`). Give face-down cards distinct accessible names, e.g. "Card 3 of Ben".
  4. Disable actions that are illegal now instead of silently ignoring them; the engine still validates.
  5. Engine tests cover edge cases: empty deck / reshuffle, ties, last-turn ends, invalid actions. Add a seeded random-play test asserting card conservation.

## 3. Decisions (orchestrator)

### 3.1 Golf — id `golf`, route `games/golf`, entry `GolfGame`

- **Players and deck:** 2–6 players. For 2–4 players, 52 cards + 2 jokers. For 5–6 players, two such decks (ids must stay unique: offset the second deck's ids by 54).
- **Layout:** each player gets 6 cards face down in 2 rows × 3 columns (slots 0–2 top, 3–5 bottom). One card starts the discard pile.
- **Start:** each player in turn flips any 2 of their own cards (phase `flip_start`).
- **Turn:** draw from the deck (visible only to the drawer, but nothing is secret) or take the top discard. Then:
  - swap the drawn card with any own slot: the old card goes face up to the discard, and the new card lies face up; or
  - if drawn from the deck only: discard it and flip one face-down own card. If the player has no face-down card left, discarding alone is allowed.
- **Round end:** when a player has all 6 cards face up, every other player gets exactly one more turn. Then all cards are revealed and scored.
- **Values:** A = 1, 2–10 face value, J = 10, Q = 10, K = 0, Joker = −2.
  - Two cards of equal rank in the same column score 0 together. Jokers never cancel (a joker pair = −4).
- **Game:** 9 rounds ("holes"); the starting player rotates. Lowest total wins; ties share the win.
- **No handover cover:** all information is public. Show whose turn it is prominently.

### 3.2 Mau-Mau — id `maumau`, route `games/maumau`, entry `MauMauGame`

- **Players and deck:** 2–5 players, 32-card Skat deck (`SKAT_RANKS`). 5 cards each; one card face up starts the discard pile. The start card has **no** effect.
- **Play:** a card matching the top card's suit or rank (or the wished suit after a jack).
- **Special cards:**
  - **7:** the next player must draw 2. They may answer with their own 7 instead (stacking +2 each). Taking the penalty (`take_penalty`, 2 × stacked sevens) ends their turn.
  - **8:** the next player is skipped.
  - **Jack (Bube):** playable on anything except another jack. The player then wishes a suit (all four allowed), and the next card must match that suit. A jack as the last card is allowed.
- **No playable card / chooses not to play:** draw 1. If that card is playable, the player may play it immediately or pass. Otherwise the turn ends with an explicit pass. After drawing, only the drawn card may be played.
- **Deck empty:** reshuffle the discard pile except its top card. If nothing can be drawn, the player may pass.
- **Mau:** when a player has one card left, show "Mau!" automatically (no penalty mechanics). The first player with an empty hand wins the round ("Mau-Mau!").
- **Game:** play rounds; the scoreboard counts round wins. The starting player rotates. "New game" returns to setup.
- **Handover cover** before every turn; hidden hands. Show each player's card count, never their faces.

### 3.3 Schwarzer Peter — id `schwarzer-peter`, route `games/schwarzer-peter`, entry `SchwarzerPeterGame`

- **Players and deck:** 2–6 players. 52 standard cards minus J♣ = 51 cards. J♠ is the Schwarzer Peter.
- **Pairs:** a pair is two cards of the same rank **and** colour (red pair, black pair). J♥ and J♦ form a pair, and J♠ never pairs.
- **Deal and turns:**
  - Deal all cards and discard every pair automatically. Show a short summary per player ("discarded N pairs") when that player first reveals.
  - Each turn, the current player draws one face-down card from the next player clockwise who still holds cards. Before a draw, shuffle the source hand order with the injected RNG, so the source owner's arrangement gives nothing away. The picker taps one of the face-down cards.
  - A drawn card that completes a pair discards the pair immediately.
  - Then show the drawn card to the drawer only, and end the turn on "Done" (lesson 1).
- **Out:** players with no cards are out (safe) and are skipped. The game ends when only J♠ is left; its holder loses.
- **Game:** rounds; the scoreboard counts losses ("Schwarzer Peter" marks). "Next round" re-deals.
- **Handover cover** before every turn.

## 4. Slices (one implementer per game, files only under `src/games/<id>/`)

### Slice 1 — logic

`logic/types.ts`, `logic/engine.ts` (+ `logic/scoring.ts` or similar if useful) with Vitest tests (`*.test.ts`, ≤ 300 lines each — split files). Inject randomness (deck / shuffle function) so tests are deterministic.

### Slice 2 — state hook

`hooks/use<Game>Game.ts`: pure exported reducer + hook. It manages the cover (`coverFor`) or, for Golf, only the game. Tests in `hooks/*.test.ts`.

### Slice 3 — UI

`<Game>Game.tsx` (entry, < 160 lines), `components/*` (each ≤ 250 lines): setup with `PlayerManagerCard` and a collapsible rules summary (see `src/games/cabo/components/CaboSetup.tsx`), table, round summary. Also `i18n/index.ts` (de + en, all strings), `definition.ts` (category `'cards'`, MUI icon from `@mui/icons-material/*Rounded`), `index.ts`.

### Close (orchestrator, not the implementer)

`src/lib/extraGameEntries.ts`, hub title/description in `public/locales/{de,en}/translation.json`, docs, changelog, gates, commit.

## 5. Acceptance criteria

- `npx vitest run src/games/<id>` passes; `npx eslint src/games/<id>` has 0 errors **and 0 warnings**; `npx tsc -b --pretty false 2>&1 | grep "src/games/<id>"` is empty.
- No imports from other `src/games/*` folders; no `localStorage`; no `any`; no native dialogs; no hex/rgb colours.
- A full round can be played to the end from the UI; illegal actions are disabled; private cards never visible to the wrong player.

## 6. Progress

- [x] Shared module `playing-cards`, optional retarget/cancel in `HandoverCover`, storage keys
- [x] Golf
- [x] Mau-Mau
- [x] Schwarzer Peter
- [x] Integration (registry, locales, docs, gates)
