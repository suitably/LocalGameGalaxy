# GuessArt Integration Walkthrough [ID: GUESSART-WALKTHROUGH]

## 1. Summary of Changes

The drawing and guessing game **GuessArt** (inspired by Yidi) has been natively integrated into LocalGameGalaxy as a local-first game module with zero external server dependencies:

1. **Architecture & Storage (`src/games/guessart/logic/`)**:
   - IndexedDB database (`guessart-local`) managing games, rounds, metadata, and custom word catalogues.
   - Pure linguistic evaluation (`lingo.ts`, `guessEvaluator.ts`): German umlaut transliteration (`ä` -> `ae`), diacritic normalization, English & German inflection handling, and Levenshtein-based fuzzy matching with dynamic thresholds.
   - Built-in multi-lingual default lexicon (`defaultLexicon.ts`) with German & English categories (Animals, Food, Objects, Activities, Nature, Professions) and difficulty levels.
   - Deterministic hint resolver (`hintResolver.ts`): Stage 1 word mask (`_ _ _ _`) and Stage 2 scrambled letter pool.
   - Drawing stroke ordering & animation planner (`excalidrawScene.ts`).

2. **Custom Hooks (`src/games/guessart/hooks/`)**:
   - `useGuessArtGame`: Encapsulates game lifecycle state (selecting -> drawing -> guessing -> completed) and actions.
   - `useGuessArtLobby`: Manages player roster and resumable active local games.
   - `useKeyboardInsets`: Manages mobile visual viewports on mobile devices.

3. **UI Components (`src/games/guessart/components/`)**:
   - `ExcalidrawLazy`: Code-split lazy loader for `@excalidraw/excalidraw` with dynamic stylesheet injection.
   - `DrawingCanvas`: Full-screen drawing interface with element validation and stroke capture.
   - `ExcalidrawViewer`: Animated playback engine that replays strokes sequentially with variable speed and skip option.
   - `HintWordSlots` & `HintLetterChips`: Visual interactive hint displays.
   - `GuessPanel`: Guesser input bar with repeated-guess warnings and hint request triggers.
   - `GameSetup` & `ActiveGamesList`: Lobby view supporting player management, custom words mode toggle, and game resuming/deletion.
   - `RoundSuccessModal` & `GameInfoDialog`: Native `<dialog>` elements for celebration & rules modals.

4. **Registry & Localization**:
   - Registered in [`src/lib/gameRegistry.tsx`](file:///home/deck/Projects/LocalGameGalaxy/src/lib/gameRegistry.tsx) with route `games/guessart` and `PaletteIcon`.
   - Comprehensive German & English translations in `public/locales/de/translation.json` and `public/locales/en/translation.json`.

---

## 2. Verification Results

### Vitest Unit Tests
Command: `npm test`
Output:
```
 ✓ src/components/connection/connectionUrl.test.ts (2 tests) 8ms
 ✓ src/games/guessart/logic/guessart.test.ts (11 tests) 18ms

 Test Files  2 passed (2)
      Tests  13 passed (13)
```

### ESLint Check
Command: `npx eslint src/games/guessart`
Output:
```
✖ 0 problems (0 errors, 0 warnings)
```

### TypeScript & Vite Production Build
Command: `npm run build` (`tsc -b && vite build`)
Output:
```
✓ built in 1m 8s
PWA v1.2.0
precache 158 entries (9802.83 KiB)
```

### Capacitor Native Sync
Command: `npx cap sync`
Output:
```
✔ Copying web assets from dist to android/app/src/main/assets/public
✔ Creating capacitor.config.json in android/app/src/main/assets
✔ Updating Android plugins
[info] Sync finished in 0.449s
```

---

## 3. Outstanding Issues
None. The game is fully functional, type-safe, localized, and integrated into LocalGameGalaxy.
