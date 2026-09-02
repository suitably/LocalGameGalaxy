# Verification Walkthrough: GuessArt Unified Header [ID: VERIFY-GUESSART-HEADER]

## 1. Summary of Changes
- **LayoutContext & GlobalHeader Enhancement**:
  - `src/context/LayoutContext.tsx`: Added `customHeaderTitle` support, allowing games to inject rich responsive header widgets (such as secret word badges, match info, and round chips). Added equality checks in state setters to guarantee stability and prevent infinite re-render loops.
  - `src/components/Layout/GlobalHeader.tsx`: Integrated `customHeaderTitle` rendering. When `homeAction` is defined, dynamically shows an `ArrowBack` back navigation button with "Zurück" / "Back" tooltip instead of the generic Home icon. Reduced default toolbar padding on compact screens (`minHeight: 48px` on mobile, `56px` on desktop) for maximum drawing area.
- **Dedicated GuessArt Header Hook & Widgets**:
  - `src/games/guessart/hooks/useGuessArtHeader.tsx`: Modular custom hook that binds GuessArt active game states to `LayoutContext`.
  - `src/games/guessart/components/GuessArtHeaderTitle.tsx`: Responsive top header title widget that displays:
    - In **Drawing** mode: High-contrast secret word badge (`Zeichne: [ 🔒 APFEL ]`), round badge (`Runde X`), and drawer indicator.
    - In **Guessing / Waiting** mode: Player matchup (`Alice vs. Bob`), round badge, and role chip (`Rät: Bob` / `Zeichnet: Alice`).
  - Action Menu: Share link, Toggle local/remote player (for host), Edit game details, and Round history are integrated into toolbar and burger menu.
- **UI & Layout Consolidation**:
  - `src/games/guessart/GuessArtGame.tsx`: Replaced redundant `<GameHeader />` component with `useGuessArtHeader`.
  - `src/games/guessart/components/DrawingCanvas.tsx`: Removed the redundant 3rd Paper secret word banner above the canvas. The Excalidraw drawing canvas now starts immediately below the single top AppBar, reclaiming ~120px of vertical space.
  - `src/games/guessart/components/GameHeader.tsx`: Deleted obsolete duplicate header component.
- **Localization (i18n)**:
  - Updated both `public/locales/de/translation.json` and `public/locales/en/translation.json` with missing `common.home` and `common.copied` keys.

## 2. Verification Results

### A. TypeScript Compilation & Vite Build
```bash
npm run build
```
- Output: `tsc -b && vite build` succeeded with exit code 0.
- All 163 assets, service workers, and bundles generated cleanly.

### B. Unit & Integration Tests
```bash
npm test
```
- Output: All 12 test suites and 76 vitest tests passed:
  - `src/games/guessart/logic/guessart.test.ts` (15 tests) ✓
  - `src/games/guessart/logic/playerAssignment.test.ts` (3 tests) ✓
  - `src/games/guessart/logic/guessartNotification.test.ts` (9 tests) ✓
  - `src/games/guessart/logic/gameNameOverride.test.ts` (4 tests) ✓
  - All other games (`sudoku`, `wordle`, `knister`, `cards`, `garticphone`) ✓

### C. ESLint Validation
```bash
npm run lint
```
- Output: 0 errors on the codebase.

## 3. Outstanding Issues
- None.
