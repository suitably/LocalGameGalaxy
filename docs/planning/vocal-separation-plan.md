# Vocal Separation Feature – Plan

## Goal Description
Integrate a vocal separation feature into the Melodiq Helper. The feature will use a modern CLI tool to split songs into instrumental and vocal tracks. 
- The tool will run inside the Docker container but will **only be installed on-demand** when the user clicks a specific "Add functionality" button in the UI.
- Users can queue separation for single songs, multiple songs, or all local songs.
- The Melodiq host settings will be updated to include a "Vocals Volume" slider to control the playback volume of the separated vocals.

## Proposed Changes

### 1. Docker & Server Preparation
- **`server/Dockerfile` [MODIFY]**: Change base image to `node:18-bullseye-slim`. Ensure `python3`, `pip`, and `ffmpeg` are available. This is crucial because `alpine` uses `musl` which prevents fast installation of pre-compiled AI tools.
- **`server/src/routes/index.js` [MODIFY]**: Add API endpoints for installing the tool (`POST /api/tools/install-separator`), checking status (`GET /api/tools/status`), and queuing jobs (`POST /api/jobs/separate`).
- **`server/src/services/separator.js` [NEW]**: Service module to handle the separation queue, run the CLI tool, and update `.txt` files with `#VOCALS` and `#MP3` pointing to the new files.

### 2. Helper UI (Frontend)
- **`server/public/index.html` [MODIFY]**: 
  - Add an "AI Tools / Vocal Separation" card.
  - Show an "Install Vocal Separation" button if the tool is not detected.
  - Once installed, show options to queue separation for specific songs or "Separate All Songs".
  - Display a live progress queue for active separation jobs.

### 3. Melodiq Host App (Settings & Playback)
- **`src/games/melodiq/hooks/SettingsContext.tsx` [MODIFY]**: Add `vocalsVolume: number` to `SettingsState` (default `1.0`).
- **`src/games/melodiq/MelodiqSettings.tsx` [MODIFY]**: Add a volume slider for "Vocals Volume" in the audio settings panel.
- **`src/games/melodiq/hooks/useMelodiqAudio.ts` [MODIFY]**: Update audio loading logic to handle the `#VOCALS` track and bind its gain to the new setting.

## Verification Plan
1. **Docker Build**: Verify the container builds successfully with the Debian slim image.
2. **On-Demand Install**: Click "Install" in the UI and verify the pip installation succeeds inside the container.
3. **Queue & Separation**: Queue a single song, verify the CLI tool runs, creates files, and updates the `.txt`.
4. **Volume Control**: Open Melodiq Host, adjust the "Vocals Volume" slider, and verify the vocals change volume dynamically.
