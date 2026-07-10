# Phase 5: Architecture & Code Cleanups Plan [ID: PLAN-PHASE-5-CLEANUPS]

## Goal Description
Refactor the LocalGameGalaxy codebase to address architectural coupling, single-responsibility principle violations, circular imports, memory leaks, and open/closed principle violations (Issues #21 to #45).

We will structure the refactoring into 5 logical groups:

### Group 5A: Registry-Driven Modular Routing & Layout (Issues #22, #25, #30)
- **#30 Game routing and selection UI**: Create `src/lib/gameRegistry.tsx` defining standard metadata and dynamic routes for Werewolf, Imposter, and Melodiq. Refactor `App.tsx` and `Hub.tsx` to dynamically query the registry instead of hardcoding game lists.
- **#22 Global layout path coupling**: Refactor `GlobalHeader.tsx` settings-icon visibility check to query the registry (checking if current game `hasSettings`) instead of hardcoding path prefixes.
- **#25 PWA config coupling**: Update `vite.config.ts` PWA manifest to use platform-level metadata (`LocalGameGalaxy`, start URL `/`) instead of single-game details.

### Group 5B: Decoupled Storage & Database Infrastructure (Issues #23, #26, #27, #28, #29, #37, #38, #45)
- **#37 Central Storage Abstraction**: Create `src/lib/storage.ts` to encapsulate all `localStorage` access. Replace scattered `localStorage.getItem` reads/writes.
- **#23 Global db.ts coupling**: Remove Imposter tables from global `src/lib/db.ts`. Create `src/games/imposter/logic/db.ts` for a dedicated `ImposterDB`.
- **#26, #27, #28 Imposter DB decoupling**: Create `src/games/imposter/logic/imposterRepository.ts`. Move direct Dexie queries out of `GameSetup.tsx` and `ImposterGame.tsx` into repository functions.
- **#29 Melodiq DB decoupling**: Create `src/games/melodiq/logic/melodiqRepository.ts`. Move direct `MelodiqDB` queries out of `useSessionEnd.ts`.
- **#45 Seeding race condition**: Update `ImposterGame.tsx` to await `seedImposterDatabase` and maintain a `dbReady` state, blocking game start until seeding finishes.

### Group 5C: Public API Encapsulation & Lints (Issues #32, #33, #34, #35)
- **#32, #33, #34 Barrel Files**: Create public API entry points:
  - `src/games/melodiq/index.ts`
  - `src/games/werewolf/index.ts`
  - `src/games/imposter/index.ts`
  - `src/lib/webrtc/index.ts`
  Update deep imports across the codebase to go through these barrel files.
- **#35 ESLint Boundary Enforcement**: Add custom ESLint boundary rules in `eslint.config.js` to prevent deep imports and enforce public API boundaries.

### Group 5D: WebRTC API Routing & Connection Lifecycle (Issues #24, #36, #41, #43)
- **#36 Inline fetch calls**: Replace inline `fetch` calls in `PlaybackManager.tsx`, `SongActionDialogs.tsx`, and `YouTubeSearchDialog.tsx` with `melodiqFetch` to support WebRTC proxying.
- **#24 Generic connection component coupling**: Update `DeviceConnection.tsx` to read dynamic `helperStorageKey` and `helperTokenKey` props, and dispatch dynamic game event updates.
- **#41 Unstable createManager recreation**: Refactor `WebRTCHostProvider` to store `createManager` in a stable `useRef` to prevent manager teardown/re-creation on render.
- **#43 useQueue hook memory leak**: Clean up the `BroadcastChannel` inside `useQueue.ts` on unmount.

### Group 5E: Custom Role Engine & Werewolf State Reset (Issues #21, #31, #44)
- **#21 Circular imports**: Move `PassiveGameState` interfaces from `MelodiqSession.tsx` to `src/games/melodiq/types.ts`.
- **#31 Custom role multi-ability & targets**: Refactor `NightPhase.tsx` to allow selecting which ability to execute and handle sequential target selections up to `ability.targetCount`.
- **#44 Werewolf State Reset persistence**: Update `useGameStatePersistence.ts` to clear `localStorage` when game state transitions back to `SETUP`.

---

## Proposed Changes
We will modify/create:
- `src/lib/gameRegistry.tsx` (New)
- `src/lib/storage.ts` (New)
- `src/games/imposter/logic/db.ts` (New)
- `src/games/imposter/logic/imposterRepository.ts` (New)
- `src/games/melodiq/logic/melodiqRepository.ts` (New)
- `src/games/melodiq/index.ts`, `src/games/werewolf/index.ts`, `src/games/imposter/index.ts`, `src/lib/webrtc/index.ts` (New index barrel files)
- `src/App.tsx`
- `src/features/hub/Hub.tsx`
- `src/components/Layout/GlobalHeader.tsx`
- `vite.config.ts`
- `src/lib/db.ts`
- `src/games/imposter/logic/dbSeeder.ts`
- `src/games/imposter/ImposterGame.tsx`
- `src/games/imposter/components/GameSetup.tsx`
- `src/games/melodiq/gameplay/hooks/useSessionEnd.ts`
- `src/games/werewolf/hooks/useGameStatePersistence.ts`
- `src/games/melodiq/components/PlaybackManager.tsx`
- `src/games/melodiq/components/SongActionDialogs.tsx`
- `src/games/melodiq/components/YouTubeSearchDialog.tsx`
- `src/components/connection/DeviceConnection.tsx`
- `src/lib/webrtc/WebRTCHostContext.tsx`
- `src/games/melodiq/hooks/useQueue.ts`
- `src/games/melodiq/gameplay/MelodiqSession.tsx`
- `src/games/melodiq/gameplay/hooks/usePassiveSync.ts`
- `src/games/werewolf/components/NightPhase.tsx`

---

## Verification Plan
1. Run `npm run build` and `npm run lint` at the end of each group to ensure no compiler/linter regressions.
2. Confirm dynamic routes function by navigating between pages.
3. Validate that self-signed configs sync across device connection scan callbacks.
