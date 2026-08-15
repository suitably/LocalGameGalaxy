# Implementation Plan: Melodiq Gameplay, Scoring & Media Sync Fixes [ID: PLAN-MELODIQ-GAMEPLAY-FIXES]

## 1. Goal Description
Resolve reported gameplay issues in Melodiq:
1. **Pitch Elements Not Filling & Scoring 0 Points**: Correct the UltraStar 4x BPM multiplier discrepancy in `useScoringEngine.ts` where `currentBeat` was calculated 4x too slow compared to `PitchVisualizer` and `LyricsDisplay`, preventing active note detection and sung segments creation.
2. **Score Normalization**: Normalize song score accumulation to standard 10,000 max points per track so singing notes awards proportional points and ranks, ensuring scoreboard displays actual earned scores.
3. **Stuttering & Playback Hiccups ("hakt immer wieder")**: Eliminate aggressive `readyState < 3` pause cycles in `useLocalMediaSync.ts` and remove duplicate, conflicting video/vocals synchronization logic from `useScoringEngine.ts`.
4. **Ball Stuck / Choppy Cursor**: Remove `readyState < 3` from `PitchVisualizer.tsx` timeline interpolation and reduce sticky pitch timeout from 2000ms to 300ms with smooth fade-out.
5. **State & Ref Cleanup**: Remove duplicate `useSessionEnd` call in `MelodiqSession.tsx` and ensure `playersRef` is always synchronized with `players`.

## 2. Proposed Changes
- `src/games/melodiq/gameplay/hooks/useScoringEngine.ts`:
  - Enforce UltraStar 4x BPM multiplier (`60000 / (BPM * 4)`).
  - Calculate total track notes weight for 10,000 points normalization.
  - Update `player.score` on every score update.
  - Remove duplicate media sync logic.
- `src/games/melodiq/gameplay/hooks/useLocalMediaSync.ts`:
  - Remove destructive `readyState < 3` pause toggling during normal playback.
  - Apply gentle drift compensation (±0.05 playbackRate or hard snap if > 0.3s).
- `src/games/melodiq/gameplay/PitchVisualizer.tsx`:
  - Remove `readyState < 3` reset from audio time interpolation.
  - Implement 300ms fade-out for pitch cursor when singing stops.
- `src/games/melodiq/gameplay/MelodiqSession.tsx`:
  - Remove redundant duplicate call to `useSessionEnd`.
- `src/games/melodiq/gameplay/hooks/useSessionPlayers.ts`:
  - Ensure `playersRef.current = players` on every state change.

## 3. Verification Plan
- Run `npm run lint` and `npm run build` to ensure 0 errors.
- Create verification walkthrough in `docs/verification/melodiq-gameplay-scoring-fixes-walkthrough.md`.
- Update `docs/tech/melodiq-architecture.md`.
