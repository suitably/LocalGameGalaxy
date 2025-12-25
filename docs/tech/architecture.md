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
Each game is self-contained. It typically exports a main component (e.g., `WerewolfGame`) and manages its own internal state via a `gameReducer`.
-   **Logic Separation**: Business logic (rules, win conditions) resides in `logic/`. It should be testable without UI.
-   **UI**: Components reside in `components/`.

### State Management
-   **Reducers**: Complex game logic is handled by standard Redux-pattern reducers (`state + action = new_state`).
-   **Context**: Pass dispatch/state down the tree.

### Internationalization
-   `src/i18n.ts` handles translations.
-   All user-facing text must be internationalized.
