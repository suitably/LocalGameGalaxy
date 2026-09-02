# Wordle & Sudoku Implementation Plan [ID: PLAN-WORDLE-SUDOKU]

## Goal Description
Implement **Wordle** (Worträtsel & Duell) and **Sudoku** (9x9 Zahlenlogik) as first-class, offline-first games in **LocalGameGalaxy**.

---

## 1. Wordle Architecture
- **Features**:
  - **Daily Wordle (Tagesrätsel)**: Deterministic daily 5-letter word based on date seed (separate German & English word lists).
  - **Practice Mode (Übungsmodus)**: Unlimited random 5-letter words.
  - **Custom Duel (Wortduell)**: Create a custom 5-letter word for friends, generate shareable links/QR codes.
  - **Stats & Streaks**: Local persistence of played games, win rate, streaks, and guess distribution bar chart.
  - **Emoji Share**: Native WhatsApp/clipboard export of the classic emoji grid (🟩🟨⬛).
  - **Polished UX**: On-screen keyboard with key state colors, tile flip animations, invalid word shake effect, high-contrast support.
- **Files**:
  - `src/games/wordle/logic/types.ts`
  - `src/games/wordle/logic/wordleEngine.ts`
  - `src/games/wordle/logic/wordleEngine.test.ts`
  - `src/games/wordle/hooks/useWordle.ts`
  - `src/games/wordle/components/WordleBoard.tsx`
  - `src/games/wordle/components/WordleKeyboard.tsx`
  - `src/games/wordle/components/WordleStatsModal.tsx`
  - `src/games/wordle/components/WordleDuelModal.tsx`
  - `src/games/wordle/WordleGame.tsx`
  - `src/games/wordle/i18n/index.ts`
  - `src/games/wordle/index.ts`

---

## 2. Sudoku Architecture
- **Features**:
  - **Algorithmic 9x9 Generator & Solver**: Fast backtracking generator with guaranteed unique solutions across 4 difficulties (Leicht, Mittel, Schwer, Experte).
  - **Pencil / Note Mode**: Toggle note-taking for candidate numbers per cell.
  - **Smart Highlighting**: Highlights same-number occurrences, active row/column, and 3x3 subgrid.
  - **Game Controls**: Undo/Redo history, Erase, Hint (reveals current selected cell), Timer, Mistake tracker (optional 3-strike mode or unlimited).
  - **Local Persistence & Stats**: Saves in-progress games in `localStorage` so users never lose their board when switching tabs.
- **Files**:
  - `src/games/sudoku/logic/types.ts`
  - `src/games/sudoku/logic/sudokuGenerator.ts`
  - `src/games/sudoku/logic/sudoku.test.ts`
  - `src/games/sudoku/hooks/useSudoku.ts`
  - `src/games/sudoku/components/SudokuGrid.tsx`
  - `src/games/sudoku/components/SudokuNumpad.tsx`
  - `src/games/sudoku/components/SudokuHeader.tsx`
  - `src/games/sudoku/components/SudokuVictoryModal.tsx`
  - `src/games/sudoku/SudokuGame.tsx`
  - `src/games/sudoku/i18n/index.ts`
  - `src/games/sudoku/index.ts`

---

## 3. Hub & Registry Integration
- Add `'puzzle'` category to `GameCategory` in `src/lib/gameRegistry.tsx` and `src/features/hub/Hub.tsx`.
- Register `wordle` and `sudoku` in `GameRegistry`.
- Add translations in `public/locales/{de,en}/translation.json`.

---

## Verification Plan
- Unit tests: `npm test` running `wordleEngine.test.ts` and `sudoku.test.ts`.
- Quality check: `npm run lint` and `npm run build`.
- Verification walkthrough in `docs/verification/wordle-sudoku-walkthrough.md`.
