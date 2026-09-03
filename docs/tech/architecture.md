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
    -   **Unified Header Integration (`useGuessArtHeader`)**: Integrates directly with [`LayoutContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/LayoutContext.tsx) and [`GlobalHeader`](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/GlobalHeader.tsx), consolidating navigation, active turn/secret word badges, match info, and game action menus into a single top header, maximizing drawing canvas screen area.
-   **Geschichtenschreiber / Storyteller (`src/games/storyteller`)**:
    -   Collaborative turn-based storytelling game featuring native pass-and-play and async multi-device play with Web Push notifications.
    -   **Web Push & Notification Settings ([`ShareStoryLinksDialog.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/storyteller/components/ShareStoryLinksDialog.tsx))**:
        -   Integrated [`PushNotificationBanner`](file:///home/deck/Projects/LocalGameGalaxy/src/components/push/PushNotificationBanner.tsx) for 1-click notification permission requests and status indicators.
        -   Automatic Web Push dispatch via [`pushClient`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/pushClient.ts) (`storytellerNotificationService.dispatchTurnPush`) on turn submission, waking up background mobile devices when it is their turn.
        -   Generates QR codes and share links embedding the host's configured push relay (`&gameRelay=...`), which guests persist to `localStorage` (`galaxy_game_relay_<gameId>`) via [`gameRelayStorage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/gameRelayStorage.ts).
    -   **Peer Synchronization**:
        -   `BroadcastChannel` (`storyteller_channel_${gameId}`) for local cross-tab communication.
        -   `mailboxService` (ephemeral MQTT broker on `storyteller_room_${gameId}`) for real-time online turn progression.
    -   IndexedDB storage via `storyteller-local` (`games` and `entries` object stores).
    -   Modular Modifiers System ("Baukasten"):
        -   **Blind Mode**: Hides preceding story text, revealing only the last 10 words of the previous player's contribution.
        -   **Time Attack**: Turn countdown timer (default 45s, configurable 30s–90s) with animated warning states and auto-submission on expiration.
        -   **Word Roulette**: Generates 3 random mandatory words from bilingual story lexicons that must be integrated into the contribution before submission.
    -   Interactive formatted Story Reader modal with chapter breaks, author attribution, word statistics, and one-click copy to clipboard.
-   **Qwixx (`src/games/qwixx`)**:
    -   Tactical roll-and-write dice game with real-time peer sync over `BroadcastChannel`.
    -   Modular sheet configuration engine (`sheetDefinitions.ts`) supporting official expansions (Classic, Gemixxt A/B, Big Points, Connected, Double, Bonus).
    -   Dynamic dice highlight engine (`diceHighlight.ts`) and variant-aware scoring reducer (`qwixxReducer.ts`).
    -   See [Qwixx Sheet Rules](file:///home/deck/Projects/LocalGameGalaxy/docs/tech/qwixx-sheet-rules.md) for full variant specifications.

### Web Push Relay & Game-Scoped Notification Architecture
- **Web Push Protocol (RFC 8291 / RFC 8292 VAPID)**:
  - Enables closed-browser background OS push notifications for turn-based games like **GuessArt** (*Montagsmaler*).
  - Background Service Worker ([`public/sw-push.js`](file:///home/deck/Projects/LocalGameGalaxy/public/sw-push.js)) receives incoming OS push packets and deep-links directly into the game on notification click.
- **Host-Driven, Game-Scoped Relay**:
  - The host's configured backend or Cloudflare Worker is passed in game links via `&gameRelay=...`.
  - Guests parse `gameRelay` into `localStorage` (`galaxy_game_relay_<gameId>`) via [`gameRelayStorage.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/gameRelayStorage.ts) with a 7-day TTL and automatic stale-entry cleanup. Using `localStorage` (not `sessionStorage`) ensures push registration survives app/tab closures.
  - Guests' global settings remain unpolluted, keeping the host's server isolated exclusively to the shared match via game-scoped key prefixes.
- **Relay Implementations**:
  - **Cloudflare Worker**: Zero-cost, 24/7 serverless push relay ([`server/cloudflare-push-relay/`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/)). Uses [`webpush.ts`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/webpush.ts) for RFC 8291 payload encryption (ECDH + AES-128-GCM) and VAPID JWT signing via Web Crypto API. Subscriptions stored in Cloudflare KV (with in-memory fallback).
  - **Nexumia Self-Hosted Server**: Built-in `/api/push/*` endpoints backed by [`webPushService.js`](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/webPushService.js) with `web-push` npm library. Subscriptions persisted to `.push_subscriptions.json` with debounced writes, loaded on startup, and saved on process exit.

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
