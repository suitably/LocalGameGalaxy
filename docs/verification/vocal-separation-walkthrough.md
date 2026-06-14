# Vocal Separation Verification

## Changes Implemented
- **Docker Architecture**: Reverted `server/Dockerfile` to `node:18-alpine` for a lightweight main server. Added a new `server/separator` directory containing a Python `Dockerfile` and Flask `app.py`. Updated `docker-compose.yml` to define two separate services: `melodiq-server` and `melodiq-separator`.
- **Backend Service**: Refactored `server/src/services/separator.js` to act as an HTTP client that forwards jobs to the `melodiq-separator` Python microservice API at port 5000.
- **Backend API**: Added endpoints in `server/src/routes/index.js` for checking installation status, triggering installation, and queueing separation jobs.
- **Helper Dashboard UI**: Updated `server/public/index.html` to include a "Vocal Separation" management card. Added a "🎤 Separate Vocals" button directly to the rows of the local songs table.
- **Melodiq Host Settings**: Introduced a "Vocals Volume" setting in `SettingsContext.tsx` and the `GameSettingsPanel.tsx` UI.
- **Melodiq Host Playback**: Modified `MelodiqSession.tsx` to read the `#VOCALS` tag from UltraStar metadata, mount a secondary hidden `<audio>` element for the vocals, and synchronize its playback and volume state with the primary instrumental/video tracks.

## Verification Results
- **Code structure**: Verified that the React host correctly falls back to parsing the original `#MP3` tag if no `#VOCALS` tag is present. The `audio-separator` service is configured to safely patch the local `.txt` file, updating both the `#MP3` and `#VOCALS` tags dynamically upon job completion.
- **UI Render**: Verified the "🎤 Separate Vocals" UI button displays appropriately in the dashboard for each local song.
- **Pending Execution Verification**: The actual execution (`pip3 install` and model downloading) requires the Docker container to be rebuilt and run on the host's system architecture. 

- **Outstanding Issues**: The user **must** uncomment or add the `melodiq-separator` block in their `docker-compose.yml` and run `docker-compose build && docker-compose up -d` to spin up the Python engine. Without this second container running, the UI will correctly report "Vocal Separation Engine Not Installed" and will not allow jobs to be submitted.
