# Settings Page Refactor Plan

## Goal Description
Move the multiplayer microphone setup and other game settings from popup dialogs to a dedicated "Settings" page within the Melodiq game.
- **Settings Page**: Full-screen or container-mode page to configure Game, Audio, and Debug settings.
- **Persistence**: Save microphone preferences to `localStorage` so they persist between sessions.
- **Navigation**: Update `MelodiqGame` to route between Home, Settings, and Game Session.

## User Review Required
- **Navigation Flow**: I will add a "Settings" button to the main dashboard. Clicking it replaces the dashboard with the Settings view. A "Back" button in Settings returns to the dashboard.
- **Session Start**: Since the setup dialog is gone, clicking a song will now **immediately start the session** using the configured microphones. If no mics are configured, it might fault to default or system default, but ideally the user should set them up once in Settings.

## Proposed Changes

### Components
#### [NEW] [MelodiqSettings.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqSettings.tsx)
- Full page component.
- Sections:
    - **Audio Setup**: P1 Mic, P2 Mic dropdowns (using `MicrophoneManager.getDevices`).
    - **Debug / Dev**: Debug Overlay, Dev Slider, Mic Status toggles.
- Actions: "Save & Back" (or auto-save).

#### [MODIFY] [MelodiqGame.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/MelodiqGame.tsx)
- Replace `Dialog`-based settings with view switching logic.
- `enum View { Home, Settings, Session }`.
- Render `MelodiqSettings` when view is `Settings`.

#### [MODIFY] [MelodiqSession.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MelodiqSession.tsx)
- Remove `MicSetupDialog` and `needsSetup` state.
- In `useEffect`, read `melodiq_p1_device` and `melodiq_p2_device` from `localStorage`.
- Initialize microphones with these stored IDs.

#### [DELETE] [MicSetupDialog.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/MicSetupDialog.tsx)
- No longer needed.

## Verification Plan

### Manual Verification
1.  **Navigation**: Open Melodiq -> Click Settings. Verify Settings page loads. Click Back -> Verify Home loads.
2.  **Settings Persistence**:
    - Go to Settings.
    - Change a toggle (e.g., Debug Overlay).
    - Select a Microphone (simulated or real).
    - Go Back.
    - Go to Settings again. Verify values remain.
    - Refresh page. Go to Settings. Verify values remain.
3.  **Gameplay**:
    - Set specific settings (e.g., P1 Mic = Default, Debug Overlay = On).
    - Start a song.
    - Verify Debug Overlay is visible.
    - Verify Microphone is active (Pitch Visualizer responding).
