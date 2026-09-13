---
title: "[Feature][Tabletop] Build Shared Tabletop Surface and Core Widget Renderers"
labels: ["tabletop", "ui", "react", "widgets", "tv-mode", "feature", "priority:high"]
assignees: []
---

## Summary
Build the shared 2D virtual tabletop surface in React 19 optimized for both TV/Tablet board display and desktop/tablet interaction. The surface renders public board elements (board, decks, discard zones, tokens, 3D dice, counters) and displays opponent player hands in a concealed state (rendered as card backs with remaining count badge to preserve fog of war).

## Architectural Context & Guidelines
- **Role Awareness**:
  - In **TV / Host Mode**: Renders the table in full-screen glory without any personal hand dock clutter.
  - In **Local / Pass-and-Play Mode**: Allows touch interaction directly on the table surface with smooth pan & pinch-to-zoom.
- **Fog of War & Concealment**:
  - Any `HolderWidget` marked `isHand: true` must render on the shared surface with all cards face-down (`backContent`), displaying only the count of cards held by that player.
- **Anti-God-Component Architecture (Section 3.1 in AGENTS.md)**:
  - Max **250 lines** per `.tsx` component.
  - Separate widget views into `CardWidgetView`, `DeckWidgetView`, `HolderWidgetView`, `TokenWidgetView`, `CounterWidgetView`.
- **3D Dice Integration**:
  - Reuse animated `<Die3D>` from `src/components/games/Die3D.tsx` for dice rolling animations.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-01` (Types and Schema)

## File Paths to Create
- `src/games/tabletop/logic/tabletopReducer.ts`: Redux-style reducer managing table positions, card stacks, and widget state.
- `src/games/tabletop/hooks/useTabletopEngine.ts`: Hook for pan/zoom transforms, coordinate mapping, and holder collision detection.
- `src/games/tabletop/components/surface/TabletopSurface.tsx`: Main canvas container with zoom, pan, and transform matrix.
- `src/games/tabletop/components/widgets/CardWidgetView.tsx`: Individual card rendering (front/back 3D flip, shadows, rotation).
- `src/games/tabletop/components/widgets/DeckWidgetView.tsx`: Card deck stack with draw tap and count badge.
- `src/games/tabletop/components/widgets/HolderWidgetView.tsx`: Drop target zone with snap outline; if `isHand: true`, renders concealed card backs.
- `src/games/tabletop/components/widgets/TokenWidgetView.tsx`: Moveable tokens and meeples.
- `src/games/tabletop/components/widgets/CounterWidgetView.tsx`: Number counter with + / - buttons.

## Step-by-Step Implementation Instructions

1. **Tabletop Reducer (`tabletopReducer.ts`)**:
   - Actions: `LOAD_GAME`, `MOVE_WIDGET`, `FLIP_CARD`, `SHUFFLE_DECK`, `DRAW_CARD`, `SNAP_TO_HOLDER`, `UPDATE_COUNTER`, `ANIMATE_CARD_TO_TABLE`.
   - Ensure pure deterministic updates.

2. **Pan & Zoom Surface (`TabletopSurface.tsx`)**:
   - Multi-touch pinch-to-zoom and two-finger pan for tablets.
   - Coordinate transformation: Screen pixel coordinates `(clientX, clientY)` -> Table board coordinates `(x, y)` factoring in scale and translate offset.
   - TV Mode toggle: Centers and auto-scales the table to fit the screen without requiring manual zoom.

3. **Holder Widget View (`HolderWidgetView.tsx`)**:
   - If `holder.isHand === true`:
     - Render as private player zone. On the shared table, display player name, avatar color, and a neat stack/fan of **card backs** showing `{childIds.length} Karten`.
   - If `holder.dropTarget === true`:
     - Render as open play/discard zone with dashed border, magnetic snap highlight on hover.

4. **Fly-In Animation for "Flick to TV"**:
   - When action `ANIMATE_CARD_TO_TABLE` arrives from a player's phone, animate the card flying from the bottom of the TV screen onto the target drop holder over 400ms.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test -- src/games/tabletop
npm run build
```
