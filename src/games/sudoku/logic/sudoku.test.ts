import { describe, it, expect } from 'vitest';
import { sudokuGenerator } from './sudokuGenerator';

describe('sudokuGenerator', () => {
  it('generates a valid 9x9 solution matrix without duplicates', () => {
    const solution = sudokuGenerator.generateSolutionMatrix();
    expect(solution.length).toBe(9);
    expect(solution.every((row) => row.length === 9)).toBe(true);

    // Check rows
    for (let r = 0; r < 9; r++) {
      const rowSet = new Set(solution[r]);
      expect(rowSet.size).toBe(9);
      expect(rowSet.has(0)).toBe(false);
    }

    // Check columns
    for (let c = 0; c < 9; c++) {
      const colSet = new Set(solution.map((row) => row[c]));
      expect(colSet.size).toBe(9);
      expect(colSet.has(0)).toBe(false);
    }

    // Check 3x3 blocks
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const blockValues: number[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            blockValues.push(solution[br * 3 + r][bc * 3 + c]);
          }
        }
        const blockSet = new Set(blockValues);
        expect(blockSet.size).toBe(9);
      }
    }
  });

  it('generates puzzles with correct clue distributions per difficulty', () => {
    const easy = sudokuGenerator.generatePuzzle('easy');
    let easyClues = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (easy.grid[r][c].isInitial) easyClues++;
      }
    }
    expect(easyClues).toBe(38);

    const expert = sudokuGenerator.generatePuzzle('expert');
    let expertClues = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (expert.grid[r][c].isInitial) expertClues++;
      }
    }
    expect(expertClues).toBe(24);
  });

  it('checks board completion accurately', () => {
    const puzzle = sudokuGenerator.generatePuzzle('easy');
    expect(sudokuGenerator.isBoardComplete(puzzle.grid)).toBe(false);

    // Fill all cells with their solutions
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        puzzle.grid[r][c].value = puzzle.grid[r][c].solution;
      }
    }
    expect(sudokuGenerator.isBoardComplete(puzzle.grid)).toBe(true);

    // One error
    puzzle.grid[0][0].value = puzzle.grid[0][0].solution === 9 ? 1 : puzzle.grid[0][0].solution + 1;
    expect(sudokuGenerator.isBoardComplete(puzzle.grid)).toBe(false);
  });

  it('calculates remaining digit counts accurately', () => {
    const puzzle = sudokuGenerator.generatePuzzle('easy');
    const counts = sudokuGenerator.getRemainingCounts(puzzle.grid);
    const totalRemaining = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(totalRemaining).toBe(81 - 38);
  });
});
