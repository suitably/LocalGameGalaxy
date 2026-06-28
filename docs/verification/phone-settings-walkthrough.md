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
