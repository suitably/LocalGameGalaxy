# System Architecture [ID: TECH-ARCH]

> [!IMPORTANT]
> This document is the **Single Source of Truth** for the project's technical architecture.
> **AI Agents**: You MUST update this file if you make any structural changes to the codebase.

## 1. High-Level Overview

**LocalGameGalaxy** (suitably/LocalGameGalaxy) is a purely client-side, offline-first web application designed to act as a hub for local group games (like Werewolf).

It is built with:
-   **Runtime**: React 18+ (SPA)
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **UI Framework**: Material UI (MUI)
-   **State Management**: React `useReducer` / Context API (Feature-based)
-   **Persistence**: `dexie` (IndexedDB wrap) & `localStorage`
-   **I18n**: `i18next`

## 2. Project Structure

The project follows a **Feature-Based Architecture**.

```
src/
├── assets/          # Static assets
├── components/      # Shared/Common UI components (App-wide)
├── context/         # Global App State (Theme, etc.)
├── features/        # Shared Feature Logic
├── games/           # GAME MODULES (Core Domain Logic)
│   └── werewolf/    # Example Game Module
│       ├── components/  # Game-specific UI
│       ├── logic/       # Pure functions, reducers, types
│       ├── hooks/       # Custom hooks
│       └── WerewolfGame.tsx # Entry point for the game
├── lib/             # Shared utilities/libs
├── App.tsx          # Main Router/Layout
└── main.tsx         # Entry Point
```

## 3. Core Concepts

### Game Modules (`src/games/*`)
Each game is self-contained. It typically exports a main component (e.g., `WerewolfGame`, `GuessArtGame`) and manages its own internal state via a state machine / reducer / repository.
-   **Logic Separation**: Business logic (rules, win conditions) resides in `logic/`. It should be testable without UI.
-   **UI**: Components reside in `components/`.
-   **GuessArt (`src/games/guessart`)**:
    -   Offline-first drawing & guessing game with native pass-and-play mechanics.
    -   IndexedDB storage via `guessart-local` database (`games`, `rounds`, `catalogues`, `metadata` stores).
    -   In-game Category & Word Catalogue Editor (`CatalogueEditorDialog`) with local IndexedDB persistence and automated Git Pull Request publishing pipeline via helper server (`POST /api/guessart/publish-catalogue`).
    -   Integrated Excalidraw drawing canvas & animated stroke replay engine (`ExcalidrawViewer`).
    -   Fuzzy evaluation engine with German umlaut transliteration, diacritic normalization, and inflection generation (`guessEvaluator`, `lingo`).
    -   Deterministic multi-stage hint provider (`HintWordSlots`, `HintLetterChips`).
-   **Qwixx (`src/games/qwixx`)**:
    -   Tactical roll-and-write dice game with real-time peer sync over `BroadcastChannel`.
    -   Modular sheet configuration engine (`sheetDefinitions.ts`) supporting official expansions (Classic, Gemixxt A/B, Big Points, Connected, Double, Bonus).
    -   Dynamic dice highlight engine (`diceHighlight.ts`) and variant-aware scoring reducer (`qwixxReducer.ts`).
    -   See [Qwixx Sheet Rules](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/qwixx-sheet-rules.md) for full variant specifications.

### Nexumia Server & Multi-Game Companion
The backend helper server (`server/`) is generalized as **Nexumia Server**:
- Provides local song library management and streaming (`/api/songs`, `/media`)
- BitTorrent WebRTC signaling tracker (`bittorrent-tracker` on HTTP/HTTPS upgrade)
- API key generation and friend access delegation with per-key rate limits and permissions
- GitHub issue & GuessArt catalogue Pull Request publishing proxy (`/api/feedback`, `/api/guessart/publish-catalogue`)
- **Docker Architecture**: Multi-stage build with `base` (lightweight ~200MB Node.js + yt-dlp/ffmpeg) and `full` (Python, PyTorch, whisper, audio-separator for Melodiq vocal separation), selected via Docker Compose profiles (`melodiq`).

### GitHub Integration Architecture
- **Hybrid Model**: Direct GitHub API client (`src/lib/github.ts`) using a locally stored Personal Access Token (PAT) as priority, with fallback to the Nexumia Server proxy.
- Enables submitting feedback, reporting bugs, and publishing GuessArt word catalogues directly from the browser/PWA without requiring a local helper server.

### State Management
-   **Reducers / Engine**: Complex game logic is handled by standard Redux-pattern reducers or explicit state machines (`LocalGameEngine`).
-   **Context / Hooks**: Pass dispatch/state down the tree with custom hooks (`useGuessArtGame`, `useGuessArtLobby`).

### Internationalization
-   `src/i18n.ts` and `public/locales/{de,en}/translation.json` handle translations.
-   All user-facing text must be internationalized.

## 4. Component Design & SOLID Guidelines

To ensure the codebase remains maintainable and free of spaghetti code, all future development MUST adhere to the following React-specific SOLID patterns:

1.  **Single Responsibility Principle (SRP)**:
    -   **Container vs. Presentational**: Separate components that fetch data or manage state (Containers) from components that purely render UI based on props (Presentational).
    -   **Custom Hooks**: Extract complex `useEffect`, `useState`, or business logic into custom hooks (e.g., `useScoreCalculation.ts`, `useGuessArtGame.ts`) rather than bloating the React component body.
2.  **Open/Closed Principle**:
    -   Components should be open for extension but closed for modification. Use `children` props or render props to allow parents to customize internal content without modifying the core component.
3.  **Interface Segregation**:
    -   Don't pass massive objects as props if a component only needs one or two fields. Destructure or pass primitive values when possible, making components easier to reuse.
4.  **Dependency Inversion**:
    -   Avoid hardcoding deep imports to specific implementations if a Context or a passed prop can invert the dependency.

**File Size Policy**: Any React component exceeding 250 lines is a strong candidate for refactoring into smaller sub-components. Agents must proactively plan the structural breakdown of a feature *before* writing code.
