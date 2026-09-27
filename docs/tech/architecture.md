---
type: System Architecture
title: System Architecture
description: Single Source of Truth for LocalGameGalaxy technical architecture, game engines, shared modules, and server infrastructure.
resource: src/
tags: [architecture, ssot, react, hono, webrtc, mqtt, pwa, capacitor]
status: stable
generated: { by: antigravity/2.0, at: 2026-09-27T10:00:00Z }
verified: { by: process:ci, at: 2026-09-27T10:00:00Z }
sources:
  - id: agy-rules
    resource: /AGENTS.md
    title: LocalGameGalaxy Agent Guidelines & Zero-Tolerance Matrix
  - id: game-registry
    resource: src/lib/gameRegistry.tsx
    title: Dynamic Game Registry
---

# System Architecture

> [!IMPORTANT]
> This document is the **Single Source of Truth (SSoT)** for the project's technical architecture.
> **AI Agents**: You MUST update this file whenever structural changes are made to the codebase.

## 1. High-Level Overview

**LocalGameGalaxy** (`suitably/LocalGameGalaxy`) is a purely client-side, offline-first web application and PWA designed to act as a hub for local group games, parlor games, and party titles.

It is built with:
- **Runtime**: React 19 (SPA)
- **Build Tool**: Vite
- **Language**: TypeScript (strict, zero `any`)
- **UI Framework**: Material UI (MUI 7)
- **State Management**: React `useReducer` / Context API with Segregated Layout Contexts
- **Persistence**: Centralized `src/lib/storage.ts` with `STORAGE_KEYS` & memory fallback, Dexie 4 for IndexedDB
- **Mobile Packaging**: Capacitor 8 (Android)
- **Internationalization**: `i18next` with bilingual support (`de`, `en`)
- **Networking & Sync**: Public WSS MQTT (`MqttMailboxService`), WebRTC SimplePeer, `BroadcastChannel`, and Web Push / ntfy

---

## 2. Project Structure

The project follows a **Feature-Based & Modular Architecture**:

```
src/
├── assets/          # Static assets (images, sound effects)
├── components/      # Shared/Common UI components (App-wide, e.g. GameLayout, ConfirmDialog)
├── context/         # Segregated layout and global app contexts
├── features/        # Shared Feature Logic (Hub, Settings, Party Lobby)
├── games/           # GAME MODULES (Independent, self-contained game domains)
│   ├── cards/       # Card game tracker (Schwimmen, Oh Hell, Universal)
│   ├── garticphone/ # Gartic Phone drawing & telephone game
│   ├── guessart/    # Pass-and-play drawing & guessing game with Excalidraw
│   ├── imposter/    # Word-based social deduction party game
│   ├── knister/     # 5x5 roll-and-write dice game
│   ├── melodiq/     # UltraStar karaoke & pitch-matching engine
│   ├── melodiq-notes/# Sheet music practice & multi-stem audio player (OSMD)
│   ├── qwixx/       # Tactical roll-and-write dice game with variants
│   ├── storyteller/ # Collaborative asynchronous storytelling game
│   ├── sudoku/      # Daily & freeplay Sudoku generator & solver
│   ├── tabletop/    # PlayingCards.io (.pcio) tabletop engine & controller
│   ├── werewolf/    # Werewolf (Werwölfe von Düsterwald) moderator engine
│   └── wordle/      # Daily 5-letter word puzzle with streaks
├── modules/         # Shared Cross-Game Feature Modules (Reusable across games)
│   ├── async-game/  # Generic IndexedDB transaction & cursor runners
│   ├── audio/       # Microphone capture, pitch detection, RMS gating
│   ├── drawing/     # DrawingCanvas, Excalidraw integration & stroke replay
│   ├── player-management/ # PlayerManagerCard, useLobbyPlayers, player logic
│   ├── sharing/     # Deep links, URL parameter parsers, session QR sharing
│   └── sync/        # MqttMailboxService, useMultiChannelSync
├── lib/             # Shared utilities (storage, gameRegistry, github, push)
├── App.tsx          # Main Router & dynamic route mapper
└── main.tsx         # Application entry point
```

