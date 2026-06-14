# Vocal Separation Monolith Fix & CPU Optimization Tasks

- [x] Add `build-essential` and `python3-dev` to `server/Dockerfile` <!-- id: 0 -->
- [x] Update `runInstallJob` in `server/src/services/separator.js` to install CPU-only PyTorch before installing `audio-separator[cpu]` <!-- id: 1 -->
- [/] Rebuild the Docker container and verify the installation compiles and installs successfully <!-- id: 2 -->
- [x] Create verification walkthrough document <!-- id: 3 -->
