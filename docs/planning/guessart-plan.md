# GuessArt Integration Plan [ID: GUESSART-PLAN]

## 1. Goal Description
Integrate the drawing and guessing game (formerly Yidi, renamed to **GuessArt**) into **LocalGameGalaxy** as a first-class, local-first game module.
Key tenets:
- **Local-First & Offline**: Playable entirely on device without remote server dependencies. Local state persisted via IndexedDB and local storage.
- **Deep Integration**: Integrated natively into LocalGameGalaxy's component architecture, GameRegistry, UI theme, and localization systems rather than tracking an external git repo.
- **Rich Offline Lexicon**: Built-in bilingual (German & English) categories and word databases with difficulty levels, synonyms, and inflections, plus support for custom categories and manual word entry.
- **Interactive Drawing & Animated Replay**: Excalidraw-based drawing canvas with draw sequence recording and animated replay during the guessing phase.
- **Multi-Stage Hinting & Intelligent Guess Evaluation**: Structural word masks, anagram/letter bank hints, fuzzy matching with Levenshtein distances, and grammatical variant detection.
- **Pass-and-Play / Local Group UX**: Turn rotation between drawer and guessers, round tracking, active game resumption, and round history review.

## 2. Component Hierarchy & SOLID Structure
To maintain file size limits (<250 lines) and strict Single Responsibility Principle (SRP):

```
src/games/guessart/
├── GuessArtGame.tsx                # Container & phase router (Lobby / Active / History / Info)
├── index.ts                        # Module export point
├── logic/
│   ├── types.ts                    # Strongly typed domain interfaces & models
│   ├── db.ts                       # IndexedDB storage provider with schema versioning
│   ├── repository.ts               # Game, round, and catalogue CRUD data access
│   ├── engine.ts                   # Game lifecycle transitions & state mutation engine
│   ├── lingo.ts                    # Linguistic normalization, umlauts, plural & gender variants
│   ├── guessEvaluator.ts           # Guess matching & fuzzy evaluation logic
│   ├── hintResolver.ts             # Hint mask & letter pool generation
│   ├── catalogueManager.ts         # Lexicon & categories repository manager
│   ├── defaultLexicon.ts           # Offline default seed dataset (DE & EN categories & words)
│   └── excalidrawScene.ts          # Drawing scene metadata, ordering, and animation planner
├── hooks/
│   ├── useGuessArtGame.ts          # React hook wrapping game lifecycle & state transitions
│   ├── useGuessArtLobby.ts         # React hook for lobby players & active games list
│   └── useKeyboardInsets.ts        # Mobile keyboard detection & inset adjustments
└── components/
    ├── GameSetup.tsx               # Lobby setup view: players, language, word mode
    ├── ActiveGamesList.tsx         # Active / resumed local games management
    ├── GameHeader.tsx              # Phase header, round counter, drawer/guesser indicators
    ├── WordSelector.tsx            # Word selection: category cards & difficulty or manual input
    ├── DrawingCanvas.tsx           # Excalidraw drawing canvas & submission controls
    ├── ExcalidrawLazy.tsx          # Lazy-loaded Excalidraw wrapper
    ├── ExcalidrawViewer.tsx        # Animated drawing playback viewer with skip/speed controls
    ├── GuessPanel.tsx              # Guess input area, hint button, and submission controls
    ├── HintLetterChips.tsx         # Scrambled letter chips component for hint stage 2
    ├── HintWordSlots.tsx           # Character slots and placeholder rendering
    ├── RoundSuccessModal.tsx       # Round victory modal with celebratory animations
    └── GameInfoDialog.tsx          # How-to-play modal and game rules
```

## 3. Localization Strategy
Add all translation keys for English and German to `public/locales/en/translation.json` and `public/locales/de/translation.json`:
- `games.guessart.title` = "GuessArt"
- `games.guessart.description` = "Zeichnen & Raten Partyspiel" / "Drawing & Guessing Party Game"
- `guessart.*` namespace covering setup, lobby, gameplay, drawing, hints, guessing, rounds, and errors.

## 4. Verification Plan
- Unit tests for engine transitions, fuzzy guess evaluation, and hint generation.
- Static analysis check (`npm run lint`).
- TypeScript and Vite production bundle build (`npm run build`).
- UI verification in browser (game creation, drawing, submission, animated replay, hints, guessing, round completion).
