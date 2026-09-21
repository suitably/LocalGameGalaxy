# System Architecture

> [!IMPORTANT]
> This document is the **Single Source of Truth** for the project's technical architecture.
> **AI Agents**: You MUST update this file if you make any structural changes to the codebase.

## 1. High-Level Overview

**LocalGameGalaxy** (suitably/LocalGameGalaxy) is a purely client-side, offline-first web application designed to act as a hub for local group games (like Werewolf).

It is built with:
-   **Runtime**: React 19 (SPA)
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
├── modules/         # Shared Cross-Game Feature Modules (e.g. player-management)
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
    -   In-game Category & Word Catalogue Editor (`CatalogueEditorDialog`) with local IndexedDB persistence and automated Git Pull Request publishing pipeline directly via GitHub REST API.
    -   Integrated Excalidraw drawing canvas & animated stroke replay engine (`ExcalidrawViewer`).
    -   Fuzzy evaluation engine with German umlaut transliteration, diacritic normalization, and inflection generation (`guessEvaluator`, `lingo`).
    -   Deterministic multi-stage hint provider (`HintWordSlots`, `HintLetterChips`).
    -   **Cross-Language Word Resolution**: Supports multilingual sessions (e.g., Player A draws in English, Player B guesses in German). The engine (`toRoundPayload`, `listRounds`) dynamically localizes the round payload (`word`, `wordMask`, `hintLetters`) to match the viewer's active language, enriches missing language translations from `DEFAULT_WORDS`, and accepts guesses in either language.
    -   **Unified Header Integration (`useGuessArtHeader`)**: Integrates directly with [`LayoutContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/LayoutContext.tsx) and [`GlobalHeader`](file:///home/deck/Projects/LocalGameGalaxy/src/components/Layout/GlobalHeader.tsx), consolidating navigation, active turn/secret word badges, match info, and game action menus into a single top header, maximizing drawing canvas screen area.
    -   **Peer Synchronization**: Uses `guessArtMailbox` (typed instance of generic `MqttMailboxService<GameSnapshot>` from `src/modules/sync`) over public WSS MQTT brokers with LZString compression, handling asynchronous turn progression and presence sync. Transport is fully decoupled from domain engines via Dependency Inversion.
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
-   **Universal Party Lobby & Gartic Phone (`src/features/party` & `src/games/garticphone`)**:
    -   Centralized "Jackbox-style" room lobby where all players connect once via QR code or link (`#/party?room=XYZ`).
    -   **Serverless Real-Time Communication**: Operates 100% serverless over public WSS MQTT brokers (`wss://broker.hivemq.com:8884/mqtt` / `wss://broker.emqx.io:8084/mqtt`) and local `BroadcastChannel`. No local helper server or backend connection is required.
    -   Hosts can launch **Gartic Phone** for all connected devices simultaneously, with isolated drawing/guessing views per device, synchronized round progression, animated album reveals, and seamless return to the lobby.
    -   **SRP Architecture**: Decomposed into focused custom hooks (`useGarticGameState` for pure game rules and `sessionStorageSafe` persistence, `useGarticSync` for `useMultiChannelSync` coordination) and a slim view coordinator component (`GarticPhoneGame.tsx`, < 180 lines).
-   **Virtual Tabletop Engine (`src/games/tabletop`)**:
    -   Declarative PlayingCards.io (`.pcio` / `.json`) and universal tabletop game engine.
    -   **Multi-View Architecture**: Dual-view setup supporting a shared tabletop board on TV/tablet (`TabletopSurface.tsx` with auto-fit, fog-of-war for opponent hands, and flying card animations) and private smartphone controllers (`TabletopControllerView.tsx` with hand dock, swipe-up "Flick to TV" card gesture, and `[Hand | Tisch]` view switcher).
    -   **Storage & Ingest**: Client-side ZIP unpacking via `fflate`, IndexedDB persistence (`galaxy_tabletop_db`), in-app metadata editor, and `.pcio`/`.json` exporter.
    -   **Peer Synchronization**: Real-time multi-channel sync via `useMultiChannelSync` and `MqttMailboxService` over public MQTT relays with state snapshot reconciliation.
    -   **Party Mode Integration**: Direct integration into `UniversalPartyManager` and `PartyGamePickerModal`, allowing the party host to launch any built-in or custom imported tabletop game for connected guests.
    -   **Community Publishing**: Integrated GitHub PR creation via Octokit/REST API (`createGitHubPR`) to submit new game definitions upstream.
-   **Melodiq (`src/games/melodiq`)**:
    -   Offline-capable karaoke and pitch-matching game supporting UltraStar TXT parsing, multi-track vocals, WebRTC remote microphones, and TV/presentation broadcast mode.
    -   **Dual-Path Video Architecture**: Supports synchronized background videos via local media files (HTTP 206 streaming for MP4, WebM, AVI, MKV) and embedded YouTube URLs (via client-side YouTube IFrame Player API adapter, muted with programmatic seeking synchronized to `audioRef.currentTime`).
    -   **SRP Architecture**: Gameplay session decomposed into focused custom hooks (`useSessionAudioController` for playback, sync, and media lifecycle; `useSessionScoringController` for pitch evaluation, player visibility, and responsive grid layouts; `useParsedSong` for UltraStar parsing) and focused subcomponents (`SessionTopControls`, `SessionLyricsVisualizer`, `SessionBackgroundMedia`, `SessionPauseOverlay`, `SessionScoreOverlay`, `SessionFolderPrompt`) orchestrated by a slim view coordinator (`MelodiqSession.tsx`, < 200 lines).

### Shared Modules (`src/modules/*`)
- **Player Management (`src/modules/player-management`)**:
  - Reusable player configuration hook (`useLobbyPlayers`), pure domain functions (`playerLogic.ts`), and UI component (`PlayerManagerCard`) shared across games (GuessArt, Geschichtenschreiber/Storyteller, Imposter, Werewolf, Cards).
  - Unconstrained player removal: Allows players down to 0, ensuring default placeholders ("Spieler 1", "Spieler 2") can be deleted and replaced with custom names.
  - Fully configurable `minPlayers` and `maxPlayers` constraints, with duplicate name prevention, trimming, and full i18n support.
- **Sync & Mailbox (`src/modules/sync`)**:
  - Reusable generic MQTT mailbox service (`MqttMailboxService`) providing clean, strongly typed asynchronous peer synchronization over MQTT brokers for any turn-based game, completely decoupled from game-specific domains. Used by GuessArt, Storyteller, and Universal Party.
  - Multi-channel synchronization hook (`useMultiChannelSync`) and coordinator (`MultiChannelSyncCoordinator`) unifying local `BroadcastChannel` and remote MQTT communication into a lifecycle-safe, resource-leak-free abstraction used by Storyteller and Gartic Phone.
- **Drawing & Stroke Replay (`src/modules/drawing`)**:
  - Encapsulates interactive drawing canvas (`DrawingCanvas`), Excalidraw lazy-loading (`ExcalidrawLazy`), animated stroke playback (`ExcalidrawViewer`), and scene parsing/ordering (`excalidrawScene`). Shared cleanly by GuessArt and Gartic Phone without inter-game dependencies.
- **Session Sharing & Editing (`src/modules/sharing`)**:
  - Reusable dialogs (`ShareSessionLinksDialog`, `EditSessionDialog`), URL parsing utilities (`parseGameUrlParams`, `cleanWindowUrlQuery`), and snapshot join hook (`useGameJoinUrl`) providing unified deep-link extraction across hash and search routing. Shared by GuessArt, Storyteller, Wordle, and Gartic Phone.
- **Async Game Helpers (`src/modules/async-game`)**:
  - Reusable IndexedDB transaction and cursor runners (`createIdbStoreOperations`, `runWithStore`, `cursorCollect`, `requestToPromise`) eliminating boilerplate and error handling across offline-first Dexie stores. Used by GuessArt and Storyteller.
- **Audio Processing (`src/modules/audio`)**:
  - Hardware microphone capture, Autocorrelation-based pitch detection, RMS volume gating, and frequency-to-MIDI mapping (`MicrophoneManager`, `AudioUtils`). Shared across Melodiq Karaoke and Melodiq Notes without cross-game imports.

### Web Push & ntfy Hybrid Notification Architecture
- **Hybrid Multi-Channel Architecture**:
  - Supports standard **Web Push (RFC 8291 / RFC 8292 VAPID)** for mainstream Google/Mozilla/Apple browsers.
  - Supports **100% De-Googled Push via ntfy** (`ntfy.sh` or self-hosted ntfy server) for privacy-conscious users without Google Play Services or Firebase Cloud Messaging.
  - Automatic fallback & capability detection: If standard Web Push registration fails (e.g. missing FCM service on deGoogled Android), the client seamlessly suggests and registers ntfy.
  - User can configure preferred notification channel (`auto`, `webpush`, `ntfy`, `both`) in Settings.
- **Relay Implementations**:
  - **Cloudflare Worker**: Zero-cost, 24/7 serverless push relay ([`server/cloudflare-push-relay/`](file:///home/deck/Projects/LocalGameGalaxy/server/cloudflare-push-relay/)). Dispatches both RFC 8291 encrypted Web Push packets and HTTP POST requests to `ntfy.sh` (or custom ntfy server) in parallel. Subscriptions stored in Cloudflare KV (with in-memory fallback).
  - **Direct Client Fallback**: [`pushClient.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/push/pushClient.ts) can also ping `ntfy.sh` topics directly via CORS if no relay is configured or the relay is unavailable.
- **Background Service Worker**:
  - [`public/sw-push.js`](file:///home/deck/Projects/LocalGameGalaxy/public/sw-push.js) handles Web Push wakeups and deep links directly into the active game on notification click.

### GitHub Integration Architecture
- **Hybrid Model**: Direct GitHub API client (`src/lib/github.ts`) using a locally stored Personal Access Token (PAT) as priority, with fallback to the companion server proxy.
- Enables submitting feedback, reporting bugs, and publishing GuessArt word catalogues directly from the browser/PWA without requiring a local helper server.

### Companion Backend (Hono TypeScript Micro-Kernel)
- **Modular Micro-Kernel**: The optional companion backend (`server/src/index.ts`) is built on **Hono** running on `@hono/node-server`. It replaces legacy monolithic Express code with pluggable modules (`server/src/plugins/`).
- **Plugins**:
  - `melodiq`: Song scanning, media streaming with HTTP 206 Range requests, USDB search/downloads, AI stem separation, and playlist persistence.
  - `relay`: WebRTC tracker signaling on HTTP WebSocket upgrade.
- **Security & Networking**: Bearer token authentication, granular API key capabilities, CORS allowlisting, and Private Network Access (PNA) preflight support for cross-origin local IP communication.

### State Management & Context Architecture
-   **Reducers / Engine**: Complex game logic is handled by standard Redux-pattern reducers or explicit state machines (`LocalGameEngine`).
-   **Context / Hooks**: Pass dispatch/state down the tree with custom hooks (`useGuessArtGame`, `useGuessArtLobby`).
-   **Segregated Layout Contexts (`src/context/`)**: To prevent unnecessary re-renders (Interface Segregation Principle), UI layout state is split across orthogonal contexts:
    -   [`TitleContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/TitleContext.tsx): Page title state (`title`, `setTitle`, `usePageTitle`, `useTitle`).
    -   [`HeaderLayoutContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/HeaderLayoutContext.tsx): Header visibility, actions, items, and home handlers (`headerHidden`, `customHeaderTitle`, `customHeaderActions`, `menuItems`, `homeAction`, `hideHome`, `useHeaderLayout`).
    -   [`SettingsModeContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/SettingsModeContext.tsx): Settings mode display flag (`isSettingsMode`, `setIsSettingsMode`, `useSettingsMode`).
    -   [`LayoutContext`](file:///home/deck/Projects/LocalGameGalaxy/src/context/LayoutContext.tsx): Composite provider and backward-compatible adapter (`useLayout`, `useLayoutContext`, `useHeader`).

### Internationalization
-   `src/i18n.ts` and `public/locales/{de,en}/translation.json` handle translations.
-   All user-facing text must be internationalized.

## 4. Component Design & SOLID Guidelines

See [ui-modularization-solid-analysis.md](docs/tech/ui-modularization-solid-analysis.md) and [solid_development.md](docs/workflows/solid_development.md) for detailed SOLID patterns.

**File Size Policy**: Any React component exceeding 250 lines is a strong candidate for refactoring.
