/**
 * progress.ts - Whether a running Sudoku would lose player input when replaced.
 */

import type { SudokuState } from './types';

/**
 * True when the board is still running and the player has changed something (a filled
 * cell, a note, a mistake or a hint). Untouched and finished boards can be replaced freely.
 */
export function hasSudokuProgress(
  state: Pick<SudokuState, 'grid' | 'isCompleted' | 'isGameOver' | 'mistakes' | 'hintsUsed'>,
): boolean {
  if (state.isCompleted || state.isGameOver) return false;
  if (state.mistakes > 0 || state.hintsUsed > 0) return true;
  return state.grid.some((row) =>
    row.some((cell) => !cell.isInitial && (cell.value !== 0 || cell.notes.length > 0)),
  );
}
