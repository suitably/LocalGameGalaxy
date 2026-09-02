# Docker Server Startup & CORS Fix Walkthrough [ID: VERIFY-DOCKER-SERVER-FIX]

## Summary of Changes Implemented
Resolved GitHub Issue #119 ("[Feedback] docker basic server läuft nicht").

1. **Environment Variables Support in Server Config (`server/config.js`)**:
   - Added support for `SECURITY_TOKEN` and `TOKEN` env vars so that Docker containers run with the exact token configured by the client or command line.
   - Added support for `PORT`, `MUSIC_DIR`, and `DIRECTORIES` env vars.
   - Implemented automatic discovery for `/app/music` and `./music` directories when present.
   - Implemented resilient config loading/saving: directories erroneously mounted or read-only filesystems (`EROFS`, `EISDIR`) no longer cause uncaught errors or crashes.

2. **CORS Wildcard & Open Mode Fix (`server/src/middleware/auth.js`)**:
   - Fixed CORS origin check where `ALLOWED_ORIGINS=*` was mistakenly treated as a literal origin match rather than unrestricted open CORS mode.
   - Handled wildcard and open origins so browser `OPTIONS` preflight and `GET /api/status` requests succeed cleanly from any host/port.
   - Disabled rate limiter IPv6 warnings.

3. **Docker Compose & Setup Wizard Alignment**:
   - Updated `server/docker-compose.yml` to expose both `3000:3000` (HTTP) and `3001:3001` (HTTPS), provide `SECURITY_TOKEN=` and `MUSIC_DIR=/app/music`, and remove brittle read-only `config.json` file mounts that failed when uninitialized.
   - Updated `src/components/connection/setup/SetupDockerTab.tsx` and `src/components/connection/setup/useServerAutoDetect.ts` to generate aligned Docker commands and compose templates with ports and tokens.

4. **Unit Tests (`server/test/config_and_cors.test.js`)**:
   - Added tests covering environment variable loading, fallback token generation, CORS wildcard preflights, and token authentication.

5. **Documentation & Architecture (`docs/tech/architecture.md`)**:
   - Clarified the distinction and separation between the Nexumia companion server (for Melodiq media streaming, USDB downloads, vocal separation) and serverless party games (GuessArt, Gartic Phone, Werewolf, Qwixx).

---

## Verification Results

### 1. Server Unit Tests (`npm test` in `server/`)
```
▶ Server Config - Environment Variables & Directory Discovery
  ✔ reads PORT and SECURITY_TOKEN from environment
  ✔ generates random token if none provided
✔ Server Config - Environment Variables & Directory Discovery
▶ Auth & CORS Middleware
  ✔ CORS in open mode (ALLOWED_ORIGINS=*) allows cross-origin requests and OPTIONS preflight
  ✔ requireAuth correctly validates Bearer token and rejects invalid tokens
✔ Auth & CORS Middleware
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### 2. Frontend Lint & Build (`npm run lint && npm run build`)
- ESLint: 0 errors
- TypeScript (`tsc -b`): Clean compilation with 0 errors
- Vite Build: Successfully generated production bundle and PWA service worker
