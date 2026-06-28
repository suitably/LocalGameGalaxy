# Unify Smartphone and General View Plan

## Goal Description
The objective is to deprecate the standalone smartphone view (`MelodiqPhoneClient.tsx`) and merge its functionalities into the main application view (`MelodiqGame.tsx`). The smartphone users (clients) should experience the exact same UI as the main page, allowing them to browse the library, manage the queue, add songs, and view lyrics. The Host must have rights management capabilities to control what clients can see and do (e.g., hiding settings from clients). Additionally, we need to evaluate the feasibility and sensibility of broadcasting the video to multiple devices simultaneously.

## Proposed Changes

### 1. Remove Current View & Routing
- **Files to Remove**: `src/games/melodiq/MelodiqPhoneClient.tsx`
- **Routing Update**: Modify `src/App.tsx` and `src/games/melodiq/MelodiqConnection.tsx` so that joining a session redirects the user to the main `MelodiqGame` view with specific URL parameters (e.g., `?party=<id>&role=client`).

### 2. Role & Rights Management in `MelodiqGame.tsx`
- **Role Detection**: Introduce a context or state in `MelodiqGame` to determine if the current instance is the `Host` or a `Client` based on URL parameters.
- **UI Adjustments (Rights Management)**:
  - Hide the "Settings" button and view for Clients.
  - Hide the "Connect Phones" (QR Code) button for Clients.
  - Depending on host preferences, restrict certain queue operations (e.g., moving/removing songs added by others).

### 3. Queue & State Synchronization via WebRTC
- **Current State**: The Host uses `LocalStorage` and `BroadcastChannel` (via `useQueue.ts`) and bridges to clients using `PhoneQueueBridge.tsx`.
- **New Approach**:
  - Abstract `useQueue` so that if `role === 'client'`, it does **not** rely on `LocalStorage`.
  - Instead, the Client's `useQueue` will listen for `queue.update` from the WebRTC connection and dispatch `queue.add`/`queue.remove` actions to the Host.
  - The Host will process these requests, update its local queue, and broadcast the new state to all clients.

### 4. Evaluation: Video on Multiple Devices
You asked whether it makes sense to display the video on multiple devices simultaneously. 

**Decision: Option A (No Video/Audio on Client, Only Lyrics) is selected.**
1. **Audio Sync Issues (Echo)**: Playing video with audio on multiple devices simultaneously over a network will inevitably lead to slight latency differences. This causes a severe echo effect, ruining the karaoke experience.
2. **Bandwidth & Performance**: Streaming high-quality MP4s or YouTube videos to multiple mobile devices puts a heavy load on the Helper server or the local network bandwidth.
3. **Implementation**: The smartphone client will NOT load or play the video and audio. In the Session view, the client will exclusively display the synchronized lyrics and pitch/microphone controls. The actual media playback remains on the Host/TV.

## Verification Plan
1. Start the Host view and generate a connection QR code/URL.
2. Open the URL in a separate private window (acting as a Phone Client).
3. Verify that the Client sees the full general view but without the Settings and Connect options.
4. Add a song to the queue from the Client and verify it appears on the Host.
5. Play a song on the Host and verify the Client can see the synchronized lyrics in the Session view.
6. Verify no video is played on the Client to prevent audio desync (unless specifically configured as a secondary display without audio).
