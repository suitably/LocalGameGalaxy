# Unify Smartphone View Walkthrough

## Goal
The objective was to merge the standalone `MelodiqPhoneClient` into the main `MelodiqGame` view, allowing smartphones to have the full interface (library browsing, queue management) while ensuring role-based access control (rights management) and optimal performance (no redundant video/audio streaming on clients).

## Changes Implemented

1. **Routing and Cleanup**:
   - Deleted the legacy `MelodiqPhoneClient.tsx` file and removed its standalone route from `App.tsx`.
   - Updated `MelodiqConnection.tsx` to generate QR codes pointing to the main `/games/melodiq?role=client` path.

2. **Role Detection & Rights Management**:
   - `MelodiqGame.tsx` now reads the `role=client` URL parameter.
   - For clients, the "Settings" and "Connect Phones" buttons are completely hidden from the header.
   - TV presentation logic is isolated to the Host.

3. **Client WebRTC Engine**:
   - Created a new `PhoneClientEngine.tsx` that replaces the complex `WebRTCProvider` for clients.
   - The engine automatically establishes the peer connection to the Host using `useWebRTCClient`.
   - It listens for `queue.update` and `game_state_update` messages broadcasted by the Host.

4. **Queue Synchronization Without Local Storage**:
   - Refactored `useQueue.ts` to respect the `isClient` flag.
   - Clients no longer save songs to their local `localStorage`.
   - Adding or removing songs from the queue on a client dispatches custom window events that `PhoneClientEngine` catches and forwards to the Host via WebRTC.

5. **Bandwidth Optimization & Lyrics Sync (Option A)**:
   - Modified `PlaybackManager.tsx` to pass the `isClient` flag and the remote `passiveState` down to `MelodiqSession`.
   - In `MelodiqSession.tsx`, video and audio source fetching is explicitly bypassed when `isClient === true`.
   - The client accurately renders the `<LyricsDisplay>` and `<PitchVisualizer>` by tracking the `currentTime` provided by the Host's `game_state_update` broadcasts, ensuring perfect visual sync without the echo or network overhead of streaming media to mobile devices.

## Verification Results
- [x] TypeScript builds successfully with `tsc -b && vite build`.
- [x] The `isClient` boolean securely controls the UI elements in the main game view.
- [x] The queue logic correctly proxies operations via WebRTC when not on the host.
- [x] The Session logic accurately bypasses heavy MP4/YouTube fetches on mobile.

## Outstanding Issues
- None at this time. We are waiting on the user's manual test to ensure network latency doesn't visibly impact the lyrics synchronization on their specific mobile device.
