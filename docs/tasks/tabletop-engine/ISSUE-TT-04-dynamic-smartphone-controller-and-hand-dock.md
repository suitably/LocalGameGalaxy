---
title: "[Feature][Tabletop] Dynamic Schema-Driven Smartphone Controller & Flick-to-TV Gesture"
labels: ["tabletop", "mobile", "controller", "touch", "gestures", "feature", "priority:high"]
assignees: []
---

## Summary
Implement the schema-driven smartphone controller that turns any mobile device into a dedicated, private player remote. The controller dynamically inspects the active `TabletopGameDefinition` and generates the UI automatically for **any** game: open hand cards in a bottom dock, action buttons for drawing from public decks, dice roll buttons, and personal counters. It introduces the **"Flick to TV"** swipe-up gesture to throw cards from the phone onto the shared table.

## Architectural Context & Guidelines
- **Universal Schema Interpretation (No custom game code needed!)**:
  - The controller MUST inspect `game.widgets` dynamically:
    1. Holder where `ownerSeat === mySeat` ➡️ Render open cards in `CardHandDock`.
    2. Widgets with `type === 'deck'` ➡️ Render draw buttons `[🂠 Ziehen: {label}]`.
    3. Widgets with `type === 'holder' && dropTarget` ➡️ Targets for playing cards.
    4. Widgets with `type === 'die'` ➡️ Render `[🎲 Würfeln]` button.
    5. Widgets with `type === 'counter' && ownerSeat === mySeat` ➡️ Render `[ - / + ]` counter.
- **View Switcher (`[ 🃏 Nur Handkarten | 🗺️ Touch-Brett ]`)**:
  - For card games: Pure hand view with table status pill (*„Auf dem Tisch liegt: ♥️ 7“*).
  - For board games (e.g. Chess, Checkers): A responsive touch-board view where players tap a piece and tap a destination square.
- **Capacitor & Touch UX (Section 7 in AGENTS.md)**:
  - Use `var(--safe-area-inset-bottom)` for dock bottom padding.
  - `user-select: none`, `-webkit-tap-highlight-color: transparent`.
  - Pointer events with velocity tracking for the flick/swipe-up gesture.
- **Line Budget**:
  - Max **250 lines** per `.tsx` component. Split into `TabletopControllerView.tsx`, `CardHandDock.tsx`, `FlickGestureHandler.tsx`, `ControllerActionToolbar.tsx`.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-01` (Schema), `ISSUE-TT-03` (Surface & Animation triggers)

## File Paths to Create
- `src/games/tabletop/hooks/useDynamicControllerState.ts`: Hook that scans `game.widgets` for `mySeat` elements, public decks, drop targets, and dice.
- `src/games/tabletop/components/controller/TabletopControllerView.tsx`: Main view orchestrator on smartphones (< 180 lines).
- `src/games/tabletop/components/controller/CardHandDock.tsx`: Horizontal fan/carousel of private hand cards.
- `src/games/tabletop/components/controller/HandCardItem.tsx`: Individual card with 3D elevation, tap highlight, and swipe physics.
- `src/games/tabletop/components/controller/ControllerActionToolbar.tsx`: Dynamic action buttons (Draw, Roll, Counters).
- `src/games/tabletop/components/controller/TargetSelectionDialog.tsx`: Dialog/Sheet prompting *„Auf welchen Stapel legen?“* when multiple targets exist.

## Step-by-Step Implementation Instructions

1. **Controller State Extractor (`useDynamicControllerState.ts`)**:
   ```typescript
   export interface DynamicControllerState {
     myHandCards: CardWidget[];
     myHolders: HolderWidget[];
     publicDecks: DeckWidget[];
     dropTargets: HolderWidget[];
     publicDice: DieWidget[];
     myCounters: CounterWidget[];
     tableSummary: { topDiscardCard?: CardWidget; activePlayerSeat?: number };
   }

   export function useDynamicControllerState(game: TabletopGameDefinition, mySeat: number): DynamicControllerState;
   ```

2. **Flick-to-TV Swipe Gesture (`HandCardItem.tsx`)**:
   - On `pointerdown`: Capture start Y.
   - On `pointermove`: If dragging upward (`deltaY < -40`), translate card with pointer.
   - On `pointerup`:
     - If upward velocity exceeds threshold or `deltaY < -120`: Trigger **FLICK**!
     - Animate card rapidly flying off the top of the smartphone screen.
     - Dispatch play action to shared sync:
       ```typescript
       onFlickToTable({ cardId: card.id, targetHolderId: defaultDropTarget.id });
       ```
     - Play haptic feedback if available (`navigator.vibrate?.(20)`).

3. **Tap-to-Play Alternative**:
   - Tapping a card raises it (selection glow).
   - If 1 drop target exists: Shows pill button `[Auf Ablage spielen]`.
   - If multiple drop targets exist: Opens `TargetSelectionDialog` with options (e.g. `[Stapel A]`, `[Stapel B]`).

4. **Action Toolbar (`ControllerActionToolbar.tsx`)**:
   - Draw buttons: Tapping `[🂠 Ziehen]` pulls the top card from the deck into the player's hand.
   - Dice button: Tapping `[🎲 Würfeln]` rolls the public dice on the TV.
   - Counter buttons: Tap `+` or `-` to adjust player score/life points.

5. **View Mode Switcher**:
   - Segmented toggle at top:
     - `🃏 Hand`: Full screen focused on hand cards and actions.
     - `🗺️ Brett`: Split view showing a responsive interactive mini-board for moving tokens/pieces.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test -- src/games/tabletop
npm run build
```
