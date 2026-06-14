# Vocal Separation Feature – Tasks

- [x] Change Docker base image to `node:18-bullseye-slim` in `server/Dockerfile` <!-- id: 0 -->
- [x] Add `vocalsVolume` setting to Melodiq `SettingsContext.tsx` and `MelodiqSettings.tsx` <!-- id: 1 -->
- [x] Update `useMelodiqAudio.ts` to support `#VOCALS` tag and manage separate volume <!-- id: 2 -->
- [x] Create `server/src/services/separator.js` to manage the vocal separation queue and tool execution <!-- id: 3 -->
- [x] Add backend endpoints in `server/src/routes/index.js` for installation, status, and job queueing <!-- id: 4 -->
- [x] Add Vocal Separation UI section to `server/public/index.html` (installation and global queueing) <!-- id: 5 -->
- [x] Integrate single-song separation action into the Local Songs table in `server/public/index.html` <!-- id: 6 -->
- [x] Perform verification tests (build, install, process, playback) <!-- id: 7 -->

## Monolith Migration (Latest)
- [x] Update `server/Dockerfile` (change to `node:18-bullseye-slim`, add python, ffmpeg)
- [x] Delete `server/separator` directory
- [x] Remove `melodiq-separator` service from `server/docker-compose.yml` and `docker-compose.dev.yml`
- [x] Update `server/src/services/separator.js` to manage tool via `child_process` (install & run)
- [x] Update `server/src/routes/index.js` to trigger local install job
- [x] Run basic validation (build docker image)
- [x] Persist ONNX models using docker-compose volume mounts
