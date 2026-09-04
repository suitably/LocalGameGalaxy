---
title: "[UX][Navigation] Fix Melodiq Hub Navigation Trapping & Eliminate Double Headers in Sudoku, Wordle, Knister, Qwixx"
labels: ["bug", "ux", "navigation", "layout", "high-priority"]
assignees: []
---

## Summary
There are two critical navigation/layout flaws across several games:
1. **Melodiq traps the user inside the game:** Clicking the top-left Home button does not return to the Game Hub.
2. **Double Headers:** Sudoku, Wordle, Knister, and Qwixx fail to integrate with `GlobalHeader`, rendering stacked duplicate top bars and duplicate back buttons.

## Problem Details

### 1. Melodiq Navigation Trapping
In [`useMelodiqHeader.tsx:L34`](file:///home/deck/Projects/LocalGameGalaxy/src/games/melodiq/hooks/useMelodiqHeader.tsx#L34):
```ts
// Always intercept home button to keep user in Melodiq
const homeAction = () => setCurrentView('Home');
```
Even when `currentView === 'Home'`, `homeAction` is set, replacing the Home icon with a back arrow. Clicking it only triggers `setCurrentView('Home')`, completely trapping the user inside Melodiq with no way to return to `/`.

### 2. Double Headers & Duplicate Back Buttons
- **Sudoku:** Renders `GlobalHeader` (with Home icon) AND an in-page `SudokuHeader` with a second back arrow button (`navigate('/')`), duplicate title, and stats buttons.
- **Wordle:** Renders `GlobalHeader` AND an in-page top bar (`WordleGame.tsx:L98-L143`) with a second back arrow button, duplicate title, and icons.
- **Knister & Qwixx:** Both games render `GlobalHeader` AND an in-page title banner with secondary action buttons.

## Proposed Solution (SOLID: Single Responsibility & Dependency Inversion)
1. **Melodiq:**
   Update `useMelodiqHeader.tsx`: If `currentView === 'Home'`, set `homeAction = null`. This restores the standard GlobalHeader Home button leading back to the Hub (`/`).
2. **Sudoku & Wordle:**
   - Call `usePageTitle(t('games.sudoku.title'))` and `usePageTitle(t('games.wordle.title'))`.
   - Remove the inner secondary back buttons and title typography.
   - Register secondary actions (Stats, Help, Duel, Difficulty) into `LayoutContext` as `menuItems`.
3. **Knister & Qwixx:**
   - Move in-page action buttons (Dice toggle, Reset, Rules) into `LayoutContext` `menuItems` so they collapse cleanly into the header overflow menu on mobile devices.

## Affected Files
- `src/games/melodiq/hooks/useMelodiqHeader.tsx`
- `src/games/sudoku/SudokuGame.tsx` & `src/games/sudoku/components/SudokuHeader.tsx`
- `src/games/wordle/WordleGame.tsx`
- `src/games/knister/KnisterGame.tsx`
- `src/games/qwixx/QwixxGame.tsx`

## Acceptance Criteria
- [ ] Clicking the Home button in Melodiq on view 'Home' navigates back to `/`.
- [ ] No game displays two stacked header bars or two back buttons simultaneously.
- [ ] Header actions in Sudoku, Wordle, Knister, and Qwixx collapse cleanly into the responsive hamburger menu on mobile screens.
