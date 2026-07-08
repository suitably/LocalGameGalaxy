# Plan: Responsive Lyrics Sizing

## Goal Description
On narrow screens, the active lyrics text should be large and the next line preview should be small. On wide screens, this scaling behavior is currently incorrect/under-scaled because the font sizes are static in `rem` and don't scale properly with larger viewports. We will introduce responsive font sizes using MUI media queries (breakpoints) inside `LyricsDisplay.tsx` to ensure that:
1. On narrow screens (mobile/small), the text sizes remain comfortable (active: `3.0 * scale` rem, next line: `1.5 * scale` rem).
2. On wide screens (desktop/TV), the text sizes scale up to look proportionately large and small (active: `5.0 * scale` rem, next line: `2.2 * scale` rem).

## Proposed Changes
- **File**: [LyricsDisplay.tsx](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/gameplay/LyricsDisplay.tsx)
  - Modify the `fontSize` property inside the `sx` prop of the `Typography` components in `LyricsLane` to use MUI breakpoint objects (responsive values) for both the active line and the next line preview.
  - Active line font size:
    ```tsx
    fontSize: {
        xs: `${3.0 * scale}rem`,
        md: `${4.5 * scale}rem`,
        lg: `${5.0 * scale}rem`,
    }
    ```
  - Next line preview font size:
    ```tsx
    fontSize: {
        xs: `${1.5 * scale}rem`,
        md: `${2.0 * scale}rem`,
        lg: `${2.2 * scale}rem`,
    }
    ```

## Verification Plan
1. Check the code for syntax or build errors by running `npm run build`.
2. Ensure no linting errors are introduced by running `npm run lint`.
3. Create a verification log in `docs/verification/responsive-lyrics-walkthrough.md`.
