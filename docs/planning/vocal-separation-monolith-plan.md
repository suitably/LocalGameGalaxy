# Goal Description
The user requested to consolidate the Vocal Separation feature into a single container (`melodiq-server`), eliminating the need for a separate `melodiq-separator` Docker container. The Python tool `audio-separator` will be installed dynamically at runtime via the UI (or natively during Docker build) to save space and simplify the setup for users not wanting this feature immediately.

## Proposed Changes

### Docker / Infrastructure
#### [MODIFY] [server/Dockerfile](file:///home/deck/Projects/LocalGameGalaxy/server/Dockerfile)
- Change base image from `node:18-alpine` to `node:18-bullseye-slim` (Debian-based) for better Python package compatibility (especially ML models).
- Pre-install `python3`, `python3-pip`, `ffmpeg`.

#### [MODIFY] [server/docker-compose.yml](file:///home/deck/Projects/LocalGameGalaxy/server/docker-compose.yml)
- Remove `melodiq-separator` service.

#### [MODIFY] [server/docker-compose.dev.yml](file:///home/deck/Projects/LocalGameGalaxy/server/docker-compose.dev.yml)
- Remove `melodiq-separator` service.

#### [DELETE] [server/separator/](file:///home/deck/Projects/LocalGameGalaxy/server/separator)
- Delete the entire Python Flask wrapper directory as it is no longer needed.

### Backend Application Logic
#### [MODIFY] [server/src/services/separator.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/services/separator.js)
- Remove HTTP requests to `melodiq-separator`.
- Replace `checkSeparatorHealth` with `checkIsInstalled` (using `child_process.exec` to check if `audio-separator` exists in PATH).
- Implement an `installTool()` function that spawns `pip3 install "audio-separator[cpu]" --break-system-packages` and streams the logs to a job.
- Update `runSeparatorJob` to use `child_process.spawn` to directly execute `audio-separator` and parse the output logs.
- Port the `.txt` patching logic (replacing `#MP3:` and `#VOCALS:`) from the old Python script to this Node file.

#### [MODIFY] [server/src/routes/index.js](file:///home/deck/Projects/LocalGameGalaxy/server/src/routes/index.js)
- Update `/api/separator/status` to call `checkIsInstalled()`.
- Update `/api/separator/install` to queue a real `install` job in `SEPARATOR_JOBS` if not installed.

## Verification Plan
### Automated / API Tests
- Check if `/api/separator/status` correctly returns `installed: false` initially.
- Check if `/api/separator/install` spawns the pip install and streams logs.
- Check if `/api/separator/status` returns `installed: true` after install.

### Manual Verification
- Deploy the updated `docker-compose.dev.yml`.
- Access the Melodiq Helper UI.
- Click "Install Tool" under Vocal Separation.
- Verify logs flow properly in the UI.
- Trigger Vocal Separation on a test song and verify the instrumental/vocals mp3s are created and the `.txt` file is correctly updated.
