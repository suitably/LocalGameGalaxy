---
title: "[Refactor][DRY] Create parseGameUrlParams utility in src/modules/sharing/"
labels: ["refactoring", "dry", "sharing", "priority:medium"]
assignees: []
---

## Summary
The URL parsing logic handling both search query parameters (`?param=...`) and hash-embedded parameters (`#/route?param=...`) is copy-pasted across 5 separate game files.
Extracting this into a central helper in `src/modules/sharing/` eliminates duplicated logic and ensures uniform parameter extraction across all games.

## Problem Details & Exact Code Locations
Duplicate snippet:
```typescript
const hash = window.location.hash;
const queryString = window.location.search || (hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
const params = new URLSearchParams(queryString);
```
Occurrences:
1. [`src/games/garticphone/GarticPhoneGame.tsx:37-42`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx#L37)
2. [`src/games/guessart/GuessArtGame.tsx:75-95`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/GuessArtGame.tsx#L75)
3. [`src/games/storyteller/StorytellerGame.tsx:68-88`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/storyteller/StorytellerGame.tsx#L68)
4. [`src/games/guessart/hooks/useGuessArtGame.ts:48-50`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/guessart/hooks/useGuessArtGame.ts#L48)
5. [`src/games/wordle/WordleGame.tsx:46-47`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/wordle/WordleGame.tsx#L46)

## Dependencies & Preconditions
- **Dependencies:** None. Can be implemented independently in parallel.
- **Blocks:** `ISSUE-SOLID-07` (`useGameJoinUrl` hook)

## Step-by-Step Implementation Instructions
1. Create `src/modules/sharing/parseGameUrlParams.ts`:
   ```typescript
   /**
    * Unified utility to extract query parameters from both standard search query
    * and HashRouter locations (e.g. `#/game/guessart?data=...`).
    */
   export function parseGameUrlParams(
     search = typeof window !== 'undefined' ? window.location.search : '',
     hash = typeof window !== 'undefined' ? window.location.hash : ''
   ): URLSearchParams {
     const hashQuery = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
     const effectiveQuery = search || hashQuery;
     return new URLSearchParams(effectiveQuery);
   }

   /**
    * Cleans the URL search and query parameters without triggering a reload.
    */
   export function cleanWindowUrlQuery(defaultHashPath?: string): void {
     if (typeof window === 'undefined' || !window.history?.replaceState) return;
     const cleanHash = window.location.hash ? window.location.hash.split('?')[0] : (defaultHashPath || '');
     const cleanPath = window.location.pathname + cleanHash;
     window.history.replaceState({}, document.title, cleanPath);
   }
   ```
2. Re-export the helper in `src/modules/sharing/index.ts`.
3. Add unit tests in `src/modules/sharing/parseGameUrlParams.test.ts` covering:
   - standard `?foo=bar`
   - hash `#/games/test?foo=bar`
   - precedence when both search and hash are present
   - empty strings
4. Refactor the 5 files to use `parseGameUrlParams()`.

## Affected Files
- `src/modules/sharing/parseGameUrlParams.ts` (new)
- `src/modules/sharing/parseGameUrlParams.test.ts` (new)
- `src/modules/sharing/index.ts`
- `src/games/garticphone/GarticPhoneGame.tsx`
- `src/games/guessart/GuessArtGame.tsx`
- `src/games/storyteller/StorytellerGame.tsx`
- `src/games/guessart/hooks/useGuessArtGame.ts`
- `src/games/wordle/WordleGame.tsx`

## Acceptance Criteria & Verification
- [ ] Unit tests pass for `parseGameUrlParams`.
- [ ] All 5 target files use `parseGameUrlParams` without manual regex/indexOf slicing.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
