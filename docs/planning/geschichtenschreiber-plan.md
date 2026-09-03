# Implementation Plan: Geschichtenschreiber (Storyteller) [ID: STORYTELLER-PLAN]

## 1. Goal Description
Implement **Geschichtenschreiber** (Collaborative Storytelling Game) as specified in Issue #127.
Players collaboratively write a story, turn by turn. The game builds upon and reuses the battle-tested local-first / pass-and-play / remote-turn architecture of **GuessArt** and features a modular modifiers system ("Baukasten"):
1. **Blind Mode**: Players only see the last 10 words of the previous player's contribution instead of the full story.
2. **Time Attack**: A turn timer (e.g. 45 seconds) runs down per turn.
3. **Word Roulette**: The engine selects 3 random mandatory words per turn that must be used in the written contribution before the player can submit.

## 2. Architecture & SOLID Principles

### Component Hierarchy & File Structure
All files adhere to SRP and strict size limits (<250 lines per component):

```
src/games/storyteller/
├── StorytellerGame.tsx               # Orchestrator & route screen (Lobby vs Active vs Reader)
├── index.ts                          # Public module export
├── types.ts                          # Domain types, Turn/Game models, Modifier interfaces
├── logic/
│   ├── db.ts                         # IndexedDB storage provider (storyteller-db)
│   ├── repository.ts                 # CRUD for games and story entries
│   ├── engine.ts                     # Turn progression, round advancement, snapshot import/export
│   ├── storyLexicon.ts               # Bilingual word pool for Word Roulette
│   ├── modifiers.ts                  # Modifier engine: Blind text extractor, Roulette word validator
│   ├── playerAssignment.ts           # Local vs remote player assignment & persistence
│   └── storyteller.test.ts           # Vitest unit tests for engine, modifiers, roulette & blind mode
├── hooks/
│   ├── useStorytellerLobby.ts        # Lobby state, player setup, modifier settings, active stories
│   ├── useStorytellerGame.ts         # Active game hook: turn state, entry drafting, submission
│   └── useTurnTimer.ts               # Countdown hook for Time Attack
└── components/
    ├── StoryLobby.tsx                # Setup view: players, modifiers checklist, active games
    ├── StoryHeader.tsx               # Top bar: title, turn counter, current player, share/exit
    ├── StoryWriterView.tsx           # Contribution editor view with active modifier widgets
    ├── StoryContextCard.tsx          # Previous context view (Full story or Blind 10 words)
    ├── ModifierRouletteBar.tsx       # Live status chips for Word Roulette required words
    ├── ModifierTimerBar.tsx          # Animated countdown progress bar for Time Attack
    ├── WaitingForStoryTurnView.tsx   # Waiting view for remote turns with claim/share options
    ├── StoryReaderModal.tsx          # Formatted story book reader with export/copy functions
    └── EditStoryDialog.tsx           # Rename game & edit player names dialog
```

### Game Registry Registration
Register `storyteller` in `src/lib/gameRegistry.tsx`:
- Route: `games/storyteller`
- Title key: `games.storyteller.title` ("Geschichtenschreiber" in DE, "Storyteller" in EN)
- Category: `party`
- Icon: `<AutoStoriesIcon />`

## 3. Modifiers Specification ("Baukasten")
- **Extensibility**: Defined via `StoryModifierSettings` and `ModifierDefinition[]`. Host toggles modifiers before starting the story.
- **Blind Mode**:
  - Slices the preceding turn's text to the last 10 words (`...` prefix).
  - Keeps the rest hidden until the game concludes or full story reader is opened.
- **Time Attack**:
  - 45s countdown (configurable: 30s, 45s, 60s, 90s).
  - Turns warning yellow at 15s, flashing red at 5s. Auto-submits draft when time reaches 0.
- **Word Roulette**:
  - Draws 3 random words per turn from `storyLexicon.ts` (tailored per game language: DE/EN).
  - Real-time matching using regex word boundaries and stemming/inflections.
  - Interactive chip badges turn green with checkmarks when fulfilled. Submitting is blocked until all 3 words are integrated.

## 4. Verification Plan
1. **Unit Testing (`npm test`)**:
   - `modifiers.test.ts` / `storyteller.test.ts`: test blind mode word extraction, required word matching logic, engine transitions, and snapshot serialization.
2. **Linting & Compilation**:
   - Run `npm run lint` (0 errors).
   - Run `npm run build` (`tsc -b && vite build`) (0 errors).
3. **End-to-End Game Flow**:
   - Create game with 3 players (mix of local and remote).
   - Verify modifiers checklist in lobby.
   - Verify Blind Mode hides previous text except last 10 words.
   - Verify Time Attack timer counts down and visually updates.
   - Verify Word Roulette disables submit until all 3 words appear in the editor.
   - Verify story completion and Story Reader displays full story with author attribution and copy to clipboard.
