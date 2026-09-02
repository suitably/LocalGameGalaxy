# Docker Server Startup & CORS Fix Tasks [ID: TASKS-DOCKER-SERVER-FIX]

- [x] Phase 1: Planning & Context Analysis <!-- id: 0 -->
  - [x] Analyze Issue #119 root causes <!-- id: 1 -->
  - [x] Create Implementation Plan (`docs/planning/docker-server-fix-plan.md`) <!-- id: 2 -->
- [x] Phase 2: Server Backend Updates <!-- id: 3 -->
  - [x] Update `server/config.js` with environment variable overrides (`SECURITY_TOKEN`, `TOKEN`, `PORT`, `MUSIC_DIR`, `DIRECTORIES`), auto `/app/music` detection, and resilient file handling <!-- id: 4 -->
  - [x] Fix CORS wildcard (`ALLOWED_ORIGINS=*`) and open mode handling in `server/src/middleware/auth.js` <!-- id: 5 -->
  - [x] Update `server/Dockerfile` and `server/docker-compose.yml` to support modern standalone and compose deployments <!-- id: 6 -->
  - [x] Create unit tests in `server/test/` to verify config, token inheritance, and CORS middleware <!-- id: 7 -->
- [x] Phase 3: Frontend & Setup Wizard Synchronization <!-- id: 8 -->
  - [x] Update `src/components/connection/setup/SetupDockerTab.tsx` with corrected port and token commands <!-- id: 9 -->
  - [x] Update `src/components/connection/setup/useServerAutoDetect.ts` docker compose generator <!-- id: 10 -->
- [x] Phase 4: Verification & Walkthrough <!-- id: 11 -->
  - [x] Run server tests (`npm test` in `server/`) <!-- id: 12 -->
  - [x] Run `npm run lint` and `npm run build` in root <!-- id: 13 -->
  - [x] Write `docs/verification/docker-server-fix-walkthrough.md` <!-- id: 14 -->
- [x] Phase 5: Documentation Maintenance <!-- id: 15 -->
  - [x] Update `docs/tech/architecture.md` <!-- id: 16 -->
