---
type: Game Architecture
title: Melodiq Karaoke Architecture
description: Architectural specification of the Melodiq karaoke module, dual-path video sync, pitch evaluation, and controller separation.
resource: src/games/melodiq/
tags: [melodiq, karaoke, audio, pitch-detection, ultrastar]
status: stable
generated:
  at: 2026-09-27T10:00:00Z
  by: previous-agent
verified:
  at: 2026-10-18
  method: '2026-10-18 audit: paths, links and identifiers resolved against code, content spot-checked; prose not re-verified line by line'
---

# Melodiq Architecture

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

- `SettingsContext.tsx` & `useSettings.ts`: Manages user preferences (mic latency, theme).
- `useQueue.ts`: Manages the global song queue. Synced across tabs using `BroadcastChannel`.
- `useMelodiqGlobalEvents.tsx`: Orchestrates cross-component events (e.g., auto-playing the next song when TV connects).

### 2.2 Host & Game Loop

- `PlaybackManager.tsx`: Container component. Manages the audio elements and acts as the bridge between the UI and the actual gameplay session.
- `MelodiqSession.tsx`: The core game loop container.
  - _Logic Hooks_: `usePlaybackControls.ts` (Play/Pause), `usePassiveSync.ts` (TV/Client sync), `useSessionEnd.ts` (Scoreboard transitions).
  - _Presentational Components_: `LyricsDisplay.tsx` (lanes in `lyrics/`), `PitchVisualizer.tsx` (canvas drawing in `pitch/`), `ScoreBoard.tsx` (parts in `scoreboard/`).

### 2.3 Network & Synchronization

- **TV Sync**: `useTVMode.ts` uses the `Presentation API` and `BroadcastChannel` to send `PLAY_SONG`, `STOP_SONG`, and `GAME_STATE` to `MelodiqTV.tsx`.
- **Client Data Sync**: Custom DOM Events (`melodiq_client_send_data`) and React states sync the Host queue with the Phone clients.
- **Audio Streaming**: `WebRTCContext.tsx` and `MicrophoneManager.ts` handle low-latency audio streaming from phone mics to the host browser.

### 2.4 Audio Stem Separation & Playback Mode

- **Separation Backend**: `server/src/plugins/melodiq/services/separator.ts` and `scanner.ts` extract and index separated stems (`(Instrumental)`, `(Vocals)`).
- **Playback Modes**: Configurable via `settings.audioPlaybackMode` (`'separated'` vs `'original'`):
  - `'separated'`: Plays instrumental on master audio element and vocal stem on secondary audio element with continuous millisecond drift alignment (`useLocalMediaSync.ts`). Allows independent vocal volume reduction.
  - `'original'`: Plays the untouched original mix directly without secondary vocal stem.
- **Audio Track Resolution**: `useMediaLoaders.ts` resolves stem paths and URLs automatically based on the user's selected mode and available files.

### 2.5 Resume after reload / route change

- `useQueue.ts` persists the running song as `STORAGE_KEYS.NOW_PLAYING`; `usePlaybackReporting.ts` writes its position about once per second to `STORAGE_KEYS.MELODIQ_SAVED_TIME` (`{ id, time }`).
- `useMelodiqPlayback.ts` seeds `restoredSong` from `NOW_PLAYING` plus the saved position (`logic/savedPlayback.ts`). The MiniPlayer shows it as "Paused"; resume (`useRestoredResume.ts`) continues at that position, the restart button plays it from the beginning and drops the saved position.

### 2.6 Duet part choice on the phone

- Duet songs have several `parsedSong.tracks`. The host sends their names to each phone (`songInfo`, `useBroadcastSongInfo.ts`).
- On a phone (`isClient`), `usePhoneTrackChoice.ts` shows `PhoneTrackPicker.tsx` (P1 / P2) for a duet when the phone is on the host's session list and sends `{ type: 'trackSelect', trackIndex }` (`gameplay/logic/trackChoice.ts`) through `sendClientData` of `PhoneClientEngine.tsx`.
- The host maps it to the phone's singer by peer id (`usePeerSessionMessages.ts`) and calls `switchTrack`. The choice is re-sent after a reconnect. The host does not echo the part back to the phone.

### 2.7 Remote host settings (phone to host RPC)

Admin phones adjust a few host settings without mounting the desktop `<Settings>` and without touching the phone's own storage. All messages travel over the existing WebRTC data channel and are typed in `types.ts`:

| Direction     | Message                                                         | Meaning                                               |
| ------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| phone to host | `HostSettingsRpc` `{ type: 'host.settings.get' }`               | ask for the current values                            |
| phone to host | `HostSettingsRpc` `{ type: 'host.settings.set', patch }`        | change values (`Partial<HostSettings>`)               |
| host to phone | `HostSettingsReply` `{ type: 'host.settings.state', settings }` | host's current `HostSettings` (answer to get and set) |

- `HostSettings` is a fixed subset of `SettingsState` (volumes, playback mode, lyrics options, note labels, scoreboard QR). `logic/hostSettingsRpc.ts` validates and clamps every patch and drops unknown keys, so helper URL or token can never be set this way.
- Host: `HostSettingsRpcBridge.tsx` (mounted next to `PhoneQueueBridge`) accepts the messages only from devices whose stored role is `admin` (`getRoleForDevice`), applies the patch through `updateSetting` (host storage) and replies to the sender.
- Phone: `usePhoneClientMessages.ts` keeps the reported `hostSettings`; `RemoteHostSettingsModal.tsx` (opened from the header action "Host settings", shown only for `clientRole === 'admin'`) sends the requests via `sendClientData`.

### 2.8 Feedback via host (phone to host RPC)

While a phone is connected to a host, feedback is not sent with the phone's own PAT but over the data channel (#145):

- Phone: `hooks/useFeedbackRelay.ts` (called in `PhoneClientEngine`) registers a relay in `src/lib/feedbackRelay.ts`; `submitFeedback` (`src/lib/github.ts`) tries it first and sends `{ type: 'host.feedback.submit', reqId, title, body }`. The reply `host.feedback.result` (`success`, `issueUrl`, `error`, `code`) is routed by `usePhoneClientMessages` and shown by the normal `FeedbackForm`. The feedback dialog opens without a local PAT while the relay is active.
- Host: `FeedbackRpcBridge.tsx` validates/caps the request (`logic/feedbackRpc.ts`, one request per phone per 10 s, any connected phone) and creates the issue with the host's PAT (`submitFeedbackWithLocalPat`). Without a host PAT it answers `code: 'no_token'`.
- Fallback: on `no_token`, error or timeout, `submitFeedback` uses the phone's own PAT if it has one, then the server proxy as before.

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
