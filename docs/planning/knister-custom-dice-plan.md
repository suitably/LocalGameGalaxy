# Knister Custom / Physical Dice & Manual Input — Implementation Plan [ID: PLAN-KNISTER-DICE]

## Goal Description

Extend the Knister game in **LocalGameGalaxy** to support playing with physical dice (or manual number entry), while maintaining full support for the virtual dice roller with toggleable/collapsible visibility (similar to Qwixx):
1. **Collapsible / Toggleable Dice Roller**: Header toggle button ("Würfel") to expand or collapse the virtual 2-dice roller, persisted in `localStorage` (`knister_show_dice`).
2. **Number Selection Bar (2–12)**: A quick number bar allowing players to click a number (2–12) and then tap any empty cell on the 5x5 board to place it.
3. **Direct Cell Click -> Quick Number Picker Modal/Numpad**: When tapping directly on an empty cell without a pre-selected number, open a sleek numpad/number picker modal (2–12) to immediately place the chosen value into that cell.
4. **Undo Placement Support**: Allow players to undo their last cell placement in case of typos or misclicks.
5. **Full i18n & Mobile Optimization**: Complete German and English localization, touch-friendly tap targets, safe-area support, and responsive layouts.

---

## Proposed Changes & Component Breakdown (SOLID Principles)

### 1. Types & Reducer Refactoring (`src/games/knister/logic/types.ts` & `knisterReducer.ts`)
- **`types.ts`**:
  - Add optional `value?: number` to `PLACE_NUMBER` action.
  - Add `UNDO_MOVE` action to `KnisterAction`.
  - Add `historyStack: { row: number; col: number; value: number; playerIndex: number; previousRoll: { die1: number; die2: number; sum: number } | null }[]` to `KnisterState`.
- **`knisterReducer.ts`**:
  - Support direct placement when `action.value` is supplied (increments `rollCount`, updates `rollHistory`, records to `historyStack`, recalculates game over and high scores).
  - Handle `UNDO_MOVE` to revert the last placed cell, decrement `rollCount`, restore previous roll if any, and remove from `rollHistory`.

### 2. Number Selection Bar (`src/games/knister/components/KnisterNumberBar.tsx`)
- Displays chips/buttons for numbers 2 to 12.
- Highlights currently selected number (`selectedNumber`).
- Allows clearing/toggling selection.
- Displays helpful contextual prompt (e.g., "Tippe auf ein freies Feld im Raster, um die X einzutragen").

### 3. Direct Cell Number Picker Dialog (`src/games/knister/components/KnisterNumberPickerModal.tsx`)
- Lightweight modal/dialog that opens when an empty cell is clicked without an active number selection.
- Displays numbers 2–12 in a clear keypad / touch grid.
- Allows immediate one-tap placement and dismissal.

### 4. Board Component Updates (`src/games/knister/components/KnisterBoard.tsx`)
- Accepts `selectedNumber: number | null`.
- Shows ghost preview of `selectedNumber` on empty cells when hovering/focused.
- If `selectedNumber` is `null` and `currentSum` is `null`, clicking an empty cell triggers `onSelectCellForPicker(row, col)`.
- Highlights currently targeted cell if picker is open.

### 5. Main Game View (`src/games/knister/KnisterGame.tsx`)
- Header "Würfel" toggle button (styled with `CasinoIcon`, persisted in `localStorage`).
- Undo button in header/action bar with tooltip and icon (`UndoIcon`).
- Smooth Collapse / conditional display for `KnisterDiceRoller`.
- Integrates `KnisterNumberBar` and `KnisterNumberPickerModal`.

### 6. Localization (`src/games/knister/i18n/index.ts`)
- German & English strings for:
  - `show_dice`, `hide_dice`, `custom_dice`, `select_number`, `pick_number_title`, `tap_cell_hint`, `selected_number_hint`, `clear_selection`, `undo`, `undo_tooltip`, etc.

### 7. Unit Tests (`src/games/knister/logic/knisterReducer.test.ts`)
- Tests for manual number placement (`PLACE_NUMBER` with `value`).
- Tests for undo functionality (`UNDO_MOVE`).
- Tests for roll count and game over conditions with manual entries.

---

## Verification Plan

1. **Unit Tests**: Run `npm run test` ensuring all existing and new Knister tests pass.
2. **ESLint & TypeScript Build**: Run `npm run lint` and `npm run build` with 0 warnings/errors.
3. **Interactive Verification**:
   - Toggle virtual dice roller on/off.
   - Select number from Number Bar (2-12) -> tap empty cell -> verify placement and history.
   - Tap empty cell directly -> Number Picker modal opens -> tap number -> verify instant placement.
   - Place number with virtual dice roller -> verify compatibility.
   - Test Undo button on recent placements.
