# Implementation Plan: PR 3 - Melodiq Visuals, Lyrics Stability & TV Sung Trails [ID: PLAN-MELODIQ-VISUALS]

## Goal Description
Refine Melodiq's visual presentation and live visualizer synchronization:
1. **Issue #89 (`[Feedback] Zoom von Lyrics`)**: Eliminate layout shifts and scaling jumps in `LyricsDisplay.tsx`. Ensure active words and upcoming line previews have stable line heights and min-heights, replacing transform-based syllable scaling with layout-stable glowing/highlight effects.
2. **Issue #92 (`[Feedback] Lyrics ohne Mics`)**: Create an optimized, full-screen centered Sing-Along / Party Karaoke display when no active singer microphones are present.
3. **Issue #17 (`[MEDIUM] Missing Sung Segments Synchronization on TV Client`)**: Forward `p.segmentsRef.current` (`sungSegments`) through `onPlaybackUpdate`, `getGameState`, and `usePassiveSync` so the TV screen visualizes player pitch trails accurately.

## Proposed Changes

### 1. `src/games/melodiq/gameplay/LyricsDisplay.tsx`
- Ensure containers for active line and next line have fixed/reserved min-heights across breakpoints so instrumental gaps and line transitions don't cause vertical jumping.
- Refactor active note animation from `transform: scale(1.08)` to non-shifting visual highlights (color glow + text-shadow + brightness boost) to prevent word wrapping jitters.
- Provide responsive typography scales for solo and party modes.

### 2. `src/games/melodiq/gameplay/MelodiqSession.tsx`
- Enhance zero-player layout (`visiblePlayers.length === 0`) to provide an enlarged, centered party karaoke experience with clear spacing and optional sing-along indicator.

### 3. `src/games/melodiq/gameplay/hooks/useScoringEngine.ts` & `src/games/melodiq/gameplay/hooks/usePassiveSync.ts`
- Include `sungSegments: p.segmentsRef.current` in the player state payload in `useScoringEngine.ts` and `MelodiqSession.tsx`.
- In `usePassiveSync.ts`, assign `pState.sungSegments` into `rt.segmentsRef.current` so `PitchVisualizer.tsx` on the TV draws pitch history trails smoothly.

## Verification Plan
1. **Lyrics Stability Verification**:
   - Play a song with instrumental breaks and note gaps.
   - Observe line transitions: verify no vertical jumping or size shrinking when switching from active line to pause/countdown.
   - Verify active singing syllable highlights glow smoothly without shifting surrounding text.
2. **No-Mic Centered Display**:
   - Start a song with 0 selected microphones / singers.
   - Verify lyrics appear centered, large, and legible in party karaoke mode.
3. **TV Sung Trails Verification**:
   - In TV mode or passive mode, verify sung note segments and pitch trails appear behind the note bars in real-time.
4. **Lint & Build**:
   - Run `npm run lint` and `npm run build`.
