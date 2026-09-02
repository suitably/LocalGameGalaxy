# Implementation Plan: GuessArt Unified Header [ID: PLAN-GUESSART-HEADER]

## 1. Goal Description
When playing/drawing in GuessArt, three separate headers are currently stacked vertically on top of each other:
1. `GlobalHeader` (from `MainLayout`)
2. `GameHeader` (from `GuessArtGame`)
3. `Secret Word Banner` (Paper component inside `DrawingCanvas`)

This consumes over 180px of vertical screen real estate, squishing the Excalidraw drawing canvas (especially on mobile and smaller screens).
The goal is to consolidate all three headers into **one single, cohesive, modern top header** following best practices:
- Single App Header utilizing and extending `LayoutContext` / `GlobalHeader`.
- Prominent secret word badge & round info integrated directly into the header when drawing.
- Responsive actions & drawer/guesser info cleanly accessible on desktop and tucked into the burger menu on mobile.
- Clean exit/back navigation directly returning to the GuessArt lobby.
- Maximized drawing canvas and guessing area height.

## 2. Proposed Changes

### A. System & Context Layer
- `src/context/LayoutContext.tsx`:
  - Enhance `LayoutContext` to support `customHeaderTitle?: ReactNode` (or `title: string | ReactNode | null`) and back-navigation styling.
- `src/components/Layout/GlobalHeader.tsx`:
  - Render `customHeaderTitle` if provided, falling back to string title.
  - When `homeAction` is provided, display the `ArrowBack` icon (with Back tooltip/aria-label) instead of the generic Home icon so users know it navigates back within the active game session.

### B. GuessArt Header Hook & Component Layer
- `src/games/guessart/hooks/useGuessArtHeader.tsx`:
  - Dedicated custom hook managing the unified header state for GuessArt.
  - Dynamically updates `useLayout` when inside an active game session:
    - Back action calling `onExit` (returns to GuessArt lobby).
    - Custom Header Widget:
      - When **Drawing**: Prominent secret word chip (`Zeichne: [ 🔒 APFEL ]`), round badge (`Runde X`), and drawer indicator.
      - When **Guessing**: `Drawer vs. Guesser` info, round badge (`Runde X`), and guesser turn chip.
      - When **Selecting / Waiting**: `Drawer vs. Guesser` info, round badge (`Runde X`), and status chip.
    - Responsive menu items: Share Game Link (with copy feedback), Toggle Local/Remote, Edit Game Details, Round History.
  - Cleans up and resets header on lobby view or unmount.

### C. GuessArt Game & Canvas UI Cleanup
- `src/games/guessart/GuessArtGame.tsx`:
  - Integrate `useGuessArtHeader`.
  - Remove `<GameHeader />` component rendering from the view.
- `src/games/guessart/components/DrawingCanvas.tsx`:
  - Remove duplicate `Paper` secret word banner above the canvas so the Excalidraw canvas occupies the full available height.
- `src/games/guessart/components/GameHeader.tsx`:
  - Deprecate / remove or replace with header subcomponents if needed.

### D. Localization (i18n)
- `public/locales/de/translation.json` & `public/locales/en/translation.json`:
  - Ensure all tooltips and labels for the unified header items are mapped in German and English.

## 3. Verification Plan
- Verify drawing mode in GuessArt: only 1 header is rendered, secret word is clearly visible in the header, drawing canvas has significantly increased vertical space.
- Verify guessing mode in GuessArt: round and player info is cleanly visible in the top header.
- Verify lobby mode: standard header with GuessArt title is restored.
- Verify back button: returns to GuessArt lobby.
- Verify responsive layout: mobile screens collapse menu items into burger menu; desktop screens show toolbar icons.
- Run `npm run lint` and `npm run build` to ensure zero errors or warnings.
