# Melodiq Architecture [ID: TECH-MELODIQ]

> [!IMPORTANT]
> This document details the specific architecture of the **Melodiq** game module. It outlines the core components, state synchronization mechanisms, and architectural guidelines.

## 1. High-Level Architecture

Melodiq is a local karaoke/rhythm game that supports three distinct roles/views, communicating seamlessly:

1.  **Host (PC/Laptop)**: The primary game engine. It manages the queue, downloads songs, plays the master audio, and calculates scores. Entry point: `MelodiqGame.tsx`.
2.  **TV Mode (Presentation)**: A secondary display window or Chromecast target. It displays lyrics and visualizations, perfectly synchronized with the Host. Entry point: `MelodiqTV.tsx`.
3.  **Client/Singer (Smartphone)**: A mobile interface accessed via QR code. It allows players to search songs, add them to the queue, and stream microphone audio to the host via WebRTC. Entry point: `PhoneClientEngine.tsx`.

## 2. Component Structure (SOLID Overview)

Melodiq follows a strict separation of concerns, divided into domains:

### 2.1 State & Global Context
-   `SettingsContext.tsx` & `useSettings.ts`: Manages user preferences (mic latency, theme).
-   `useQueue.ts`: Manages the global song queue. Synced across tabs using `BroadcastChannel`.
-   `useMelodiqGlobalEvents.tsx`: Orchestrates cross-component events (e.g., auto-playing the next song when TV connects).

### 2.2 Host & Game Loop
-   `PlaybackManager.tsx`: Container component. Manages the audio elements and acts as the bridge between the UI and the actual gameplay session.
-   `MelodiqSession.tsx`: The core game loop container. 
    -   *Logic Hooks*: `usePlaybackControls.ts` (Play/Pause), `usePassiveSync.ts` (TV/Client sync), `useSessionEnd.ts` (Scoreboard transitions).
    -   *Presentational Components*: `LyricsDisplay.tsx`, `PitchVisualizer.tsx`, `ScoreBoard.tsx`.

### 2.3 Network & Synchronization
-   **TV Sync**: `useTVMode.ts` uses the `Presentation API` and `BroadcastChannel` to send `PLAY_SONG`, `STOP_SONG`, and `GAME_STATE` to `MelodiqTV.tsx`.
-   **Client Data Sync**: Custom DOM Events (`melodiq_client_send_data`) and React states sync the Host queue with the Phone clients.
-   **Audio Streaming**: `WebRTCContext.tsx` and `MicrophoneManager.ts` handle low-latency audio streaming from phone mics to the host browser.

## 3. Known Technical Debt & Refactoring Goals

To ensure Melodiq aligns perfectly with the SOLID principles outlined in the main architecture doc, the following areas are targeted for future refactoring:

> [!WARNING]
> **God Component `MelodiqGame.tsx`**
> Currently, `MelodiqGame.tsx` acts as a God component. It handles the Host UI (Queue, Search, Dialogs), Phone Client injection (`clientRole === 'singer'`), and overarching state.
> **Goal**: Split into `HostEngine.tsx` and `ClientEngine.tsx` at the router level. `MelodiqGame.tsx` should solely be a router/role-selector.

> [!WARNING]
> **Mixed Responsibilities in `PlaybackManager.tsx`**
> This component renders the `MelodiqSession`, renders the `MiniPlayer`, and manages `audio` state. 
> **Goal**: Extract the complex React logic into a `usePlaybackManager.ts` custom hook, leaving `PlaybackManager.tsx` as a pure Presentational Container.

## 4. Development Rules for Melodiq

1.  **Audio Sync**: Never rely on `setTimeout` or `setInterval` for lyrics/pitch synchronization. Always use `audioRef.current.currentTime` as the single source of truth.
2.  **State Sync**: When adding a new piece of state (e.g., a new game setting), ensure it is propagated to the TV via `usePassiveSync.ts` and the `GAME_STATE` payload.
3.  **Strict File Boundaries**: UI Components must not make direct database calls (`db.ts`). Database fetching should happen in Container Components or custom hooks.
