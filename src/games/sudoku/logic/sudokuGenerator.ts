/**
 * sudokuGenerator.ts - 9x9 Sudoku Board Generator & Solver
 */

import type { SudokuDifficulty, SudokuGridData } from './types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const sudokuGenerator = {
  /**
   * Checks if placing a number at grid[row][col] is valid in a raw 9x9 number matrix.
   */
  isValidPlacement(matrix: number[][], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (matrix[row][i] === num || matrix[i][col] === num) {
        return false;
      }
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (matrix[startRow + r][startCol + c] === num) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Solves/generates a full valid 9x9 Sudoku solution matrix using backtracking.
   */
  fillBoard(matrix: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (matrix[row][col] === 0) {
          const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of numbers) {
            if (this.isValidPlacement(matrix, row, col, num)) {
              matrix[row][col] = num;
              if (this.fillBoard(matrix)) {
                return true;
              }
              matrix[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  },

  /**
   * Generates a completed 9x9 solution matrix.
   */
  generateSolutionMatrix(): number[][] {
    const matrix: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fillBoard(matrix);
    return matrix;
  },

  /**
   * Creates a playable Sudoku grid with holes according to difficulty.
   */
  generatePuzzle(difficulty: SudokuDifficulty): { grid: SudokuGridData; solution: number[][] } {
    const solution = this.generateSolutionMatrix();
    const puzzleMatrix = solution.map((row) => [...row]);

    const cluesTarget = {
      easy: 38,
      medium: 32,
      hard: 28,
      expert: 24,
    }[difficulty] || 32;

    const holesToDig = 81 - cluesTarget;
    let holesDug = 0;

    const positions: { row: number; col: number }[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push({ row: r, col: c });
      }
    }
    const shuffledPositions = shuffle(positions);

    for (const { row, col } of shuffledPositions) {
      if (holesDug >= holesToDig) break;
      if (puzzleMatrix[row][col] !== 0) {
        puzzleMatrix[row][col] = 0;
        holesDug++;
      }
    }

    const grid: SudokuGridData = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => ({
        row: r,
        col: c,
        value: puzzleMatrix[r][c],
        solution: solution[r][c],
        isInitial: puzzleMatrix[r][c] !== 0,
        notes: [],
        isError: false,
      }))
    );

    return { grid, solution };
  },

  /**
   * Calculates the remaining count of each digit 1-9 on the board.
   */
  getRemainingCounts(grid: SudokuGridData): Record<number, number> {
    const counts: Record<number, number> = {
      1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9,
    };

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c].value;
        if (val >= 1 && val <= 9 && !grid[r][c].isError) {
          counts[val] = Math.max(0, (counts[val] || 9) - 1);
        }
      }
    }

    return counts;
  },

  /**
   * Checks if the entire board is correctly filled.
   */
  isBoardComplete(grid: SudokuGridData): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = grid[r][c];
        if (cell.value === 0 || cell.value !== cell.solution || cell.isError) {
          return false;
        }
      }
    }
    return true;
  },
};
