---
title: "[Refactor][SRP] Decompose MelodiqSession.tsx (870 lines) into focused hooks and sub-components"
labels: ["refactoring", "srp", "react", "melodiq", "priority:high"]
assignees: []
---

## Summary
`src/games/melodiq/gameplay/MelodiqSession.tsx` is 870 lines long – the largest single file in the entire codebase.
It is an extreme God Component violating Single Responsibility Principle (SRP):
- Microphone pitch detection and FFT analysis
- Audio stream and background video playback
- Score calculation and combo tracking
- Presentation mode broadcast state
- Full UI overlays, pause menus, and song end dialogues

## Problem Details & Exact Code Locations
- File: [`src/games/melodiq/gameplay/MelodiqSession.tsx:1-870`](file:///home/deck/.gemini/antigravity/worktrees/LocalGameGalaxy/analyze_solid_antipatterns/src/games/melodiq/gameplay/MelodiqSession.tsx#L1)
- Over 25 `useState` and `useRef` declarations in a single function body
- High cognitive complexity makes debugging audio/timing sync issues difficult

## Dependencies & Preconditions
- **Dependencies:** None. Can be initiated in parallel.
- **Recommended after:** `ISSUE-SOLID-10` (Melodiq storage migration) and `ISSUE-SOLID-13` (Melodiq any types)

## Step-by-Step Implementation Instructions
1. Extract session audio & playback controller:
   Create `src/games/melodiq/gameplay/hooks/useSessionAudioController.ts`
   - Encapsulates play, pause, seek, volume, video sync, and playback time updates.
2. Extract session score & combo engine:
   Create `src/games/melodiq/gameplay/hooks/useSessionScoringController.ts`
   - Encapsulates player note hits, pitch error margins, combo multipliers, and final tally.
3. Extract UI sub-components into `src/games/melodiq/gameplay/components/`:
   - `SessionTopControls.tsx` (pause/resume button, progress bar, time indicators)
   - `SessionPauseOverlay.tsx` (MUI Dialog with restart, skip, settings, quit actions)
   - `SessionScoreOverlay.tsx` (animated score counter and combo badges)
4. Refactor `MelodiqSession.tsx` to serve as a pure coordinator orchestrating these hooks and views (< 250 lines).

## Affected Files
- `src/games/melodiq/gameplay/MelodiqSession.tsx`
- `src/games/melodiq/gameplay/hooks/useSessionAudioController.ts` (new)
- `src/games/melodiq/gameplay/hooks/useSessionScoringController.ts` (new)
- `src/games/melodiq/gameplay/components/SessionTopControls.tsx` (new)
- `src/games/melodiq/gameplay/components/SessionPauseOverlay.tsx` (new)
- `src/games/melodiq/gameplay/components/SessionScoreOverlay.tsx` (new)

## Acceptance Criteria & Verification
- [ ] `MelodiqSession.tsx` is under 250 lines.
- [ ] Karaoke pitch detection, lyrics alignment, and scoring work identically to baseline.
- [ ] Pause menu and skip song controls function properly.
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes with zero errors.
