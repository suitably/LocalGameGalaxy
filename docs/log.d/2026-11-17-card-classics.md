## 2026-11-17 — Card classics and shared playing-cards module (agent)

- New shared module `src/modules/playing-cards` (card types, deck builder for standard/Skat decks with jokers, `PlayingCard` component); listed in `docs/tech/architecture.md` §3.2. Cabo now builds on it.
- `HandoverCover` (`modules/pass-and-play`): `players`, `onRetarget` and `onCancel` are optional. Card games with a fixed turn order omit them, because the chips and the close button let another player see a hand (found in the Cabo review).
- New games `golf`, `maumau`, `schwarzer-peter` (spec `docs/tasks/CARD-CLASSICS.md`). Each was built by one slice-implementer; the orchestrator integrated them. They are registered via `src/lib/extraGameEntries.ts` and added to `docs/tech/game-catalog.md`.
- Cabo after review:
  - A peek is shown during the new phase `reveal` until the player ends the turn with `end_turn`.
  - Classic visibility: `logic/visibility.ts`, plus an optional memory aid.
  - A start peek per round, in the reducer.
  - Exactly 100 → 50.
  - The cover replaces the board instead of overlaying it.
- `scripts/check-architecture.mjs`: the cross-game import check now matches a game name only as a whole path segment. Before, `modules/playing-cards` was flagged as the game `cards`.
