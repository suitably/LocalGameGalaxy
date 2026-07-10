# Phase 3: Code Component & Logic Documentation Plan [ID: PLAN-PHASE-3-DOCS]

## Goal Description
Document critical code components, custom hooks, services, and engines through JSDoc annotations and dedicated developer guide markdown files to make the codebase maintainable and accessible for new developers.

Specifically, we need to resolve the following remaining issues of Phase 3:
1. **#46 [HIGH] Missing WebRTC Connection and Signaling Documentation**
   - *Proposed Action*: Author a developer guide `docs/tech/webrtc-signaling.md` explaining WebRTC connection states, signaling mechanisms, tracker announcer, and reconnect/retry flows.
2. **#47 [MEDIUM] Undocumented Custom HTML Scraper Parser for USDB Song Search**
   - *Proposed Action*: Add detailed JSDoc to `server/src/services/usdb.js` (specifically `parseUsdbSearch` and related helpers) explaining the regex patterns and index offsets used.
3. **#50 [MEDIUM] Undocumented Canvas Pitch Visualizer and Particle Physics Renderer**
   - *Proposed Action*: Add JSDoc comments to `src/games/melodiq/gameplay/PitchVisualizer.tsx` explaining coordinate calculations, animation loops, and particle dynamics.
4. **#52 [MEDIUM] Undocumented AI Audio Separation and Installation Runner**
   - *Proposed Action*: Add JSDoc comments to `server/src/services/separator.js` detailing the environment validation, execution runner, and error handling.
5. **#53 [HIGH] Undocumented Song Download Service and Dependency Installer**
   - *Proposed Action*: Add JSDoc comments to `server/src/services/download.js` explaining `yt-dlp` updates, audio transcoding, and UltraStar patching.
6. **#55 [HIGH] Undocumented WebRTC Audio Streaming and Multi-Player Runtime State Manager**
   - *Proposed Action*: Add JSDoc comments to `src/games/melodiq/gameplay/hooks/PlayerRuntime.ts` (or similar multiplayer state managers) detailing player scoring and combo state tracking.
7. **#58 [MEDIUM] Undocumented Werewolf Custom Role Editor Component and Ability Specification Types**
   - *Proposed Action*: Add JSDoc comments to `src/games/werewolf/components/RoleEditor.tsx` explaining state transitions and ability maps.

## Proposed Changes
We will modify or create the following files:
- `docs/tech/webrtc-signaling.md` (new documentation file for WebRTC detail)
- `server/src/services/usdb.js` (JSDoc annotations)
- `src/games/melodiq/gameplay/PitchVisualizer.tsx` (JSDoc annotations)
- `server/src/services/separator.js` (JSDoc annotations)
- `server/src/services/download.js` (JSDoc annotations)
- `src/games/melodiq/gameplay/hooks/PlayerRuntime.ts` (JSDoc annotations)
- `src/games/werewolf/components/RoleEditor.tsx` (JSDoc annotations)
- `docs/tech/00_SUMMARY.md` (reference to new documentation)

## Verification Plan
1. **Compilation**: Run `npm run build` to ensure that adding JSDoc comments has not broken any TypeScript/Vite compilations.
2. **Linting**: Run `npm run lint` to verify that no style/linting errors are introduced.
3. **Issue Verification**: Ensure the documents are comprehensive and resolve the target audits.
