import { describe, expect, it } from 'vitest';
import { createEmptyScores } from '../kniffelReducer';
import {
  evaluatePossibleScores,
  getLowerSectionSum,
  getTotalScore,
  kniffelBonusPoints,
} from '../kniffelScoring';
import { INITIAL_KNIFFEL_ROOM, kniffelRoomAllows, kniffelRoomReducer } from '../kniffelRoom';

const FIVE = [4, 4, 4, 4, 4];

describe('Kniffel international rules', () => {
  it('keeps the house rules by default', () => {
    const s = evaluatePossibleScores(FIVE);
    expect(s.small_straight).toBe(0);
    expect(s.kniffel_bonus).toBe(50);
    expect(kniffelBonusPoints()).toBe(50);
  });

  it('a five of a kind is a joker once the Kniffel box is filled', () => {
    const filled = evaluatePossibleScores(FIVE, 'international', { kniffel: 50 });
    expect(filled).toMatchObject({ full_house: 25, small_straight: 30, large_straight: 40 });
    expect(filled.kniffel_bonus).toBe(100);
    const open = evaluatePossibleScores(FIVE, 'international', { kniffel: null });
    expect(open).toMatchObject({ small_straight: 0, large_straight: 0, kniffel: 50 });
  });

  it('no bonus after the Kniffel box was crossed out', () => {
    const crossed = evaluatePossibleScores(FIVE, 'international', { kniffel: 0 });
    expect(crossed.kniffel_bonus).toBe(0);
    expect(crossed.large_straight).toBe(40);
  });

  it('counts each bonus with 100 points', () => {
    const scores = { ...createEmptyScores(), kniffel: 50, kniffel_bonus: 2 } as unknown as Record<
      string,
      number | null
    >;
    expect(getLowerSectionSum(scores, 'international')).toBe(250);
    expect(getTotalScore(scores)).toBe(150);
  });

  it('the room keeps the rules from the start through a new game', () => {
    const started = kniffelRoomReducer(INITIAL_KNIFFEL_ROOM, {
      type: 'START',
      hostId: 'h',
      players: [{ id: 'h', name: 'H' }],
      rules: 'international',
    });
    expect(started.rules).toBe('international');
    expect(kniffelRoomReducer(started, { type: 'NEW_GAME' }).rules).toBe('international');
  });

  it('the host switches rules only before the first score', () => {
    const started = kniffelRoomReducer(INITIAL_KNIFFEL_ROOM, {
      type: 'START',
      hostId: 'h',
      players: [{ id: 'h', name: 'H' }],
    });
    const intl = kniffelRoomReducer(started, { type: 'RULES', rules: 'international' });
    expect(intl.rules).toBe('international');
    const rolled = kniffelRoomReducer(intl, { type: 'ROLL', dice: FIVE });
    const scored = kniffelRoomReducer(rolled, { type: 'SCORE', category: 'fours', score: 20 });
    expect(kniffelRoomReducer(scored, { type: 'RULES', rules: 'kniffel' })).toBe(scored);
    expect(kniffelRoomAllows(started, { type: 'RULES', rules: 'kniffel' }, 'x')).toBe(false);
  });
});
