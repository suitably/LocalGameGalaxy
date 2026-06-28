# Phone Settings Implementation Plan

## Goal
Add a settings page for smartphone clients (`isClient === true`) where users can:
1. Change their display name.
2. Change their avatar color (hue).
3. Select which microphone to use (if multiple are available).
4. Persist these settings in `localStorage`.

## Proposed Changes
1. **`src/games/melodiq/types.ts` (or similar)**
   - Define a `ClientProfile` interface (name, hue, micDeviceId).
2. **`src/games/melodiq/PhoneClientEngine.tsx`**
   - Read/write `melodiq_client_profile` from `localStorage`.
   - Provide the profile via a Context or pass it down.
   - Update `getIdentity()` to use the dynamic name and hue.
   - Use `profile.micDeviceId` in `mic.start()`.
3. **`src/games/melodiq/components/ClientSettings.tsx`**
   - Create a new component.
   - Include a text input for the name.
   - Include a color picker / slider for the hue.
   - Include a select dropdown for the microphone using `MicrophoneManager.getDevices()`.
4. **`src/games/melodiq/MelodiqGame.tsx`**
   - Add a "Settings" view to the client's global header.
   - Route to the `ClientSettings` component when the settings view is active.

## Verification Plan
1. Open the host on desktop.
2. Connect with a smartphone (or a second browser window).
3. Navigate to settings on the client.
4. Change name and color, verify the host updates the avatar.
5. Change the microphone, verify the correct mic is activated.
