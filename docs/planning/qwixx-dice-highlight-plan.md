# Qwixx Dice Highlight Feature — Implementation Plan

**Issue**: [#95 — Qwixx Dice Enhancement](https://github.com/suitably/LocalGameGalaxy/issues/95)

## Goal Description

When the dice roller is visible and dice have been rolled, clicking on an individual die should briefly highlight crossable numbers on the player's own score sheet.

### Rules:
- **White die clicked** (either `white1` or `white2`): Highlight the sum `white1 + white2` in **all 4 rows** — but only where that number is still crossable per the left-to-right rule.
- **Colored die clicked** (`red`/`yellow`/`green`/`blue`): In the **corresponding color row only**, highlight up to two sums: `colorDie + white1` and `colorDie + white2`. Only highlight numbers that are actually crossable (exist in the row, are not already crossed, and satisfy the left-to-right rule).

### UX:
- Highlighted numbers get a brief glow/pulse animation (~2.5 seconds).
- Clicking another die replaces the current highlight.
- Only works when the dice are visible and have been rolled (not during animation).

## Proposed Changes

### New Files:
1. **`src/games/qwixx/logic/diceHighlight.ts`** — Pure logic: `computeHighlightedNumbers(dieKey, dice, sheet) → Map<RowColor, number[]>`. Uses `canCrossNumber` from the reducer.

### Modified Files:
2. **`src/games/qwixx/components/QwixxDiceRoller.tsx`** — Add `onClick` handlers on each die. Accept a new `onDieClick(key: keyof DiceValues)` callback prop.
3. **`src/games/qwixx/QwixxGame.tsx`** — Manage `highlightedNumbers` state (`Map<RowColor, number[]>` or null). Pass computed highlights down to `QwixxSheet` via a new prop. Wire `onDieClick` to compute + set highlights with a 2.5s auto-clear timer.
4. **`src/games/qwixx/components/QwixxSheet.tsx`** — Accept and forward `highlightedNumbers` prop to each `QwixxRow`.
5. **`src/games/qwixx/components/QwixxRow.tsx`** — Accept `highlightedNumbers?: number[]` prop. Apply a glow/pulse visual effect to matching number buttons.
6. **`src/games/qwixx/i18n/index.ts`** — Add `tap_die_hint` translation key for both EN and DE.

### Component Hierarchy:
```
QwixxGame (state owner: highlightedNumbers, auto-clear timer)
├─ QwixxDiceRoller (new: onDieClick callback, cursor:pointer on dice)
├─ QwixxSheet (passes highlightedNumbers per color)
│  ├─ QwixxRow color="red" (highlightedNumbers=[...])
│  ├─ QwixxRow color="yellow"
│  ├─ QwixxRow color="green"
│  └─ QwixxRow color="blue"
```

## Verification Plan

1. `npm run lint` — No new warnings/errors.
2. `npm run build` — Clean TypeScript compilation & Vite bundle.
3. Manual logic verification: Validate `computeHighlightedNumbers` produces correct results for the example in the issue.
