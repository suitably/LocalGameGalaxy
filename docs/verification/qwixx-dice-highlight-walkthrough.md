# Qwixx Dice Highlight — Verification Walkthrough

**Issue**: [#95 — Qwixx Dice Enhancement](https://github.com/suitably/LocalGameGalaxy/issues/95)

## Changes Implemented

### New File
- **`src/games/qwixx/logic/diceHighlight.ts`** — Pure logic module with `computeHighlightedNumbers(dieKey, dice, sheet)` that calculates which numbers should glow on the score sheet when a die is tapped.

### Modified Files
| File | Change |
|------|--------|
| `src/games/qwixx/components/QwixxDiceRoller.tsx` | Added `onDieClick` + `selectedDie` props. Each die is now clickable with `cursor: pointer`, selection ring (golden glow), and `&:active` press feedback. |
| `src/games/qwixx/components/QwixxRow.tsx` | Added `highlightedNumbers?: number[]` prop. Matching uncrossed cells get a pulsing golden glow animation (`@keyframes diceHighlightPulse`) with scale-up. |
| `src/games/qwixx/components/QwixxSheet.tsx` | Added `highlightedNumbers` prop, forwarded per-color arrays to each `QwixxRow`. |
| `src/games/qwixx/QwixxGame.tsx` | State owner for `selectedDie` + `highlightedNumbers`. Wires `handleDieClick` callback with 2.5s auto-clear timer. Clears highlights on new roll. |
| `src/games/qwixx/i18n/index.ts` | Added `tap_die_hint` key for EN ("Tap a die to highlight crossable numbers") and DE ("Tippe auf einen Würfel, um ankreuzbare Zahlen hervorzuheben"). |
| `src/games/qwixx/index.ts` | Exported `computeHighlightedNumbers` and `DieKey` from barrel. |

### Highlight Logic (`computeHighlightedNumbers`)
- **White die**: `white1 + white2` sum → checked against ALL 4 rows using `canCrossNumber`.
- **Colored die**: `color + white1` and `color + white2` → checked against matching color row only.
- Skips locked rows. Only includes numbers that pass `canCrossNumber` (exists in row, not already crossed, satisfies left-to-right rule).

### UX Behavior
1. Tap a die → selected die gets golden ring, matching scoreboard cells pulse with golden glow.
2. Tap the same die again → toggle off.
3. Tap a different die → replaces highlight.
4. After 2.5 seconds → auto-clears.
5. Rolling new dice → immediately clears any active highlight.

## Verification Results

### TypeScript Compilation (`tsc -b`)
```
✓ 0 errors
```

### Vite Build (`vite build`)
```
✓ 1420 modules transformed
✓ built in 17.06s
✓ PWA: 19 entries precached
```

### ESLint (`npm run lint`)
```
✖ 443 problems (0 errors, 443 warnings)
→ All warnings are pre-existing (no-explicit-any in lib files, unused vars in catch blocks)
→ No new warnings introduced
```

## Outstanding Issues
- None. All files compile, lint, and build cleanly.
