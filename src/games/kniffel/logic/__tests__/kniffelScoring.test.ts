import { describe, it, expect } from 'vitest';
import {
  calculateUpperScore,
  calculateThreeOfAKind,
  calculateFourOfAKind,
  calculateFullHouse,
  calculateSmallStraight,
  calculateLargeStraight,
  calculateKniffel,
  calculateChance,
  evaluatePossibleScores,
  getUpperSectionSum,
  getUpperSectionBonus,
  getLowerSectionSum,
  getTotalScore,
} from '../kniffelScoring';

describe('kniffelScoring', () => {
  describe('calculateUpperScore', () => {
    it('calculates sum of matching faces', () => {
      expect(calculateUpperScore([1, 1, 3, 1, 5], 1)).toBe(3);
      expect(calculateUpperScore([2, 4, 4, 4, 6], 4)).toBe(12);
      expect(calculateUpperScore([2, 3, 5, 6, 6], 1)).toBe(0);
    });
  });

  describe('calculateThreeOfAKind', () => {
    it('returns sum of all dice when at least 3 match', () => {
      expect(calculateThreeOfAKind([3, 3, 3, 2, 5])).toBe(16);
      expect(calculateThreeOfAKind([6, 6, 6, 6, 1])).toBe(25);
    });

    it('returns 0 when fewer than 3 match', () => {
      expect(calculateThreeOfAKind([3, 3, 2, 2, 5])).toBe(0);
    });
  });

  describe('calculateFourOfAKind', () => {
    it('returns sum of all dice when at least 4 match', () => {
      expect(calculateFourOfAKind([4, 4, 4, 4, 2])).toBe(18);
      expect(calculateFourOfAKind([5, 5, 5, 5, 5])).toBe(25);
    });

    it('returns 0 when fewer than 4 match', () => {
      expect(calculateFourOfAKind([4, 4, 4, 2, 2])).toBe(0);
    });
  });

  describe('calculateFullHouse', () => {
    it('returns 25 for a valid full house (3 of one, 2 of another)', () => {
      expect(calculateFullHouse([2, 2, 2, 5, 5])).toBe(25);
    });

    it('returns 25 for 5 of a kind (counts as full house)', () => {
      expect(calculateFullHouse([6, 6, 6, 6, 6])).toBe(25);
    });

    it('returns 0 for invalid full house combinations', () => {
      expect(calculateFullHouse([1, 2, 3, 4, 5])).toBe(0);
      expect(calculateFullHouse([2, 2, 2, 2, 3])).toBe(0);
    });
  });

  describe('calculateSmallStraight', () => {
    it('returns 30 for 4 sequential dice', () => {
      expect(calculateSmallStraight([1, 2, 3, 4, 6])).toBe(30);
      expect(calculateSmallStraight([2, 3, 4, 5, 2])).toBe(30);
      expect(calculateSmallStraight([3, 4, 5, 6, 1])).toBe(30);
    });

    it('returns 0 when no 4 sequential dice exist', () => {
      expect(calculateSmallStraight([1, 2, 2, 4, 5])).toBe(0);
    });
  });

  describe('calculateLargeStraight', () => {
    it('returns 40 for 5 sequential dice', () => {
      expect(calculateLargeStraight([1, 2, 3, 4, 5])).toBe(40);
      expect(calculateLargeStraight([2, 3, 4, 5, 6])).toBe(40);
    });

    it('returns 0 when no 5 sequential dice exist', () => {
      expect(calculateLargeStraight([1, 2, 3, 4, 6])).toBe(0);
    });
  });

  describe('calculateKniffel', () => {
    it('returns 50 when all 5 dice are identical', () => {
      expect(calculateKniffel([5, 5, 5, 5, 5])).toBe(50);
    });

    it('returns 0 when dice differ', () => {
      expect(calculateKniffel([5, 5, 5, 5, 4])).toBe(0);
    });
  });

  describe('calculateChance', () => {
    it('returns total sum of all dice', () => {
      expect(calculateChance([1, 2, 3, 4, 5])).toBe(15);
      expect(calculateChance([6, 6, 6, 6, 6])).toBe(30);
    });
  });

  describe('evaluatePossibleScores', () => {
    it('evaluates all categories for a given roll', () => {
      const scores = evaluatePossibleScores([5, 5, 5, 5, 5]);
      expect(scores.fives).toBe(25);
      expect(scores.kniffel).toBe(50);
      expect(scores.kniffel_bonus).toBe(50);
      expect(scores.full_house).toBe(25);
      expect(scores.chance).toBe(25);
    });
  });

  describe('totals and bonuses', () => {
    it('calculates upper section sum and bonus correctly', () => {
      const scores = {
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18,
      };
      expect(getUpperSectionSum(scores)).toBe(63);
      expect(getUpperSectionBonus(scores)).toBe(35);

      const belowScores = { ...scores, ones: 2 };
      expect(getUpperSectionSum(belowScores)).toBe(62);
      expect(getUpperSectionBonus(belowScores)).toBe(0);
    });

    it('calculates lower section sum including kniffel bonus', () => {
      const scores = {
        three_of_a_kind: 15,
        four_of_a_kind: 20,
        full_house: 25,
        small_straight: 30,
        large_straight: 40,
        kniffel: 50,
        chance: 20,
        kniffel_bonus: 2, // 2 * 50 = 100
      };
      expect(getLowerSectionSum(scores)).toBe(15 + 20 + 25 + 30 + 40 + 50 + 20 + 100);
    });

    it('calculates grand total score', () => {
      const scores = {
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18, // upper sum = 63, bonus = 35
        chance: 25,
      };
      expect(getTotalScore(scores)).toBe(63 + 35 + 25);
    });
  });
});