---

## 3. Core Concepts

### 3.1 Game Modules (`src/games/*`)

Each game is completely self-contained. It registers dynamically via `src/lib/gameRegistry.tsx` (Open-Closed Principle), exports its entry component, and manages its internal state via a state machine, reducer, or custom hook. **Cross-game imports between `src/games/<A>` and `src/games/<B>` are strictly forbidden.**

1. **GuessArt (`src/games/guessart`)**:
   - Offline-first drawing & guessing game with native pass-and-play mechanics.
   - IndexedDB persistence via `guessart-local` database (`games`, `rounds`, `catalogues`, `metadata` stores).
   - In-game Category & Word Catalogue Editor (`CatalogueEditorDialog`) with local IndexedDB persistence and automated Git Pull Request publishing pipeline directly via GitHub REST API.
   - Integrated Excalidraw drawing canvas & animated stroke replay engine (`ExcalidrawViewer`).
   - Fuzzy evaluation engine with German umlaut transliteration, diacritic normalization, and inflection generation (`guessEvaluator`, `lingo`).
   - Deterministic multi-stage hint provider (`HintWordSlots`, `HintLetterChips`).
   - **Cross-Language Word Resolution**: Supports multilingual sessions (e.g., Player A draws in English, Player B guesses in German). The engine (`toRoundPayload`, `listRounds`) dynamically localizes the round payload (`word`, `wordMask`, `hintLetters`) to match the viewer's active language, enriches missing language translations from `DEFAULT_WORDS`, and accepts guesses in either language.
   - **Unified Header Integration (`useGuessArtHeader`)**: Integrates directly with [`HeaderLayoutContext`](/tech/architecture.md#35-state-management--segregated-layout-contexts), consolidating navigation, active turn/secret word badges, match info, and game action menus into a single top header.
   - **Peer Synchronization**: Uses `guessArtMailbox` (typed instance of generic `MqttMailboxService<GameSnapshot>` from `src/modules/sync`) over public WSS MQTT brokers with LZString compression, handling asynchronous turn progression and presence sync.

2. **Geschichtenschreiber / Storyteller (`src/games/storyteller`)**:
   - Collaborative turn-based storytelling game featuring native pass-and-play and async multi-device play with Web Push notifications.
   - **Web Push & Notification Settings**: Integrated `PushNotificationBanner` for 1-click notification permission requests, automatic Web Push dispatch via `pushClient` (`storytellerNotificationService.dispatchTurnPush`) on turn submission to wake up background devices, and QR share links embedding the push relay URL (`&gameRelay=...`).
   - **Peer Synchronization**: `BroadcastChannel` (`storyteller_channel_${gameId}`) for local cross-tab communication and `mailboxService` (ephemeral MQTT broker on `storyteller_room_${gameId}`) for real-time online turn progression.
   - IndexedDB storage via `storyteller-local` (`games` and `entries` object stores).
   - **Modular Modifiers System ("Baukasten")**:
     - *Blind Mode*: Hides preceding story text, revealing only the last 10 words of the previous player's contribution.
     - *Time Attack*: Turn countdown timer (default 45s, configurable 30s–90s) with animated warning states and auto-submission on expiration.
     - *Word Roulette*: Generates 3 random mandatory words from bilingual story lexicons that must be integrated before submission.
   - Interactive formatted Story Reader modal with chapter breaks, author attribution, word statistics, and one-click copy to clipboard.

3. **Qwixx (`src/games/qwixx`)**:
   - Tactical roll-and-write dice game with real-time peer sync over `BroadcastChannel`.
   - Modular sheet configuration engine (`sheetDefinitions.ts`) supporting official expansions (Classic, Gemixxt A/B, Big Points, Connected, Double, Bonus).
   - Dynamic dice highlight engine (`diceHighlight.ts`) and variant-aware scoring reducer (`qwixxReducer.ts`).
   - See [Qwixx Sheet Rules](/tech/qwixx-sheet-rules.md) for full variant specifications.

4. **Knister (`src/games/knister`)**:
   - 5x5 dice roll-and-write game (Schmidt Spiele / Würfel-Bingo) with 25 rolls of 2 dice.
   - Players simultaneously enter the rolled dice sum into their private 5x5 grid.
   - Evaluates horizontal, vertical, and diagonal lines for poker-like combinations (Pairs, Two Pairs, Three of a Kind, Four of a Kind, Full House, Straight, Five of a Kind).
   - Fully offline-capable with local score history and automatic scoring verification.

5. **Universal Party Lobby & Gartic Phone (`src/features/party` & `src/games/garticphone`)**:
   - Centralized "Jackbox-style" room lobby where all players connect once via QR code or link (`#/party?room=XYZ`).
   - **Serverless Real-Time Communication**: Operates 100% serverless over public WSS MQTT brokers (`wss://broker.hivemq.com:8884/mqtt` / `wss://broker.emqx.io:8084/mqtt`) and local `BroadcastChannel`. No local helper server or backend connection is required.
   - Hosts can launch **Gartic Phone** or **Tabletop Games** for all connected devices simultaneously, with isolated drawing/guessing views per device, synchronized round progression, animated album reveals, and seamless return to the lobby.
   - **SRP Architecture**: Decomposed into focused custom hooks (`useGarticGameState` for pure game rules and `sessionStorageSafe` persistence, `useGarticSync` for `useMultiChannelSync` coordination) and a slim view coordinator component (`GarticPhoneGame.tsx`, < 180 lines).

6. **Virtual Tabletop Engine (`src/games/tabletop`)**:
   - Declarative PlayingCards.io (`.pcio` / `.json`) and universal tabletop game engine.
   - **Multi-View Architecture**: Dual-view setup supporting a shared tabletop board on TV/tablet (`TabletopSurface.tsx` with auto-fit, fog-of-war for opponent hands, and flying card animations) and private smartphone controllers (`TabletopControllerView.tsx` with hand dock, swipe-up "Flick to TV" card gesture, and `[Hand | Tisch]` view switcher).
   - **Storage & Ingest**: Client-side ZIP unpacking via `fflate`, IndexedDB persistence (`galaxy_tabletop_db`), in-app metadata editor, and `.pcio`/`.json` exporter.
   - **Peer Synchronization**: Real-time multi-channel sync via `useMultiChannelSync` and `MqttMailboxService` over public MQTT relays with state snapshot reconciliation.
   - **Party Mode Integration**: Direct integration into `UniversalPartyManager` and `PartyGamePickerModal`, allowing the party host to launch any built-in or custom imported tabletop game for connected guests.
   - **Community Publishing**: Integrated GitHub PR creation via Octokit/REST API (`createGitHubPR`) to submit new game definitions upstream.

7. **Melodiq (`src/games/melodiq`)**:
   - Offline-capable karaoke and pitch-matching game supporting UltraStar TXT parsing, multi-track vocals, WebRTC remote microphones, and TV/presentation broadcast mode.
   - **Dual-Path Video Architecture**: Supports synchronized background videos via local media files (HTTP 206 streaming for MP4, WebM, AVI, MKV) and embedded YouTube URLs (via client-side YouTube IFrame Player API adapter, muted with programmatic seeking synchronized to `audioRef.currentTime`).
   - **SRP Architecture**: Gameplay session decomposed into focused custom hooks (`useSessionAudioController` for playback, sync, and media lifecycle; `useSessionScoringController` for pitch evaluation, player visibility, and responsive grid layouts; `useParsedSong` for UltraStar parsing) and focused subcomponents (`SessionTopControls`, `SessionLyricsVisualizer`, `SessionBackgroundMedia`, `SessionPauseOverlay`, `SessionScoreOverlay`, `SessionFolderPrompt`) orchestrated by a slim view coordinator (`MelodiqSession.tsx`, < 200 lines).

8. **Melodiq Notes (`src/games/melodiq-notes`)**:
   - Interactive sheet music reader and instrumental practice tool using OpenSheetMusicDisplay (OSMD).
   - **Synchronized Multi-Stem Audio Engine (`useStemAudioPlayer`)**: Web Audio API integration supporting multi-track stems (isolated vocals, backing, instruments) synchronized to sheet cursor timing.
   - **Responsive Mobile Layout & Fixed Action Bar (`BottomActionBar`)**: Prevents nested viewport scroll traps on mobile devices by decoupling sheet canvas scrolling from sticky bottom playback controls and collapsible settings accordions.
   - Local library storage via IndexedDB (`melodiq-notes-local`) and MusicXML/MXL parser.

9. **Cards (`src/games/cards`)**:
   - Multi-game card suite and digital score sheet supporting traditional card games.
   - `SchwimmenGameView`: Knack / 31 with life tracking, swimming state, and elimination logic.
   - `OhHellGameView`: Bids and tricks tracker with customizable round sequences (e.g. Rage / Wizard variants).
   - `UniversalScoreView`: Generic round-based scorekeeper for arbitrary card and board games.

10. **Werewolf (`src/games/werewolf`)**:
    - Moderator engine and role management tool for *Die Werwölfe von Düsterwald*.
    - Handles setup, role allocation, night phase sequence orchestration (Seer, Werewolves, Witch, Hunter), daylight voting, and win condition checks.
    - Integrated with `player-management` module for lobby player setups.

11. **Imposter (`src/games/imposter`)**:
    - Local pass-the-device social deduction game where one or more imposters receive a related hint word while ordinary players receive the secret word.
    - Strict phase state machine: `LOBBY` → `HANDOVER` → `TIMER` → `VOTING` → `RESULT`.
    - Integrated category selection, customizable timers, and pass-and-play handover cards.

12. **Wordle (`src/games/wordle`)**:
    - Daily 5-letter word puzzle in German and English with offline caching and streak tracking.
    - History integration via `useWordleHistory` custom hook and interactive review in `WordleHistoryModal`.

13. **Sudoku (`src/games/sudoku`)**:
    - Daily and freeplay Sudoku generator and solver with multiple difficulty levels (easy, medium, hard, expert).
    - Note-taking mode, automated conflict validation, hints, timer, and persistent statistics.

---

### 3.2 Shared Modules (`src/modules/*`)

Common cross-cutting functionality extracted into shared, reusable domain packages:

- **Player Management (`src/modules/player-management`)**:
  - Reusable player configuration hook (`useLobbyPlayers`), pure domain functions (`playerLogic.ts`), and UI component (`PlayerManagerCard`) shared across games (GuessArt, Storyteller, Imposter, Werewolf, Cards).
  - Unconstrained player removal: Allows player count down to 0, ensuring default placeholders ("Spieler 1", "Spieler 2") can be cleared and replaced with custom names.
  - Fully configurable `minPlayers` and `maxPlayers` constraints, duplicate name prevention, trimming, and full i18n support.
- **Sync & Mailbox (`src/modules/sync`)**:
  - Reusable generic MQTT mailbox service (`MqttMailboxService<T>`) providing clean, strongly typed asynchronous peer synchronization over public WSS MQTT brokers for turn-based games. Decoupled from game domains via Dependency Inversion. Used by GuessArt, Storyteller, Tabletop, and Universal Party.
  - Multi-channel synchronization hook (`useMultiChannelSync<T>`) and coordinator (`MultiChannelSyncCoordinator`) unifying local `BroadcastChannel` and remote MQTT communication into a lifecycle-safe, resource-leak-free abstraction used by Storyteller, Gartic Phone, and Tabletop.
- **Drawing & Stroke Replay (`src/modules/drawing`)**:
  - Encapsulates interactive drawing canvas (`DrawingCanvas`), Excalidraw lazy-loading (`ExcalidrawLazy`), animated stroke playback (`ExcalidrawViewer`), and scene parsing/ordering (`excalidrawScene`). Shared cleanly by GuessArt and Gartic Phone without inter-game dependencies.
- **Session Sharing & Editing (`src/modules/sharing`)**:
  - Reusable dialogs (`ShareSessionLinksDialog`, `EditSessionDialog`), URL parsing utilities (`parseGameUrlParams`, `cleanWindowUrlQuery`), and snapshot join hook (`useGameJoinUrl`) providing unified deep-link extraction across hash and search routing. Shared by GuessArt, Storyteller, Wordle, and Gartic Phone.
- **Async Game Helpers (`src/modules/async-game`)**:
  - Reusable IndexedDB transaction and cursor runners (`createIdbStoreOperations`, `runWithStore`, `cursorCollect`, `requestToPromise`) eliminating boilerplate and error handling across offline-first Dexie stores. Used by GuessArt and Storyteller.
- **Audio Processing (`src/modules/audio`)**:
  - Hardware microphone capture, Autocorrelation-based pitch detection, RMS volume gating, and frequency-to-MIDI mapping (`MicrophoneManager`, `AudioUtils`). Shared across Melodiq Karaoke and Melodiq Notes without cross-game imports.

---

### 3.3 Web Push & ntfy Hybrid Notification Architecture

- **Hybrid Multi-Channel Architecture**:
  - Supports standard **Web Push (RFC 8291 / RFC 8292 VAPID)** for mainstream Google/Mozilla/Apple browsers.
  - Supports **100% De-Googled Push via ntfy** (`ntfy.sh` or self-hosted ntfy server) for privacy-conscious users without Google Play Services or Firebase Cloud Messaging.
  - Automatic fallback & capability detection: If standard Web Push registration fails (e.g. missing FCM service on de-Googled Android), the client seamlessly suggests and registers ntfy.
  - User can configure preferred notification channel (`auto`, `webpush`, `ntfy`, `both`) in Settings.
- **Relay Implementations**:
  - **Cloudflare Worker**: Zero-cost, 24/7 serverless push relay (`server/cloudflare-push-relay/`). Dispatches both RFC 8291 encrypted Web Push packets and HTTP POST requests to `ntfy.sh` in parallel. Subscriptions stored in Cloudflare KV (with in-memory fallback).
  - **Direct Client Fallback**: `pushClient.ts` can ping `ntfy.sh` topics directly via CORS if no relay is configured or the relay is unavailable.
- **Background Service Worker**:
  - `public/sw-push.js` handles Web Push wakeups and deep links directly into the active game on notification click.

---

### 3.4 Companion Backend (Hono TypeScript Micro-Kernel)

The optional companion backend (`server/src/index.ts`) is built on **Hono** running on `@hono/node-server`:
- **Micro-Kernel with Pluggable Architecture**:
  - `melodiq`: Song scanning, media streaming with HTTP 206 Range requests, USDB search/downloads, AI stem separation (Demucs / audio-separator / ONNX), and playlist persistence.
  - `relay`: BitTorrent WebRTC tracker signaling on HTTP WebSocket upgrade.
  - `tabletop`: Tabletop asset definitions and custom game imports.
- **Cloudflare Quick Tunnel Integration**:
  - Built-in zero-config Cloudflare Quick Tunnel (`cloudflareTunnel.start`) to expose the local companion server over a secure, temporary HTTPS URL for remote party guests.
- **Security & Networking**:
  - Bearer token authentication, granular API key capabilities, CORS allowlisting, and Private Network Access (PNA) preflight support for cross-origin local IP communication.

---

### 3.5 State Management & Segregated Layout Contexts

To prevent unnecessary app-wide re-renders (Interface Segregation Principle), UI layout state is split across orthogonal contexts in `src/context/`:
- `TitleContext`: Page title state (`title`, `setTitle`, `usePageTitle`, `useTitle`).
- `HeaderLayoutContext`: Header visibility, actions, items, and home navigation handlers (`headerHidden`, `customHeaderTitle`, `customHeaderActions`, `menuItems`, `homeAction`, `hideHome`, `useHeaderLayout`).
- `SettingsModeContext`: Settings mode display flag (`isSettingsMode`, `setIsSettingsMode`, `useSettingsMode`).
- `LayoutContext`: Backward-compatible composite adapter (`useLayout`, `useLayoutContext`, `useHeader`).

---

### 3.6 Data Persistence & Central Storage

All browser-side storage is managed through `src/lib/storage.ts`:
- **Central Storage Layer**: Standardized `storage.get<T>(key, default)`, `storage.set(key, val)`, `storage.remove(key)` wrappers with memory fallback.
- **Key Registry**: All keys are registered in `STORAGE_KEYS` to avoid collision and untracked storage access.
- **Zero Raw Storage Rule**: Direct `localStorage.*` and `sessionStorage.*` calls are strictly prohibited across components.
- **IndexedDB**: Handled by Dexie 4 and `src/modules/async-game` helpers (`guessart-local`, `storyteller-local`, `MelodiqDB`, `melodiq-notes-local`, `galaxy_tabletop_db`).

---

## 4. Component Design & SOLID Guidelines

### 4.1 Anti-God-Component Architecture & Decomposition Pattern

- **Single Responsibility Principle (SRP)**: A component must either orchestrate (Container) or present (Presenter/Leaf). Never mix storage/network sync + complex calculation + multi-section layout in one file.
- **Size Budget**:
  - **Hard Limit**: Max **250 lines** per `.tsx` component.
  - **Warning Zone**: **200–250 lines** — extract hooks or sub-components before adding more code.
  - **Orchestrator Components**: Target **< 160 lines** by composing sub-components with clean props.
- **Standard 3-Tier Decomposition Pattern**:
  1. *Custom Hook*: Extract state, side-effects (`useEffect`), storage persistence, and network/event handlers into `use<Feature>State.ts`.
  2. *Focused Sub-Components*: Break distinct UI blocks into dedicated sub-components with typed props.
  3. *Types Extraction*: Place shared interfaces in a co-located `types.ts`.
- **Ratchet Rule**: Legacy components exceeding 250 lines tracked in `scripts/legacy-component-baselines.json` must only decrease in line count during refactoring.

### 4.2 Zero-Tolerance Anti-Pattern Matrix

| 🚫 Forbidden Anti-Pattern | Why It Is Blocked | ✅ Mandatory Solution |
| :--- | :--- | :--- |
| **Cross-Game Import** (`from '../<other>/...'`) | Couples games, breaks modular independence | Move to `src/modules/*` or `src/components/*` |
| **Raw Storage** (`localStorage.` / `sessionStorage.`) | Bypasses memory fallback and key registry | Use `storage.get/set/remove()` from `src/lib/storage.ts` |
| **Native Dialogs** (`window.confirm()`, `window.prompt()`, `alert()`) | Blocks main thread, breaks on Capacitor, unstyled | Use `<ConfirmDialog />` or MUI `<Dialog>` |
| **Untyped Code** (`: any`, `<any>`, `as any`) | Disables TypeScript compiler safety | Use generics, interfaces, or `unknown` with type guards |
| **God Component** (> 250 lines in `.tsx`) | Violates SRP, unmaintainable, test barrier | Split into sub-components + custom hook (`useFeatureLogic`) |
| **Inline BroadcastChannel Sync** in Games | Duplicates network logic, leaks channels | Use `useMultiChannelSync()` from `src/modules/sync` |
| **Hardcoded UI Strings** (`"Save"`, `"Delete"`) | Breaks internationalization (i18n) | Use `t('key')` and add to both `de` and `en` |
| **Tracked Server Media** (`server/music/`, audio stems) | Bloats git history with copyrighted binaries | Keep in `.gitignore`, never track songs or stems in git |

---

## 5. Verification & Quality Gates

The project enforces quality gates via automated scripts and GitHub Actions:

```bash
npm run check:architecture:diff # Verifies changed files against boundaries
npm run check:budget            # Component budget & anti-God-component ratchet
npm run check:duplicates        # Code duplication scan (jscpd)
npm run check:docs              # Documentation & translation sync gate
npm run lint                    # ESLint (0 errors)
npm test                        # Vitest unit tests
npm run build                   # tsc -b && vite build
```
