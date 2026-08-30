# Backend Modular Micro-Kernel & GuessArt Multiplayer Lobby Tasks

- [ ] **Phase 1: Backend Micro-Kernel & Plugin Architecture**
  - [ ] Implement `server/src/core/` (Hono app, `types.ts`, `pluginLoader.ts`, `tunnel.ts`).
  - [ ] Implement `server/src/plugins/relay/` for universal room coordination and signaling.
  - [ ] Implement `server/src/plugins/melodiq/` for modular song scanning & streaming.
  - [ ] Configure `server/wrangler.toml` for 1-Click Cloudflare Workers deploy.
  - [ ] Update `server/docker-compose.yml` with profiles (`core`, `melodiq`, `ai`, `tunnel`).
- [ ] **Phase 2: GuessArt Multiplayer Interactive Lobby**
  - [ ] Create `src/games/guessart/logic/guessartRoomManager.ts` to manage room lifecycle, player joins, and host controls.
  - [ ] Create `src/games/guessart/components/GuessArtLobby.tsx` for player join, live player roster, room sharing, and host start button.
  - [ ] Integrate `GuessArtLobby` into `src/games/guessart/GuessArtGame.tsx` with URL routing (`?room=XYZ`).
- [ ] **Phase 3: Verification & Walkthrough**
  - [ ] Run `npm test` (`vitest run`).
  - [ ] Run `npm run lint`.
  - [ ] Run `npm run build` (`tsc -b && vite build`).
  - [ ] Write `docs/verification/backend-plugins-and-guessart-lobby-walkthrough.md`.
