import { describe, expect, it } from 'vitest';
import { buildCompletedRoundInfo } from './completedRound';
import type { GuessArtGameRecord, GuessArtRound } from './types';

const game = {
  players: [
    { id: 'a', name: 'Anna' },
    { id: 'b', name: 'Ben' },
  ],
} as unknown as GuessArtGameRecord;

const round = {
  roundNumber: 3,
  drawnById: 'a',
  word: 'Haus',
  wordLanguageCode: 'de',
  translations: { de: { canonical: 'Haus' } },
  guesses: ['Hut'],
} as unknown as GuessArtRound;

describe('buildCompletedRoundInfo', () => {
  it('collects round data and names', () => {
    expect(buildCompletedRoundInfo(game, round, 'Haus')).toEqual({
      word: 'Haus',
      originalWord: 'Haus',
      originalLang: 'de',
      guessesCount: 2,
      roundNumber: 3,
      guesses: ['Hut', 'Haus'],
      drawerName: 'Anna',
      guesserName: 'Ben',
    });
  });

  it('prefers the explicit guesser name', () => {
    const r = { ...round, guesserName: 'Zoe' } as GuessArtRound;
    expect(buildCompletedRoundInfo(game, r, 'x').guesserName).toBe('Zoe');
  });

  it('falls back to defaults without a round', () => {
    expect(buildCompletedRoundInfo(null, null, 'x')).toMatchObject({
      word: 'x',
      guessesCount: 1,
      roundNumber: 1,
      guesses: ['x'],
      drawerName: undefined,
      guesserName: undefined,
    });
  });
});
