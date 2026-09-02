# Docker Server Startup & CORS Fix Implementation Plan [ID: PLAN-DOCKER-SERVER-FIX]

## Goal Description
Resolve GitHub Issue #119 ("[Feedback] docker basic server läuft nicht").
Fix issues preventing the Docker server from running and connecting properly:
1. **Environment Variables Support in Server Config**: `process.env.SECURITY_TOKEN`, `process.env.TOKEN`, `process.env.PORT`, `process.env.MUSIC_DIR`, and `process.env.DIRECTORIES` must be respected so that `docker run -e SECURITY_TOKEN="..."` or `docker-compose.yml` pre-configured tokens match the client without generating a random token.
2. **Auto-Discovery of Default Music Directory**: Automatically detect and include `/app/music` and `./music` in scanned library directories if they exist.
3. **Resilient Config File Loading**: Handle read-only filesystems (`EROFS`), missing `config.json`, or accidental directory mounts (`EISDIR`) gracefully without crashing the server.
4. **CORS Wildcard Fix in Auth Middleware**: Fix `server/src/middleware/auth.js` where `ALLOWED_ORIGINS=*` was mistakenly treated as a literal origin check instead of open/wildcard mode, which rejected all cross-origin browser requests with 403 Forbidden.
5. **Docker Compose & Setup Wizard Alignment**: Update `docker-compose.yml`, `SetupDockerTab.tsx`, and `useServerAutoDetect.ts` to supply `SECURITY_TOKEN` and proper volume mappings without requiring pre-existing host files.
6. **Documentation & Architecture Clarity**: Update `docs/tech/architecture.md` and user-facing text to clearly communicate that the Nexumia Server is a helper for Melodiq (media/karaoke/stems/USDB), while party games (GuessArt, Gartic Phone, Werewolf, Qwixx) are serverless/peer-to-peer and do not require this server.

---

## Component & Architecture Breakdown

### Server (`server/`)
- `server/config.js`:
  - Read `process.env.SECURITY_TOKEN` and `process.env.TOKEN` as priority over random generation.
  - Read `process.env.PORT`.
  - Read `process.env.MUSIC_DIR` and `process.env.DIRECTORIES`.
  - Auto-add `/app/music` and `./music` to directories if they exist on disk.
  - Safely ignore directory paths for `config.json` and catch `EROFS` on `saveConfig()`.
- `server/src/middleware/auth.js`:
  - Support `ALLOWED_ORIGINS=*` (or empty/unset) as unrestricted open CORS mode.
  - Return `Access-Control-Allow-Origin: *` or echo the request origin.
  - Ensure preflight `OPTIONS` requests never return 403 when wildcard or allowed.
- `server/docker-compose.yml`:
  - Expose ports `3000:3000` and `3001:3001`.
  - Mount `./music:/app/music:ro`.
  - Pass `SECURITY_TOKEN` and `MUSIC_DIR=/app/music`.
  - Remove brittle `:ro` mount on `./config.json` that fails when the host file doesn't exist.
- `server/test/config.test.js`:
  - Unit tests for env variable parsing, token detection, and CORS wildcard evaluation.

### Frontend App (`src/`)
- `src/components/connection/setup/SetupDockerTab.tsx`:
  - Ensure 1-liner `docker run` command includes `-p 3000:3000 -p 3001:3001` and `-e SECURITY_TOKEN="${token}"`.
- `src/components/connection/setup/useServerAutoDetect.ts`:
  - Synchronize `downloadDockerCompose` template with updated docker-compose format.

---

## Verification Plan
1. **Unit & Server Tests**: Run `npm test` inside `server/` testing config loading, token detection, and CORS rules.
2. **ESLint & TypeScript**: Run `npm run lint` and `npm run build` (`tsc -b && vite build`) to ensure 0 errors/warnings.
3. **Manual / Simulation Verification**: Test curl and HTTP requests simulating browser CORS preflight (`OPTIONS` and `GET /api/status`) with token headers to confirm 200 OK responses.
