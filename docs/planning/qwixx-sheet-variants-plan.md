# Qwixx Sheet Variants & Selector — Implementation Plan [ID: PLAN-QWIXX-SHEETS]

## Goal Description

Extend the Qwixx game module in **LocalGameGalaxy** to support choosing from multiple official score sheet variants:
1. **Qwixx Klassisch (Standard)**
2. **Qwixx Gemixxt — Variante A (Mehrfarbige Reihen)**
3. **Qwixx Gemixxt — Variante B (Gemischte Zahlen)**
4. **Qwixx Big Points (Zusatzreihen)**
5. **Qwixx Connected — Treppe (Stairs)**
6. **Qwixx Connected — Kette (Chains)**
7. **Qwixx Double — Zusatzkästchen (Sub-Boxes)**
8. **Qwixx Double — Doppelzahlen (Double Numbers)**
9. **Qwixx Bonus (Bonus-Symbole)**

The user can choose a sheet type in the UI (via a sheet selector button & dialog), switch sheets, see the distinctive visual styles (multi-colored cells, mixed sequences, bonus rows, stair borders), roll dice, use smart highlight suggestions adapted to the active sheet, calculate correct variant scores, and synchronize sheet types over local multiplayer rooms.

---

## Proposed Changes & Component Breakdown (SOLID & Clean Architecture)

### 1. Sheet Registry & Definitions (`src/games/qwixx/logic/sheetDefinitions.ts`)
- Decouples sheet configurations from React components (Single Responsibility Principle).
- Defines cell properties: `number`, `color` (for display/roll matching), `isStair`, `isDouble`, `hasSubBox`, `chainId`, `bonusType`.
- Defines row properties: `id`, `defaultColor`, `cells`, `lockNumber`, `lockColor`.
- Defines sheet properties: `id`, `nameKey`, `descKey`, `rows`, `bonusRows`, `hasStairScoring`, `customScoringFn`.

### 2. Types (`src/games/qwixx/logic/types.ts`)
- Add `QwixxSheetType = 'classic' | 'gemixxt_a' | 'gemixxt_b' | 'big_points' | 'connected_stairs' | 'connected_chains' | 'double_sub' | 'double_numbers' | 'bonus'`.
- Update `PlayerSheet` to include `sheetType: QwixxSheetType`, dynamic row records or extra bonus rows (`bonusRows?: Record<string, RowState>`).
- Add `CHANGE_SHEET_TYPE` action to `QwixxAction`.

### 3. Reducer & Logic Refactor (`src/games/qwixx/logic/qwixxReducer.ts`)
- Make `canCrossNumber`, `canLockRow`, `calculateTotalScore` sheet-aware by referencing `getSheetDefinition(sheetType)`.
- Support multi-colored cell matching (active player colored die matches cell's specific color).
- Support bonus row scoring (Big Points adding to both adjacent rows).
- Support 5th category scoring for Connected Treppe.

### 4. Dice Highlight Engine Refactor (`src/games/qwixx/logic/diceHighlight.ts`)
- Adapt `computeHighlightedNumbers` to inspect cell colors on multi-colored rows (`gemixxt_a`) and non-sequential indices (`gemixxt_b`).

### 5. UI Components
- **`src/games/qwixx/components/QwixxSheetSelector.tsx`** (New): Modal dialog & menu allowing players to view variant descriptions, difficulty, and switch sheets.
- **`src/games/qwixx/components/QwixxRow.tsx`**: Updated to support individual cell colors (`cell.color`), staircase borders (`cell.isStair`), double badges, and sub-boxes.
- **`src/games/qwixx/components/QwixxSheet.tsx`**: Render rows dynamically based on the active `SheetDefinition`, including optional bonus rows.
- **`src/games/qwixx/components/QwixxScoreSummary.tsx`**: Render dynamic breakdown for bonus rows and stair bonuses.
- **`src/games/qwixx/QwixxGame.tsx`**: Integrate sheet selector chip/button in header, persist sheet type in storage, handle multiplayer sheet sync.

### 6. Internationalization (`src/games/qwixx/i18n/index.ts`)
- Full German & English localization for all variant titles, descriptions, and UI badges.

---

## Verification Plan

1. **Static Analysis & Linting**: Run `npm run lint` (zero warnings/errors).
2. **Build Compilation**: Run `npm run build` (successful `tsc -b` and Vite bundle).
3. **Logic Tests / Verification**: Validate crossing rules, highlight calculation, and score computation across all variants.
