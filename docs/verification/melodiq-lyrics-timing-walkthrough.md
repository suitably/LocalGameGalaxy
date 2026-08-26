# Verification Walkthrough: Melodiq Lyrics Timing & Layout Unification [ID: VERIFY-MELODIQ-LYRICS-TIMING]

## Changes Implemented

1. **Instant Line Progression & Grace Linger Window**:
   - Refactored active line determination in [`LyricsDisplay.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/LyricsDisplay.tsx).
   - Once a line concludes, it remains visible for a brief grace window (`LINGER_SECONDS = 0.8s`) before advancing **immediately** to the next line in the active slot (Zeile 1 / groß).
   - The upcoming preview line (Zeile 2 / dezent) immediately updates to show the subsequent line.
   - Song opening (Zeile 0) is displayed large in the active slot immediately from playback start ($t=0$).

2. **Persistent Lyrics & 3-2-1 Lead-In Indicator**:
   - Implemented `LeadInIndicator` component rendering non-disruptive, beat-accurate countdown dots (`● ● ●`) during the 3 seconds prior to singing start.
   - Long instrumental gaps ($\ge 5.0\text{s}$) display a sleek pause timer badge (`♪ In Xs...`) without ever hiding or replacing the lyrics text.

3. **Unified Edge-to-Edge Container & Centered Text Alignment**:
   - **Unified Edge-to-Edge Bottom Bar**: Removed the floating rounded box and outer margin in no-mic bottom mode. Both modes (with and without pitch visualizers in bottom mode) now render the exact same full-width edge-to-edge bottom bar (`width: '100%'`, `borderTop: '1px solid rgba(255,255,255,0.12)'`, `bgcolor: 'rgba(0,0,0,0.4)'`, `backdropFilter: 'blur(8px)'`).
   - **Center Mode**: In no-mic center mode, lyrics are centered vertically and horizontally across the screen with `1.45x` font scale for sing-along parties.
   - **Centered Alignment in Duets**: Both Player 1 and Player 2 lanes are centered (`align="center"`) in their respective 50% columns, matching the solo centered layout.

## Verification Results

### ESLint Validation
Executed `npm run lint`:
- Result: **SUCCESS (0 errors)**.

### Compiler & Bundler Validation
Executed `npm run build` (`tsc -b && vite build`):
```bash
vite v7.3.0 building client environment for production...
✓ 1399 modules transformed.
✓ built in 43.76s
```
- Result: **SUCCESS (0 TypeScript / bundling errors)**.
