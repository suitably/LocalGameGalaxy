---
title: "[Refactor][SRP] Decompose GarticPhoneGame.tsx God Component into focused hooks and sub-components"
labels: ["refactoring", "srp", "react", "garticphone", "priority:high"]
assignees: []
---

## Summary
`src/games/garticphone/GarticPhoneGame.tsx` (393 lines) is a God Component that combines:
1. URL parsing & query param sanitization
2. Direct `sessionStorage` manipulation (10+ calls)
3. Local & remote synchronization dispatching
4. Player & lobby management (invoking `universalPartyManager`)
5. Round state transitions and step evaluation
6. View rendering for 6 different game phases

Per `AGENTS.md` (Section 4), components exceeding ~250 lines violating Single Responsibility Principle (SRP) must be broken down into custom hooks and sub-components.

## Problem Details & Exact Code Locations
- Component: [`src/games/garticphone/GarticPhoneGame.tsx:1-393`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/garticphone/GarticPhoneGame.tsx#L1)
- Direct `sessionStorage` calls: Lines 53, 91, 94, 107, 151, 155, 172, 178, 236, 241
- Inline sync setup: Lines 113-178
- Inline URL handling: Lines 36-50

## Dependencies & Preconditions
- **Depends on:**
  - `ISSUE-SOLID-03` (eliminate cross-game import in GarticPhone)
  - `ISSUE-SOLID-04` (useMultiChannelSync hook)
  - `ISSUE-SOLID-06` (`parseGameUrlParams` utility)
  - `ISSUE-SOLID-12` (GarticPhone storage migration)

## Step-by-Step Implementation Instructions
1. Extract state and action logic into `src/games/garticphone/hooks/useGarticGameState.ts`:
   - State: `gameState`, `myPlayerId`, `amHost`
   - Actions: `startGame`, `submitStep`, `endGame`, `restartGame`, `updateRemoteState`
   - Storage interactions should delegate to `src/lib/storage.ts` using registered keys.
2. Delegate synchronization to `useMultiChannelSync` (from Issue #4) inside a new hook `src/games/garticphone/hooks/useGarticSync.ts`.
3. Simplify `GarticPhoneGame.tsx` down to under 150 lines:
   - It only coordinates `useGarticGameState`, `useGarticSync`, and routes to the appropriate view (`GarticPromptStep`, `GarticDrawingStep`, `GarticGuessingStep`, `GarticAlbumReveal`, `GarticWaitingStatus`).
4. Ensure all sub-components receive clean, minimal prop interfaces (Interface Segregation Principle).

## Affected Files
- `src/games/garticphone/GarticPhoneGame.tsx`
- `src/games/garticphone/hooks/useGarticGameState.ts` (new)
- `src/games/garticphone/hooks/useGarticSync.ts` (new)

## Acceptance Criteria & Verification
- [ ] `src/games/garticphone/GarticPhoneGame.tsx` is under 180 lines.
- [ ] No direct `sessionStorage` or `localStorage` calls exist inside `GarticPhoneGame.tsx`.
- [ ] All game transitions (Prompt -> Draw -> Guess -> Reveal) work reliably.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
