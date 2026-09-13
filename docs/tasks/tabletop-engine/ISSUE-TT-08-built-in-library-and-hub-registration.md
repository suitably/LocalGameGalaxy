---
title: "[Feature][Tabletop] Built-In Games Library, Hub Registration, and i18n"
labels: ["tabletop", "hub", "i18n", "library", "feature", "priority:high"]
assignees: []
---

## Summary
Complete the Tabletop module integration: bundle starter built-in games (Standard 52-Card Deck, Liar's Dice, Checkers), compose the top-level orchestrator component (`TabletopGame.tsx`), register it in `gameRegistry.tsx` (supporting both direct local play from the Hub and multi-device party play), and provide full German and English translations.

## Architectural Context & Guidelines
- **Game Registration (OCP)**:
  - Register in `src/lib/gameRegistry.tsx` using `lazy()` dynamic import.
- **Top-Level Orchestrator (< 160 lines)**:
  - `TabletopGame.tsx` inspects URL params (`room`, `role`, `seat`, `gameId`, `local`):
    - `role === 'tv'`: Renders `TabletopSurface` (Full-screen shared board).
    - `seat !== undefined`: Renders `TabletopControllerView` (Smartphone Hand & Flick Controller).
    - `local === '1'`: Renders local Pass-and-Play / Tablet mode.
    - No params: Renders `TabletopLobbyView` (Spielekatalog / Manager).
- **Global Header Integration**:
  - Sets page title dynamically via `usePageTitle`.
  - Integrates header action menus: *Game Manager*, *Share QR*, *Seat Switcher*, *Zurück zur Party-Lobby*.
- **i18n (Section 6 in AGENTS.md)**:
  - Add all translation keys to both `public/locales/de/translation.json` and `public/locales/en/translation.json`.

## Dependencies & Preconditions
- **Depends on:** `ISSUE-TT-01` (Parser), `ISSUE-TT-06` (Party Launcher), `ISSUE-TT-07` (PR Publisher)

## File Paths to Create / Modify
- `src/games/tabletop/TabletopGame.tsx`: Top-level orchestrator (< 160 lines).
- `src/games/tabletop/components/views/TabletopLobbyView.tsx`: Games browser and manager view.
- `public/games/tabletop/manifest.json`: Index of built-in games.
- `public/games/tabletop/standard-cards.json`: 52-card deck with draw pile, discard holder, and 4 player hands.
- `public/games/tabletop/liars-dice.json`: Liar's Dice with dice cups, dice, and bid counters.
- `public/games/tabletop/checkers.json`: 8x8 checkerboard with red and black pieces.
- `src/lib/gameRegistry.tsx`: Register `tabletop` game definition.
- `public/locales/de/translation.json`: German translation keys.
- `public/locales/en/translation.json`: English translation keys.

## Step-by-Step Implementation Instructions

1. **Create Starter Game JSON Files**:
   - `public/games/tabletop/standard-cards.json`:
     - Modes: `['party_multi_device', 'local_pass_and_play']`.
     - Decks: Standard 52 cards.
     - Holders: 1 Draw Pile, 1 Discard Pile (`dropTarget: true`), 4 Hands (`isHand: true`).
   - `public/games/tabletop/liars-dice.json`:
     - Modes: `['party_multi_device']`.
     - 3D Dice sets per player + dice cup concealed holders.
   - `public/games/tabletop/checkers.json`:
     - Modes: `['local_pass_and_play', 'party_multi_device']`.
     - 8x8 grid with red and black tokens.

2. **Compose Slim Orchestrator (`TabletopGame.tsx`)**:
   ```typescript
   export function TabletopGame() {
     const [searchParams] = useSearchParams();
     const roomId = searchParams.get('room');
     const role = searchParams.get('role'); // 'tv' | 'player'
     const seat = searchParams.get('seat') ? Number(searchParams.get('seat')) : null;
     const isLocal = searchParams.get('local') === '1';

     usePageTitle(t('games.tabletop.title'));

     // 1. TV / Shared Table View
     if (roomId && role === 'tv') {
       return <TabletopSurface roomId={roomId} isTvMode={true} />;
     }

     // 2. Smartphone Controller View
     if (roomId && seat !== null) {
       return <TabletopControllerView roomId={roomId} mySeat={seat} />;
     }

     // 3. Local Pass-and-Play
     if (isLocal) {
       return <TabletopSurface isLocalPassAndPlay={true} />;
     }

     // 4. Fallback: Tabletop Lobby & Game Manager
     return <TabletopLobbyView />;
   }
   ```

3. **Register in `src/lib/gameRegistry.tsx`**:
   - Add lazy loader:
     ```typescript
     const TabletopGame = lazy(() => import('../games/tabletop').then(m => ({ default: m.TabletopGame })));
     ```
   - Register definition in `games` array with `id: 'tabletop'`, route `games/tabletop`, and category `cards`.

4. **Complete Translations (`de` and `en`)**:
   - Add all UI keys under `games.tabletop.*`:
     - Buttons: `play_party`, `play_local`, `edit`, `export`, `publish`, `delete`, `draw_card`, `flick_to_tv`, `roll_dice`.
     - Dialogs: `import_title`, `edit_title`, `publish_title`, `confirm_delete`.
     - Modes: `party_multi_device`, `local_pass_and_play`, `solo`.

## Verification & Quality Gates
```bash
npm run check:architecture:diff
npm run check:budget
npm run lint
npm test
npm run build
```
