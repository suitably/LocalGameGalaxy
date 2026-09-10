---
title: "[Storage][DIP] Migrate GarticPhone sessionStorage calls to storage.ts"
labels: ["storage", "dip", "refactoring", "garticphone", "priority:medium"]
assignees: []
---

## Summary
`src/games/garticphone/GarticPhoneGame.tsx` uses raw `sessionStorage` at 10+ locations to cache room state and host ownership.
Per `AGENTS.md` (Section 4.5), direct web storage calls should be abstracted behind `src/lib/storage.ts` to allow memory fallbacks and prevent runtime errors.

## Problem Details & Exact Code Locations
[`src/games/garticphone/GarticPhoneGame.tsx`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx):
- Line 53: `sessionStorage.getItem(\`galaxy_gartic_state_${effectiveRoomId}\`)`
- Line 91: `sessionStorage.getItem(savedHostKey)`
- Line 94: `sessionStorage.setItem(savedHostKey, myPlayerId)`
- Line 107: `sessionStorage.setItem(\`galaxy_gartic_state_${gameState.roomId}\`, ...)`
- Line 151: `sessionStorage.setItem(...)`
- Line 155: `sessionStorage.removeItem(...)`
- Line 172: `sessionStorage.removeItem(...)`
- Line 178: `sessionStorage.setItem(...)`
- Line 236: `sessionStorage.setItem(...)`
- Line 241: `sessionStorage.removeItem(...)`

## Dependencies & Preconditions
- **Dependencies:** None.
- **Blocks:** `ISSUE-SOLID-05` (GarticPhone God Component decomposition)

## Step-by-Step Implementation Instructions
1. In `src/lib/storage.ts`, register GarticPhone keys:
   ```typescript
   GARTIC_STATE_PREFIX: 'galaxy_gartic_state_',
   GARTIC_HOST_PREFIX: 'galaxy_gartic_host_',
   ```
2. If session scope is preferred, provide a safe session abstraction in `storage.ts`:
   ```typescript
   export const sessionStorageSafe = {
     get: (key: string, fallback = ''): string => {
       try {
         return sessionStorage.getItem(key) ?? fallback;
       } catch {
         return fallback;
       }
     },
     set: (key: string, value: string): void => {
       try {
         sessionStorage.setItem(key, value);
       } catch {}
     },
     remove: (key: string): void => {
       try {
         sessionStorage.removeItem(key);
       } catch {}
     },
   };
   ```
3. Replace all direct `sessionStorage.getItem/setItem/removeItem` in GarticPhone with the safe storage methods.

## Affected Files
- `src/lib/storage.ts`
- `src/games/garticphone/GarticPhoneGame.tsx` (or `useGarticGameState.ts` if executed after/during Issue #5)

## Acceptance Criteria & Verification
- [ ] No direct `sessionStorage.` calls in `src/games/garticphone/`:
  ```bash
  grep -rn "sessionStorage\." src/games/garticphone/
  ```
- [ ] GarticPhone preserves local game state across browser refreshes.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
