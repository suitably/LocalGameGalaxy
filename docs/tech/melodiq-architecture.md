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
  at: 2026-11-14
  method: '2026-10-18 audit: paths, links and identifiers resolved against code, content spot-checked; prose not re-verified line by line'
---

# Melodiq Architecture

> Melodiq **Notes** (band stage, sheet music, pults) is a separate game: see [melodiq-notes-architecture.md](melodiq-notes-architecture.md).

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

- `SettingsContext.tsx` & `useSettings.ts`: Manages user preferences (mic latency, theme). The UI is the registered settings sections in `settings/` (`MelodiqProfilesSection`, `MelodiqGameplaySection` for the host, `MelodiqClientSection` for phones), shown in the header gear's settings sheet and on `/settings/games/melodiq`; microphones are app scope (`/settings/audio`).
- `useQueue.ts`: Manages the global song queue. Synced across tabs using `BroadcastChannel`.
- `useMelodiqGlobalEvents.tsx`: Orchestrates cross-component events (e.g., auto-playing the next song when TV connects).

### 2.2 Host & Game Loop

- `PlaybackManager.tsx`: Container component. Manages the audio elements and acts as the bridge between the UI and the actual gameplay session.
- `MelodiqSession.tsx`: The core game loop container. It picks the screen (load error, loading, folder prompt, score board, stage); the session state (media, audio, players, scoring, passive sync, imperative handle) lives in `gameplay/hooks/useMelodiqSessionCore.ts` and the playing stage in `gameplay/components/SessionStage.tsx`.
- Stage chrome: `gameplay/hooks/useStageChrome.ts` (rule in `gameplay/logic/stageChrome.ts`) hides the header bar, title and minimize button 3.5 s after the last interaction while a song plays; a tap or mouse move shows them again with `SessionTransportControls` (play/pause, next) on the video. Scores and the progress line stay. The TV view (`isTVMode`) uses the same rule with `TV_STAGE_CHROME_HIDE_MS` (8 s, read from a distance, nobody can recall it) and has no transport buttons: it mirrors the host and has no pointer. TV sizes follow DESIGN.md §3.3: `ScoreDisplay`, `DuetPart` and `SessionTopControls` switch variants and padding on `useIsTvMode()` / `isTVMode` (48 px gutter, no hard-coded font size), the lane label in `drawOverlays` takes a `tv` flag.
- Lyrics-only stage: without a pitch lane `lyricsOnlyLineCount` (`gameplay/logic/lyricsLines.ts`) raises the line count above the `lyricsLines` setting (portrait phone: 5 solo, 3 per duet part; otherwise 3 in the centred layout).
- YouTube backgrounds: `disableYouTubeCaptions` (`gameplay/youtubeApi.ts`) unloads the player's caption module on `onReady` and `onApiChange`; no player parameter can turn the video's own subtitles off.
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

### 2.6 Part choice and joining on the phone

- The host sends every phone that has a player `songInfo` with the part names, that player's `trackIndex` and `singing` (false while the player is hidden, i.e. a spectator) (`useBroadcastSongInfo.ts`); it is re-sent when players join or leave and whenever a remote player's part or visibility changes.
- On a phone (`isClient`), `usePhoneClientMessages.ts` reads it (`parseAssignedTrack` in `gameplay/logic/trackChoice.ts`) and hands it to `usePhoneTrackChoice.ts` (`reportTrackAssignment`). `PhonePartChoiceProvider.tsx` (mounted by `PersistentSessionLayer.tsx` only on phones) puts the hook's result in `LyricsPartContext`; `LyricsDisplay.tsx` then shows a `PartMicButton` per duet lane in the lane colour (blue / pink), filled for the part the phone sings, and for solo songs a join mic while the phone only watches. Host and TV render no mics.
- Tapping a mic sends `{ type: 'trackSelect', trackIndex }` through `sendClientData` of `PhoneClientEngine.tsx`. On the host, `usePeerSessionMessages.ts` unhides a hidden player the host list allows and calls `switchTrack`; `useHostPhoneJoin.ts` adds a phone that is not on the host's singer list (`addJoiningPhone` in `logic/sessionRoster.ts`, same entry as the participant dialog), so `useSessionOverrideSync` creates its singer. The phone asks for its part again until `songInfo` reports it (`pendingTrackRequest`), and re-sends it after a reconnect.
- The host's own P1 / P2 switch (`HostPartToggle.tsx`) is shown only for local-mic singers; phone singers pick their own part.

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
