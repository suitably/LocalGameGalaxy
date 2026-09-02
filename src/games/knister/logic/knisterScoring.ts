import type { BoardScores, KnisterGrid, LineEvaluation } from './types';

/**
 * Creates an empty 5x5 Knister grid.
 */
export const createEmptyGrid = (): KnisterGrid => [
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
  [null, null, null, null, null],
];

/**
 * Evaluates 5 numbers in a line according to official Knister rules.
 */
export const evaluateLine = (numbers: (number | null)[]): LineEvaluation => {
  const isComplete = numbers.every((n) => n !== null);
  if (!isComplete) {
    return {
      type: 'none',
      points: 0,
      labelKey: 'games.knister.combos.incomplete',
      isComplete: false,
    };
  }

  const validNumbers = numbers as number[];
  const freq: Record<number, number> = {};
  for (const n of validNumbers) {
    freq[n] = (freq[n] || 0) + 1;
  }

  const counts = Object.values(freq).sort((a, b) => b - a);

  // 1. 5 of a kind (10 points)
  if (counts[0] === 5) {
    return {
      type: 'five_of_a_kind',
      points: 10,
      labelKey: 'games.knister.combos.five_of_a_kind',
      isComplete: true,
    };
  }

  // 2. 4 of a kind (6 points)
  if (counts[0] === 4) {
    return {
      type: 'four_of_a_kind',
      points: 6,
      labelKey: 'games.knister.combos.four_of_a_kind',
      isComplete: true,
    };
  }

  // 3. Full House (3 + 2) (6 points)
  if (counts[0] === 3 && counts[1] === 2) {
    return {
      type: 'full_house',
      points: 6,
      labelKey: 'games.knister.combos.full_house',
      isComplete: true,
    };
  }

  // 4. Straight (5 consecutive sorted numbers)
  const sorted = [...validNumbers].sort((a, b) => a - b);
  let isStraight = true;
  for (let i = 0; i < 4; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) {
      isStraight = false;
      break;
    }
  }

  if (isStraight) {
    const hasSeven = validNumbers.includes(7);
    if (hasSeven) {
      return {
        type: 'straight_with_seven',
        points: 9,
        labelKey: 'games.knister.combos.straight_with_seven',
        isComplete: true,
      };
    } else {
      return {
        type: 'straight_without_seven',
        points: 10,
        labelKey: 'games.knister.combos.straight_without_seven',
        isComplete: true,
      };
    }
  }

  // 5. 3 of a kind (3 points)
  if (counts[0] === 3) {
    return {
      type: 'triple',
      points: 3,
      labelKey: 'games.knister.combos.triple',
      isComplete: true,
    };
  }

  // 6. 2 pairs (3 points)
  if (counts[0] === 2 && counts[1] === 2) {
    return {
      type: 'two_pairs',
      points: 3,
      labelKey: 'games.knister.combos.two_pairs',
      isComplete: true,
    };
  }

  // 7. 1 pair (1 point)
  if (counts[0] === 2) {
    return {
      type: 'pair',
      points: 1,
      labelKey: 'games.knister.combos.pair',
      isComplete: true,
    };
  }

  return {
    type: 'none',
    points: 0,
    labelKey: 'games.knister.combos.none',
    isComplete: true,
  };
};

/**
 * Computes all row, column, and diagonal scores for a 5x5 Knister grid.
 */
export const calculateBoardScores = (grid: KnisterGrid): BoardScores => {
  const rows: LineEvaluation[] = [];
  const cols: LineEvaluation[] = [];

  // Rows
  for (let r = 0; r < 5; r++) {
    rows.push(evaluateLine(grid[r]));
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    const colNumbers = [grid[0][c], grid[1][c], grid[2][c], grid[3][c], grid[4][c]];
    cols.push(evaluateLine(colNumbers));
  }

  // Main Diagonal (0,0 to 4,4)
  const mainDiagNumbers = [grid[0][0], grid[1][1], grid[2][2], grid[3][3], grid[4][4]];
  const mainDiag = evaluateLine(mainDiagNumbers);

  // Anti Diagonal (0,4 to 4,0)
  const antiDiagNumbers = [grid[0][4], grid[1][3], grid[2][2], grid[3][1], grid[4][0]];
  const antiDiag = evaluateLine(antiDiagNumbers);

  // Diagonal points count DOUBLE in Knister!
  const rowsTotal = rows.reduce((acc, curr) => acc + curr.points, 0);
  const colsTotal = cols.reduce((acc, curr) => acc + curr.points, 0);
  const diagTotal = (mainDiag.points * 2) + (antiDiag.points * 2);

  return {
    rows,
    cols,
    mainDiag,
    antiDiag,
    totalScore: rowsTotal + colsTotal + diagTotal,
  };
};
