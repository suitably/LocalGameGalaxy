# Implementation Plan: Melodiq Lyrics Timing & Lead-In Modernization [ID: PLAN-MELODIQ-LYRICS-TIMING]

## Goal Description
Resolve lyrics timing delays and optimize the karaoke reading experience across all game modes (Solo, Duet, with and without Pitch Visualizer):
1. **Instant Line Progression**: Reduce the post-line linger to ~0.8s–1.0s and immediately promote the next line to the main active slot (Zeile 1), allowing singers to read upcoming lyrics well ahead of time.
2. **Persistent Text & Lead-In Indicator**: Eliminate the disruptive countdown that replaced/hid lyrics during long breaks. Keep lyrics large and readable 100% of the time, accompanied by a subtle, beat-synchronized lead-in indicator (3-2-1 dots / break timer) before note onset.
3. **Multi-Mode Support**: Support Solo mode, Duet split-track mode (independent line progression per player), and both visualizer modes (with scrolling pitch bars and party/no-mic sing-along mode without pitch visualizer).

## Proposed Changes

### 1. `src/games/melodiq/gameplay/LyricsDisplay.tsx`
- **Refactor Line Progression Logic**:
  - Calculate active line index using a configurable linger window (`LINGER_SECONDS = 0.8s`).
  - As soon as line $i$ finishes + linger, transition immediately to line $i+1$ in the primary active slot.
  - Preview line displays line $i+2$ in a subtle, translucent style.
  - Line 0 is displayed in the active slot immediately from playback start ($t=0$).
- **Sub-Component Breakdown (SOLID & Clean Architecture)**:
  - `LeadInIndicator`: Renders beat-accurate countdown dots (`● ● ●`) when approaching the first note ($\le 3.0\text{s}$ before start) and an optional subtle pause badge (`In Xs...`) during long instrumental gaps ($\ge 4.0\text{s}$), without hiding the lyrics.
  - `LyricsLine`: Renders syllable spans with glowing active highlights, smooth transitions, and stable typography metrics.
  - `LyricsLane`: Coordinates note grouping, active/preview line indices, and lead-in calculations per audio track.
  - `LyricsDisplay`: Handles Solo vs. Duet layout (50/50 split for duets with independent lane timing).
- **Layout & Visuals**:
  - Preserve stable `minHeight` on text boxes to prevent cumulative layout shift (CLS).
  - Ensure clear contrast and readability for both solo centered and duet left/right alignments.

## Verification Plan
1. **Automated Verification**:
   - Run `npm run lint` to verify ESLint compliance.
   - Run `npm run build` (`tsc -b` and `vite build`) to ensure type safety and error-free bundling.
2. **Functional & Timing Checks**:
   - **Solo Mode**: Verify line advances 0.8s after singing finishes, with upcoming line immediately in the active slot.
   - **Long Breaks / Intro**: Verify lyrics remain visible throughout long pauses with 3-2-1 lead-in dots triggering 3s before singing starts.
   - **Without Pitch Visualizer (Party / No-Mic)**: Verify lead-in dots provide unambiguous entry timing cues for singers without note bars.
   - **Duet Mode**: Verify Player 1 and Player 2 have separate independent line progression and lead-in cues.
