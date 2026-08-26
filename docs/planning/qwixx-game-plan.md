# Implementation Plan: PR 7 - New Game Qwixx [ID: PLAN-QWIXX-GAME]

## Goal Description
Implement the complete, responsive digital version of the popular dice game **Qwixx** ([Issue #94](file:///home/deck/Projects/LocalGameGalaxy/docs/planning/qwixx-game-plan.md)):
- **Digital Interactive Score Sheet**: Red (2-12), Yellow (2-12), Green (12-2), Blue (12-2), locks, misses (-5 each), live point calculation ($n(n+1)/2$).
- **Integrated Digital Dice Roller**: 2 white dice + 4 colored dice with roll animations, active combinations guide (White+White for all, White+Color for active player).
- **Solo / Pass-and-Play & Multiplayer P2P Sync**: Room creation, WebRTC peer synchronization, live viewing of opponents' score sheets, row locks broadcast.
- **Strict SRP & Modern UI**: Modular components (`QwixxRow`, `QwixxSheet`, `QwixxDiceRoller`, `QwixxScoreSummary`, `QwixxOpponentView`), full English & German localization.

## Proposed Changes

### 1. `src/games/qwixx/logic/types.ts` & `src/games/qwixx/logic/qwixxReducer.ts`
- Data structures: `ColorRow` (`red`, `yellow`, `green`, `blue`), `DiceState`, `PlayerSheet`, `QwixxGameState`.
- Pure reducer handling cross toggling (enforcing left-to-right rule), lock checking (min 5 numbers), misses recording, and live score calculation.

### 2. `src/games/qwixx/components/`
- `QwixxRow.tsx`: Color-coded numbers with tactile crossed state and locked state.
- `QwixxDiceRoller.tsx`: 6 dice with rolling animations and sum guides.
- `QwixxScoreSummary.tsx`: Points per row, penalty deductions, and total score.
- `QwixxOpponentView.tsx`: Overview of other players' sheets and scores.
- `QwixxSheet.tsx`: Full player board layout.

### 3. `src/games/qwixx/QwixxGame.tsx` & `src/games/qwixx/index.ts`
- Root component with Solo / Multiplayer toggle, P2P sync, and clean barrel export.

### 4. `src/games/qwixx/i18n/index.ts` & `src/lib/gameRegistry.tsx`
- Complete German and English translations.
- Register Qwixx card with custom gradient in `gameRegistry.tsx`.

## Verification Plan
1. **Game Logic Verification**:
   - Verify numbers can only be crossed left to right.
   - Verify lock requires 5 crosses + last number.
   - Verify misses apply -5 points each.
   - Verify live scoring follows $n(n+1)/2$.
2. **Dice Roller & P2P Sync**:
   - Test dice rolling and combination computation.
3. **Compiler & Linter**:
   - Run `npm run lint` and `npm run build`.
