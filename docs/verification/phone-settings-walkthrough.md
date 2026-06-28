# Phone Settings Walkthrough

## Goal
Implement a settings interface for smartphone clients to allow changing of display name, avatar color, and microphone source, while providing live feedback.

## Changes Implemented
1. **Client Profile State**: Added `ClientProfile` interface to `PhoneClientEngine.tsx` and linked it to `localStorage` under `melodiq_client_profile`.
2. **Dynamic Identity**: Modified `getIdentity()` to pull from the dynamic `clientProfile` state instead of hardcoded values.
3. **Identity Resync**: Exposed `resendIdentity` from `useWebRTCClient.ts` to push profile changes (name/color) live to the host without reconnecting.
4. **Settings UI**: Created `ClientSettings.tsx` containing text inputs, color sliders, and a device dropdown.
5. **Microphone Permissions**: Modified `ClientSettings` to automatically request microphone permissions (`getUserMedia`) on mount so that `MediaDeviceInfo` populates device names instead of generic identifiers.
6. **Live Mic Test**: Added a `LiveMicTest` component inside `ClientSettings.tsx` running an independent `requestAnimationFrame` loop on `MicrophoneManager` to display real-time volume (bar) and pitch (note name).
7. **Mic Swap Reactivity**: Added `clientProfile.micDeviceId` to the dependency array of the main audio processing `useEffect` in `PhoneClientEngine.tsx`, ensuring that swapping mics while the session is running seamlessly restarts the underlying `MicrophoneManager`.
8. **Routing**: Integrated `ClientSettings` into `MelodiqGame.tsx` under the `Settings` view specifically for clients.

## Verification Results
- Build runs successfully (`npm run build`).
- Device dropdown correctly populates human-readable microphone names.
- Changing mics instantly re-initializes the stream.
- The live indicator provides real-time visual feedback of both pitch and volume.

## Update: Display Mode Selection
1. **Client Profile**: Added `displayMode` to `ClientProfile` with a default of `'lyrics'`.
2. **Settings UI**: Added a dropdown in `ClientSettings.tsx` to choose between "Only Lyrics", "My Pitch & Lyrics", and "Everyone's Pitch".
3. **Session Filtering**: Updated `MelodiqSession.tsx` to compute `visiblePlayers` based on the display mode when running in client mode.
   - `'lyrics'` hides all grid players.
   - `'self'` filters the player array to match the local player's name.
   - `'all'` returns all connected players.
4. **Layout**: If `visiblePlayers` is empty, the Lyrics are automatically centered in the main view.

## Update: Fix Display Mode and Layout Reactivity
1. Fixed `MelodiqSession.tsx` to dynamically update `clientProfileState` upon `melodiq_profile_update` event, updating the phone's rendering mode instantly instead of caching it from localStorage on mount.
2. Fixed host grid layout reactivity by setting the `gridLayout` memo dependency to `visiblePlayers.length` instead of `players.length`, allowing real-time screen repartitioning when phones connect or disconnect mid-song.

## Update: Pause Pitch Cursor
1. Fixed an issue where the pitch cursor in `PitchVisualizer.tsx` continued to animate and respond to microphone input even while the game was paused.

## Update: Fix Paused Pitch Synchronization
1. Fixed `timeProxyRef` in `MelodiqSession.tsx` by adding a `get paused()` getter linked to `isPlayingRef.current`.
2. This correctly propagates the paused state to `PitchVisualizer.tsx`, stopping the cursor from responding to microphone input when the game is paused.

## Update: Fix Paused Score Accumulation
1. Fixed a stale closure issue in `MelodiqSession.tsx` where the `updateLoop` continued to award points while paused because it used a stale `isPlaying` reference. Updated to use `isPlayingRef.current` and `!audioRef.current.paused`.

## Update: Fix Phone Add To Queue
1. Fixed a logic flaw in `MelodiqGame.tsx` where a client clicking a song would attempt to add it to its local queue if `isPlaying` was true, which would immediately get overwritten by the host.
2. Changed the client interaction flow to broadcast a `host.select_song` event instead.
3. Updated `PhoneQueueBridge.tsx` and `MelodiqGame.tsx` on the Host to capture `host.select_song` and trigger the native `handleSelectSong` handler, correctly emulating a host click for seamless remote control.

## Update: Fix Client to Host Event Bus
1. Fixed an issue where the phone client was calling `manager?.broadcast()` directly to send commands to the host. Since the phone is initialized with a Mock Provider, `manager` was null, causing the commands to silently fail.
2. Updated `PhoneClientEngine.tsx` to listen for a `melodiq_client_send_data` window event and route it through its active WebRTC data channel (`sendData`).
3. Updated `MelodiqGame.tsx` to dispatch `melodiq_client_send_data` on song click instead of attempting to broadcast it.

## Update: Fix Client Session Results
1. Fixed `PlaybackManager.tsx` to continue broadcasting `game_state_update` even after playback ends, so the clients can receive the `isFinished: true` state.
2. Fixed a React stale closure bug in `MelodiqSession.tsx` by utilizing functional state updates for `isFinished` and replacing `isPlaying` dependencies with `isPlayingRef.current`.
3. Updated `ScoreBoard.tsx` to accept an `isPassive` prop, which hides the host control footer and adds a top-left "Minimize" button instead.

## Fix: Re-add isPassive to ScoreBoard
1. Restored the `isPassive={isPassive}` and `onMinimize={onMinimize}` props passed to `ScoreBoard` inside `MelodiqSession.tsx`, which were accidentally lost during a git checkout revert.
2. This ensures the 'Continue' and 'Main Menu' buttons are properly hidden on the smartphone clients during the Session Results view.
