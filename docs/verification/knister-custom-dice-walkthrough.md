# Knister Custom / Physical Dice & Manual Input — Verification & Walkthrough [ID: VERIFY-KNISTER-DICE]

## Changes Implemented

We added comprehensive physical/custom dice support and manual number entry to **Knister**, mirroring the collapsible dice pattern in **Qwixx** and offering flexible input modes:

1. **Einklappbarer Virtual Dice Roller (im exakten Qwixx-Stil)**:
   - Header-Button (`showDice`, mit `CasinoIcon` und Qwixx-Styling), der den Würfelbereich jederzeit ein- oder ausblendet.
   - Design von [`KnisterDiceRoller.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/components/KnisterDiceRoller.tsx) als kompakte, horizontale Glassmorphism-Karte (`Paper elevation={3}`) mit Würfeln links, Summe im Zentrum und Wurf-Zähler + Würfel-Button rechts (analog zu `QwixxDiceRoller`).
   - Zustand wird im `localStorage` (`knister_show_dice`) gespeichert.

2. **Knister Number Bar (2–12)**:
   - Dedicated [`KnisterNumberBar.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/components/KnisterNumberBar.tsx) with buttons for numbers 2 to 12.
   - Selecting a number highlights it and gives visual feedback.
   - Tapping an empty cell on the 5x5 board instantly places the chosen number into that cell.
   - Clear button / toggle click to cancel selection.

3. **Direct Cell Click -> Quick Number Picker Modal (Numpad)**:
   - Dedicated [`KnisterNumberPickerModal.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/components/KnisterNumberPickerModal.tsx).
   - Tapping an empty cell without pre-selected numbers opens an ergonomic 3-column numpad (2 to 12).
   - Tapping any number places it immediately into the target cell with zero extra taps.

4. **Move History & Undo Support**:
   - Extended [`types.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/logic/types.ts) and [`knisterReducer.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/logic/knisterReducer.ts) with `KnisterMoveHistoryEntry`, `moveHistory`, and `UNDO_MOVE`.
   - Undo button in header allowing players to undo accidental clicks or wrong number entries.

5. **Full Internationalization (i18n)**:
   - Updated [`i18n/index.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/i18n/index.ts) with complete German and English translations.

6. **Unit Tests**:
   - Created [`knisterReducer.test.ts`](file:///home/deck/Projects/LocalGameGalaxy/src/games/knister/logic/knisterReducer.test.ts) covering virtual rolls, manual placements, invalid attempts, undo operations, and game resets.

---

## Verification Results

### 1. Unit Tests (`npm run test`)
```
✓ src/games/knister/logic/knisterReducer.test.ts (6 tests)
✓ src/games/knister/logic/knisterScoring.test.ts (10 tests)
✓ All 10 test files passed (64 tests total).
```

### 2. Linting & Production Build (`npm run lint && npm run build`)
```
- eslint: 0 errors
- tsc -b: 0 errors
- vite build: ✓ built in 2m 1s
```

---

## Outstanding Issues

None. All requested features are fully implemented, localized, typed, and tested.
