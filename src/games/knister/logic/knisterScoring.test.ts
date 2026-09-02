import { describe, it, expect } from 'vitest';
import { evaluateLine, calculateBoardScores, createEmptyGrid } from './knisterScoring';

describe('Knister Scoring Logic', () => {
  it('evaluates incomplete lines as 0 points', () => {
    const line = [2, 3, null, 5, 6];
    const res = evaluateLine(line);
    expect(res.points).toBe(0);
    expect(res.isComplete).toBe(false);
  });

  it('evaluates a pair as 1 point', () => {
    const line = [3, 3, 5, 8, 9];
    const res = evaluateLine(line);
    expect(res.points).toBe(1);
    expect(res.type).toBe('pair');
  });

  it('evaluates two pairs as 3 points', () => {
    const line = [4, 4, 7, 7, 10];
    const res = evaluateLine(line);
    expect(res.points).toBe(3);
    expect(res.type).toBe('two_pairs');
  });

  it('evaluates three of a kind as 3 points', () => {
    const line = [6, 6, 6, 2, 9];
    const res = evaluateLine(line);
    expect(res.points).toBe(3);
    expect(res.type).toBe('triple');
  });

  it('evaluates Full House as 6 points', () => {
    const line = [8, 8, 8, 5, 5];
    const res = evaluateLine(line);
    expect(res.points).toBe(6);
    expect(res.type).toBe('full_house');
  });

  it('evaluates Four of a kind as 6 points', () => {
    const line = [9, 9, 9, 9, 2];
    const res = evaluateLine(line);
    expect(res.points).toBe(6);
    expect(res.type).toBe('four_of_a_kind');
  });

  it('evaluates Five of a kind as 10 points', () => {
    const line = [7, 7, 7, 7, 7];
    const res = evaluateLine(line);
    expect(res.points).toBe(10);
    expect(res.type).toBe('five_of_a_kind');
  });

  it('evaluates Straight with 7 as 9 points', () => {
    const line = [5, 6, 7, 8, 9];
    const res = evaluateLine(line);
    expect(res.points).toBe(9);
    expect(res.type).toBe('straight_with_seven');
  });

  it('evaluates Straight without 7 as 10 points', () => {
    const line = [2, 3, 4, 5, 6];
    const res = evaluateLine(line);
    expect(res.points).toBe(10);
    expect(res.type).toBe('straight_without_seven');
  });

  it('correctly calculates total score with double diagonal bonus', () => {
    const grid = createEmptyGrid();
    // Fill main diagonal with five 7s (10 points -> doubles to 20)
    for (let i = 0; i < 5; i++) {
      grid[i][i] = 7;
    }
    // Fill anti diagonal with five 8s (except center (2,2) which is 7) -> 4 of a kind (6 points -> doubles to 12)
    grid[0][4] = 8;
    grid[1][3] = 8;
    grid[3][1] = 8;
    grid[4][0] = 8;

    // Fill remaining cells with distinct values to have 0 other combos
    grid[0][1] = 2; grid[0][2] = 3; grid[0][3] = 4;
    grid[1][0] = 5; grid[1][2] = 6; grid[1][4] = 9;
    grid[2][0] = 10; grid[2][1] = 11; grid[2][3] = 12; grid[2][4] = 2;
    grid[3][0] = 3; grid[3][2] = 4; grid[3][4] = 5;
    grid[4][1] = 6; grid[4][2] = 9; grid[4][3] = 10;

    const scores = calculateBoardScores(grid);
    expect(scores.mainDiag.points).toBe(10); // 5 of a kind
    expect(scores.antiDiag.points).toBe(6); // 4 of a kind (four 8s + one 7)
    // Diagonals double: 10*2 + 6*2 = 32 points
    expect(scores.totalScore).toBeGreaterThanOrEqual(32);
  });
});
