import { describe, it, expect } from 'vitest';
import {
  calculateStartingScore,
  calculatePlayerScore,
  evaluateThrow,
  parseDartsState,
  type DartThrow,
  type Turn,
  type GameSettings,
} from './useDartsGame';

describe('Darts Game Logic', () => {
  describe('calculateStartingScore', () => {
    it('returns 301 for 301 mode', () => {
      expect(calculateStartingScore('301')).toBe(301);
    });

    it('returns 501 for 501 mode', () => {
      expect(calculateStartingScore('501')).toBe(501);
    });

    it('returns 0 for count_up mode', () => {
      expect(calculateStartingScore('count_up')).toBe(0);
    });
  });

  describe('calculatePlayerScore', () => {
    const turn1: Turn = {
      playerId: 'p1',
      throws: [
        { value: 20, multiplier: 3, score: 60 },
        { value: 20, multiplier: 3, score: 60 },
        { value: 20, multiplier: 3, score: 60 },
      ],
      scoreBefore: 501,
      scoreAfter: 321,
      busted: false,
    };

    const turn2Busted: Turn = {
      playerId: 'p1',
      throws: [
        { value: 20, multiplier: 3, score: 60 },
        { value: 20, multiplier: 3, score: 60 },
        { value: 20, multiplier: 3, score: 60 },
      ],
      scoreBefore: 121,
      scoreAfter: 121,
      busted: true,
    };

    it('calculates score correctly in 501 mode omitting busted turns', () => {
      const turns = [turn1, turn2Busted];
      const currentTurnThrows: DartThrow[] = [{ value: 20, multiplier: 1, score: 20 }];

      // For p1 (321 - 20 = 301)
      const scoreP1 = calculatePlayerScore('501', turns, currentTurnThrows, 'p1', 'p1');
      expect(scoreP1).toBe(301);

      // For p2 (has no turns -> 501)
      const scoreP2 = calculatePlayerScore('501', turns, currentTurnThrows, 'p1', 'p2');
      expect(scoreP2).toBe(501);
    });

    it('calculates score correctly in count_up mode', () => {
      const turns: Turn[] = [
        {
          playerId: 'p1',
          throws: [
            { value: 20, multiplier: 3, score: 60 },
            { value: 19, multiplier: 1, score: 19 },
          ],
          scoreBefore: 0,
          scoreAfter: 79,
          busted: false,
        },
      ];
      const currentTurnThrows: DartThrow[] = [{ value: 25, multiplier: 1, score: 25 }];

      const score = calculatePlayerScore('count_up', turns, currentTurnThrows, 'p1', 'p1');
      expect(score).toBe(104);
    });
  });

  describe('evaluateThrow', () => {
    const doubleOutSettings: GameSettings = { mode: '501', doubleOut: true };
    const singleOutSettings: GameSettings = { mode: '301', doubleOut: false };

    it('evaluates normal countdown throw', () => {
      const currentThrow: DartThrow = { value: 20, multiplier: 3, score: 60 };
      const res = evaluateThrow(501, currentThrow, doubleOutSettings);

      expect(res.newScore).toBe(441);
      expect(res.isBusted).toBe(false);
      expect(res.isWinner).toBe(false);
    });

    it('detects bust when new score drops below 0', () => {
      const currentThrow: DartThrow = { value: 20, multiplier: 3, score: 60 };
      const res = evaluateThrow(40, currentThrow, doubleOutSettings);

      expect(res.newScore).toBe(-20);
      expect(res.isBusted).toBe(true);
      expect(res.isWinner).toBe(false);
    });

    it('detects bust when new score is 1 with doubleOut enabled', () => {
      const currentThrow: DartThrow = { value: 19, multiplier: 2, score: 38 };
      const res = evaluateThrow(39, currentThrow, doubleOutSettings);

      expect(res.newScore).toBe(1);
      expect(res.isBusted).toBe(true);
      expect(res.isWinner).toBe(false);
    });

    it('detects bust when new score is 0 but multiplier is not double (nor Bullseye 50)', () => {
      const single20: DartThrow = { value: 20, multiplier: 1, score: 20 };
      const res = evaluateThrow(20, single20, doubleOutSettings);

      expect(res.newScore).toBe(0);
      expect(res.isBusted).toBe(true);
      expect(res.isWinner).toBe(false);
    });

    it('detects win when new score is 0 with a double on doubleOut', () => {
      const double20: DartThrow = { value: 20, multiplier: 2, score: 40 };
      const res = evaluateThrow(40, double20, doubleOutSettings);

      expect(res.newScore).toBe(0);
      expect(res.isBusted).toBe(false);
      expect(res.isWinner).toBe(true);
    });

    it('detects win when landing on Bullseye (value 50) on doubleOut', () => {
      const bullseye: DartThrow = { value: 50, multiplier: 1, score: 50 };
      const res = evaluateThrow(50, bullseye, doubleOutSettings);

      expect(res.newScore).toBe(0);
      expect(res.isBusted).toBe(false);
      expect(res.isWinner).toBe(true);
    });

    it('allows single out win when doubleOut is false', () => {
      const single20: DartThrow = { value: 20, multiplier: 1, score: 20 };
      const res = evaluateThrow(20, single20, singleOutSettings);

      expect(res.newScore).toBe(0);
      expect(res.isBusted).toBe(false);
      expect(res.isWinner).toBe(true);
    });
  });

  describe('parseDartsState', () => {
    it('returns null for null, undefined, or non-object input', () => {
      expect(parseDartsState(null)).toBeNull();
      expect(parseDartsState('invalid json')).toBeNull();
      expect(parseDartsState(12345)).toBeNull();
    });

    it('returns null if settings or players are missing or empty', () => {
      expect(parseDartsState({})).toBeNull();
      expect(parseDartsState({ settings: { mode: '501', doubleOut: true }, players: [] })).toBeNull();
    });

    it('parses valid persisted state cleanly with default fallbacks for missing arrays', () => {
      const valid = {
        settings: { mode: '301', doubleOut: false },
        players: [{ id: 'p1', name: 'Player 1' }],
        currentPlayerIndex: 0,
      };

      const result = parseDartsState(valid);
      expect(result).not.toBeNull();
      expect(result?.settings.mode).toBe('301');
      expect(result?.settings.doubleOut).toBe(false);
      expect(result?.turns).toEqual([]);
      expect(result?.currentTurnThrows).toEqual([]);
      expect(result?.winner).toBeNull();
    });
  });
});
