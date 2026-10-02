import type { KniffelCategory } from './types';

// Returns the count of each die face (1-6)
const getCounts = (dice: number[]) => {
  const counts = Array(7).fill(0);
  dice.forEach(d => counts[d]++);
  return counts;
};

// Sum of all dice
const getSum = (dice: number[]) => dice.reduce((a, b) => a + b, 0);

export const calculateUpperScore = (dice: number[], targetFace: number): number => {
  return dice.filter(d => d === targetFace).length * targetFace;
};

export const calculateThreeOfAKind = (dice: number[]): number => {
  const counts = getCounts(dice);
  if (counts.some(c => c >= 3)) {
    return getSum(dice);
  }
  return 0;
};

export const calculateFourOfAKind = (dice: number[]): number => {
  const counts = getCounts(dice);
  if (counts.some(c => c >= 4)) {
    return getSum(dice);
  }
  return 0;
};

export const calculateFullHouse = (dice: number[]): number => {
  const counts = getCounts(dice);
  const hasThree = counts.some(c => c === 3);
  const hasTwo = counts.some(c => c === 2);
  const hasFive = counts.some(c => c === 5); // 5 of a kind also counts as full house optionally, or 3+2

  if ((hasThree && hasTwo) || hasFive) {
    return 25;
  }
  return 0;
};

export const calculateSmallStraight = (dice: number[]): number => {
  const uniqueFaces = Array.from(new Set(dice)).sort((a, b) => a - b);
  const str = uniqueFaces.join('');
  if (str.includes('1234') || str.includes('2345') || str.includes('3456')) {
    return 30;
  }
  return 0;
};

export const calculateLargeStraight = (dice: number[]): number => {
  const uniqueFaces = Array.from(new Set(dice)).sort((a, b) => a - b);
  const str = uniqueFaces.join('');
  if (str.includes('12345') || str.includes('23456')) {
    return 40;
  }
  return 0;
};

export const calculateKniffel = (dice: number[]): number => {
  const counts = getCounts(dice);
  if (counts.some(c => c === 5)) {
    return 50;
  }
  return 0;
};

export const calculateChance = (dice: number[]): number => {
  return getSum(dice);
};

export const evaluatePossibleScores = (dice: number[]): Record<KniffelCategory, number> => {
  return {
    ones: calculateUpperScore(dice, 1),
    twos: calculateUpperScore(dice, 2),
    threes: calculateUpperScore(dice, 3),
    fours: calculateUpperScore(dice, 4),
    fives: calculateUpperScore(dice, 5),
    sixes: calculateUpperScore(dice, 6),
    three_of_a_kind: calculateThreeOfAKind(dice),
    four_of_a_kind: calculateFourOfAKind(dice),
    full_house: calculateFullHouse(dice),
    small_straight: calculateSmallStraight(dice),
    large_straight: calculateLargeStraight(dice),
    kniffel: calculateKniffel(dice),
    chance: calculateChance(dice),
    kniffel_bonus: calculateKniffel(dice) > 0 ? 50 : 0
  };
};

export const getUpperSectionSum = (scores: Record<string, number | null>): number => {
  const upperKeys = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  return upperKeys.reduce((sum, key) => sum + (scores[key] || 0), 0);
};

export const getUpperSectionBonus = (scores: Record<string, number | null>): number => {
  return getUpperSectionSum(scores) >= 63 ? 35 : 0;
};

export const getLowerSectionSum = (scores: Record<string, number | null>): number => {
  const lowerKeys = [
    'three_of_a_kind', 'four_of_a_kind', 'full_house', 'small_straight',
    'large_straight', 'kniffel', 'chance'
  ];
  const sum = lowerKeys.reduce((sum, key) => sum + (scores[key] || 0), 0);
  const bonusScore = (scores['kniffel_bonus'] || 0) * 50;
  return sum + bonusScore;
};

export const getTotalScore = (scores: Record<string, number | null>): number => {
  return getUpperSectionSum(scores) + getUpperSectionBonus(scores) + getLowerSectionSum(scores);
};
