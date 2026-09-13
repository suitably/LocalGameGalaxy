---
title: "[Refactor][DRY] Create useGameJoinUrl<T> hook in src/modules/sharing/ for LZString snapshots"
labels: ["refactoring", "dry", "sharing", "priority:medium"]
assignees: []
---

## Summary
GuessArt, Storyteller, and GarticPhone each contain duplicate logic that runs on component mount to:
1. Parse URL query params
2. Read the `data` param
3. Decompress the string using `LZString.decompressFromEncodedURIComponent`
4. Parse the JSON payload
5. Invoke game-specific engine snapshot imports
6. Clean the browser URL bar

Extracting this lifecycle logic into `useGameJoinUrl<T>` eliminates ~150 lines of duplicate code and ensures robust error handling.

## Problem Details & Exact Code Locations
1. [`src/games/guessart/GuessArtGame.tsx:83-160`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/GuessArtGame.tsx#L83)
2. [`src/games/storyteller/StorytellerGame.tsx:75-130`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/storyteller/StorytellerGame.tsx#L75)
3. [`src/games/garticphone/GarticPhoneGame.tsx:36-50`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx#L36)

## Dependencies & Preconditions
- **Depends on:** `ISSUE-SOLID-06` (`parseGameUrlParams` utility)
- **Blocks:** `ISSUE-SOLID-05` (GarticPhone God Component decomposition)

## Step-by-Step Implementation Instructions
1. Create `src/modules/sharing/useGameJoinUrl.ts`:
   ```typescript
   import { useEffect, useRef } from 'react';
   import LZString from 'lz-string';
   import { parseGameUrlParams, cleanWindowUrlQuery } from './parseGameUrlParams';

   export interface UseGameJoinUrlOptions<T> {
     onSnapshotLoaded: (snapshot: T, params: URLSearchParams) => Promise<void> | void;
     onDirectGameId?: (gameId: string, params: URLSearchParams) => Promise<void> | void;
     defaultHashPath?: string;
     cleanUrlOnSuccess?: boolean;
   }

   export function useGameJoinUrl<T>({
     onSnapshotLoaded,
     onDirectGameId,
     defaultHashPath,
     cleanUrlOnSuccess = true,
   }: UseGameJoinUrlOptions<T>): void {
     const onSnapshotLoadedRef = useRef(onSnapshotLoaded);
     onSnapshotLoadedRef.current = onSnapshotLoaded;

     const onDirectGameIdRef = useRef(onDirectGameId);
     onDirectGameIdRef.current = onDirectGameId;

     useEffect(() => {
       const params = parseGameUrlParams();
       const dataParam = params.get('data');
       const gameIdParam = params.get('gameId') || params.get('game') || params.get('room');

       if (dataParam) {
         try {
           const decompressed = LZString.decompressFromEncodedURIComponent(dataParam);
           if (decompressed) {
             const parsed = JSON.parse(decompressed) as T;
             onSnapshotLoadedRef.current(parsed, params);
             if (cleanUrlOnSuccess) {
               cleanWindowUrlQuery(defaultHashPath);
             }
             return;
           }
         } catch (err) {
           console.error('[useGameJoinUrl] Failed to decompress snapshot payload:', err);
         }
       }

       if (gameIdParam && onDirectGameIdRef.current) {
         onDirectGameIdRef.current(gameIdParam, params);
         if (cleanUrlOnSuccess) {
           cleanWindowUrlQuery(defaultHashPath);
         }
       }
     }, [defaultHashPath, cleanUrlOnSuccess]);
   }
   ```
2. Re-export in `src/modules/sharing/index.ts`.
3. Refactor `GuessArtGame.tsx` mount effect to use `useGameJoinUrl<GameSnapshot>`.
4. Refactor `StorytellerGame.tsx` mount effect to use `useGameJoinUrl<StoryGameSnapshot>`.
5. Refactor `GarticPhoneGame.tsx` mount effect to use `useGameJoinUrl`.

## Affected Files
- `src/modules/sharing/useGameJoinUrl.ts` (new)
- `src/modules/sharing/index.ts`
- `src/games/guessart/GuessArtGame.tsx`
- `src/games/storyteller/StorytellerGame.tsx`
- `src/games/garticphone/GarticPhoneGame.tsx`

## Acceptance Criteria & Verification
- [ ] Snapshot import on page load via link (`?data=...`) works across all 3 games.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
