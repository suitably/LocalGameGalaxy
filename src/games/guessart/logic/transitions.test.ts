import { describe, it, expect } from 'vitest';
import {
  advanceAfterCorrectGuess,
  applyGuess,
  applyHint,
  applyWordSelection,
  buildRoundTranslations,
  createEmptyRound,
  EMPTY_CANVAS_SCENE,
} from './transitions';
import type { GuessArtGameRecord, GuessArtRound } from './types';

const NOW = new Date('2026-10-21T12:00:00.000Z');

const round = (fields: Partial<GuessArtRound> = {}): GuessArtRound =>
  ({
    id: 'r1',
    gameId: 'g1',
    roundNumber: 1,
    drawnById: 'p1',
    status: 'guessing',
    word: 'Elefant',
    wordLanguageCode: 'de',
    wordDifficulty: 3,
    translations: {},
    guesses: [],
    hintLevel: 0,
    hintRequested: false,
    hintLetters: [],
    wordMask: [],
    wordLength: 7,
    canvasData: null,
    createdAt: '',
    updatedAt: '',
    completedAt: null,
    ...fields,
  }) as GuessArtRound;

const game = (fields: Partial<GuessArtGameRecord> = {}): GuessArtGameRecord =>
  ({
    id: 'g1',
    type: 'local',
    status: 'guessing',
    roundNumber: 1,
    createdAt: '',
    updatedAt: '',
    players: [
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ],
    currentPlayerIndex: 1,
    options: { language: 'de' },
    ...fields,
  }) as GuessArtGameRecord;

describe('guessart transitions (#416)', () => {
  it('a correct guess completes the round', () => {
    const { correct, round: next } = applyGuess(
      game(),
      round({ guesses: ['Hund'] }),
      'Elefant',
      NOW,
    );
    expect(correct).toBe(true);
    expect(next).toMatchObject({
      status: 'completed',
      guess: 'Elefant',
      guesses: ['Hund', 'Elefant'],
      completedAt: NOW.toISOString(),
    });
  });

  it('a wrong guess is recorded and leaves the round open', () => {
    const before = round();
    const { correct, round: next } = applyGuess(game(), before, 'Giraffe', NOW);
    expect(correct).toBe(false);
    expect(next).toMatchObject({ status: 'guessing', guesses: ['Giraffe'], completedAt: null });
    expect(next.guess).toBeUndefined();
    expect(before.guesses).toEqual([]);
  });

  it('throws outside the guessing phase', () => {
    expect(() => applyGuess(game({ status: 'drawing' }), round(), 'Elefant', NOW)).toThrow(
      'Guess submission only allowed during guessing phase',
    );
  });

  it('from hint level 2 only an exact match counts', () => {
    expect(applyGuess(game(), round({ hintLevel: 1 }), 'Elefamt', NOW).correct).toBe(true);
    expect(applyGuess(game(), round({ hintLevel: 2 }), 'Elefamt', NOW).correct).toBe(false);
    expect(applyGuess(game(), round({ hintLevel: 2 }), 'elefant', NOW).correct).toBe(true);
  });

  it('after a correct guess the game moves to the next round in word selection', () => {
    const next = advanceAfterCorrectGuess(
      game({ roundNumber: 3, statistics: { roundsCompleted: 2 } }),
    );
    expect(next).toMatchObject({
      status: 'selecting',
      roundNumber: 4,
      currentPlayerIndex: 1,
      statistics: { roundsCompleted: 3 },
    });
    expect(advanceAfterCorrectGuess(game()).statistics).toEqual({ roundsCompleted: 1 });
  });

  it('the new round is empty and drawn by the current player', () => {
    expect(createEmptyRound(game({ roundNumber: 4 }), true)).toMatchObject({
      roundNumber: 4,
      drawnById: 'p2',
      status: 'selecting',
      temporaryClaim: true,
      word: '',
      wordLanguageCode: 'de',
      guesses: [],
      hintLevel: 0,
      canvasData: EMPTY_CANVAS_SCENE,
    });
  });
});

describe('word selection and hints (#416)', () => {
  const lexicon = [
    {
      id: 7,
      word: 'Elefant',
      translations: { en: { canonical: 'elephant', synonyms: ['', 'jumbo'] } },
    },
  ];

  it('builds translations from the payload, the word itself and the lexicon', () => {
    const t = buildRoundTranslations({ word: ' Elefant ', wordId: '7' } as never, 'de', lexicon);
    expect(t.de.canonical).toBe('Elefant');
    expect(t.en).toEqual({ canonical: 'elephant', synonyms: ['jumbo'], forms: [], gendered: [] });
  });

  it('payload translations win over the lexicon and invalid entries are skipped', () => {
    const t = buildRoundTranslations(
      { word: 'Elefant', translations: { 'en-US': { canonical: ' tusker ' }, xx: null } } as never,
      'de',
      lexicon,
    );
    expect(t.en.canonical).toBe('tusker');
    expect(Object.keys(t).sort()).toEqual(['de', 'en']);
  });

  it('applyWordSelection starts drawing with a fresh mask; wrong phase throws', () => {
    const r = applyWordSelection(
      game({ status: 'selecting' }),
      round({ status: 'selecting' }),
      { word: 'Hund' } as never,
      'de',
      [],
    );
    expect(r).toMatchObject({
      status: 'drawing',
      word: 'Hund',
      hintLevel: 0,
      wordLength: 4,
      wordDifficulty: 3,
    });
    expect(() =>
      applyWordSelection(game(), round(), { word: 'Hund' } as never, 'de', []),
    ).toThrow();
  });

  it('applyHint goes structure → letters → exhausted; wrong phase throws', () => {
    const translations = { de: { canonical: 'Elefant', synonyms: [], forms: [], gendered: [] } };
    const first = applyHint(game(), round({ translations }), 'de');
    expect(first.exhausted).toBe(false);
    if (first.exhausted) return;
    expect(first.hint).toMatchObject({ type: 'structure', level: 1, letters: [] });
    const second = applyHint(game(), first.round, 'de');
    if (second.exhausted) throw new Error('unexpected');
    expect(second.hint.type).toBe('letters');
    expect(second.round.hintLetters.length).toBeGreaterThan(0);
    expect(applyHint(game(), second.round, 'de')).toEqual({ exhausted: true });
    expect(() => applyHint(game({ status: 'drawing' }), round(), 'de')).toThrow();
  });
});
