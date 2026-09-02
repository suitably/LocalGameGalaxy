/**
 * types.ts - Sudoku Game Types and State Definitions
 */

export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SudokuCell {
  row: number;
  col: number;
  value: number; // 0 = empty, 1-9
  solution: number;
  isInitial: boolean;
  notes: number[]; // Pencil marks (1-9)
  isError?: boolean;
}

export type SudokuGridData = SudokuCell[][];

export interface SudokuMove {
  row: number;
  col: number;
  prevValue: number;
  newValue: number;
  prevNotes: number[];
  newNotes: number[];
}

export interface SudokuStats {
  played: number;
  completed: number;
  bestTime: Record<SudokuDifficulty, number | null>; // in seconds
}

export interface SudokuState {
  grid: SudokuGridData;
  difficulty: SudokuDifficulty;
  selectedCell: { row: number; col: number } | null;
  isPencilMode: boolean;
  mistakes: number;
  maxMistakes: number; // 3 or Infinity
  timeElapsed: number; // in seconds
  isPaused: boolean;
  isCompleted: boolean;
  isGameOver: boolean;
  hintsUsed: number;
}
