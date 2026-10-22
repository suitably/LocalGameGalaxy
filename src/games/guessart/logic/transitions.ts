/**
 * Pure GuessArt state transitions [ID: LOGIC-GUESSART-TRANSITIONS]
 *
 * The engine loads records, calls these, and persists the result. No IndexedDB access here.
 */
import { evaluateGuess } from './guessEvaluator';
import {
  buildWordMask,
  normalizeLanguageCode,
  resolveHintArtifacts,
  shortLanguageCode,
} from './hintResolver';
import type {
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  SelectWordPayload,
  WordTranslationEntry,
} from './types';

export const EMPTY_CANVAS_SCENE = JSON.stringify({ elements: [], appState: {}, files: {} });

/**
 * Applies a guess to the active round. Throws outside the guessing phase.
 * From hint level 2 on only an exact match counts.
 */
export function applyGuess(
  game: Pick<GuessArtGameRecord, 'status'>,
  round: GuessArtRound,
  guess: string,
  now: Date,
): { correct: boolean; round: GuessArtRound } {
  if (game.status !== 'guessing') {
    throw new Error('Guess submission only allowed during guessing phase');
  }
  const correct = evaluateGuess(round.translations || {}, round.word, guess, {
    exactOnly: (round.hintLevel || 0) >= 2,
  });
  return {
    correct,
    round: {
      ...round,
      guesses: Array.isArray(round.guesses) ? [...round.guesses, guess] : [guess],
      guess: correct ? guess : round.guess,
      status: correct ? 'completed' : round.status,
      completedAt: correct ? now.toISOString() : round.completedAt,
    },
  };
}

/** Game after a correct guess: next round number, back to word selection, one more completed round. */
export function advanceAfterCorrectGuess(current: GuessArtGameRecord): GuessArtGameRecord {
  return {
    ...current,
    status: 'selecting',
    roundNumber: current.roundNumber + 1,
    currentPlayerIndex: current.currentPlayerIndex,
    statistics: {
      roundsCompleted: (current.statistics?.roundsCompleted || 0) + 1,
    },
  };
}

/** Fresh round for `game.roundNumber`, drawn by the current player, waiting for a word. */
export function createEmptyRound(
  game: GuessArtGameRecord,
  temporaryClaim: boolean,
): Partial<GuessArtRound> {
  return {
    roundNumber: game.roundNumber,
    drawnById: game.players[game.currentPlayerIndex]?.id,
    status: 'selecting',
    temporaryClaim,
    word: '',
    wordId: null,
    wordLanguageCode: game.options.language,
    wordDifficulty: 3,
    translations: {},
    guesses: [],
    hintLevel: 0,
    hintRequested: false,
    hintLetters: [],
    wordMask: [],
    wordLength: 0,
    canvasData: EMPTY_CANVAS_SCENE,
  };
}

type LexiconWord = {
  id?: string | number;
  word: string;
  translations?: Record<
    string,
    { canonical: string; synonyms?: string[]; forms?: string[]; gendered?: string[] }
  >;
};

const languageKey = (code: string) => shortLanguageCode(code) || normalizeLanguageCode(code);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter(Boolean) : []);

function normalizeEntry(entry: Partial<WordTranslationEntry>): WordTranslationEntry {
  return {
    canonical: (entry.canonical || '').trim(),
    synonyms: list(entry.synonyms),
    forms: list(entry.forms),
    gendered: list(entry.gendered),
  };
}

/**
 * Translations for a chosen word: the payload's own, then the chosen word in the round language,
 * then any missing languages from the matching lexicon entry.
 */
export function buildRoundTranslations(
  payload: SelectWordPayload,
  language: string,
  lexicon: readonly LexiconWord[],
): Record<string, WordTranslationEntry> {
  const translations: Record<string, WordTranslationEntry> = {};
  for (const [code, entry] of Object.entries(payload.translations || {})) {
    const key = entry && typeof entry === 'object' ? languageKey(code) : '';
    if (key) translations[key] = normalizeEntry(entry);
  }

  const word = payload.word.trim();
  if (!translations[language] && payload.word) {
    translations[language || 'und'] = { canonical: word, synonyms: [], forms: [], gendered: [] };
  }

  const wordId = payload.wordId ? String(payload.wordId) : null;
  const lower = word.toLowerCase();
  const match = lexicon.find(
    (w) =>
      (wordId && String(w.id) === wordId) ||
      w.word.toLowerCase() === lower ||
      Object.values(w.translations || {}).some((t) => t.canonical.toLowerCase() === lower),
  );
  for (const [code, entry] of Object.entries(match?.translations || {})) {
    const key = languageKey(code);
    if (key && !translations[key] && entry?.canonical) translations[key] = normalizeEntry(entry);
  }
  return translations;
}

/** The round once the drawer picked a word. Throws outside the selecting phase. */
export function applyWordSelection(
  game: Pick<GuessArtGameRecord, 'status' | 'options'>,
  round: GuessArtRound,
  payload: SelectWordPayload,
  language: string,
  lexicon: readonly LexiconWord[],
): GuessArtRound {
  if (game.status !== 'selecting') {
    throw new Error('Word selection only allowed during selecting phase');
  }
  const word = payload.word.trim();
  const mask = buildWordMask(payload.word);
  return {
    ...round,
    status: 'drawing',
    word,
    wordId: payload.wordId || null,
    wordCategoryId: payload.categoryId || null,
    wordLanguageCode: language || game.options.language,
    wordDifficulty: payload.difficulty || 3,
    translations: buildRoundTranslations(payload, language, lexicon),
    hintLevel: 0,
    hintRequested: false,
    hintLetters: [],
    wordMask: mask,
    wordLength: payload.word ? mask.length : 0,
  };
}

/**
 * Next hint for the guessing phase: level 1 shows the word structure, level 2 also letters
 * (and from then on only exact guesses count). `exhausted` once level 2 was already given.
 */
export function applyHint(
  game: Pick<GuessArtGameRecord, 'status' | 'options'>,
  round: GuessArtRound,
  language?: string,
): { exhausted: true } | { exhausted: false; round: GuessArtRound; hint: HintResult } {
  if (game.status !== 'guessing') {
    throw new Error('Hints only available during guessing phase');
  }
  const nextLevel = Math.min((round.hintLevel || 0) + 1, 2);
  if (nextLevel === round.hintLevel && round.hintRequested) return { exhausted: true };

  const artifacts = resolveHintArtifacts(
    round.translations || {},
    language || game.options.language,
    round.wordLanguageCode,
    round.word,
  );
  if (!artifacts) throw new Error('No hint data available');

  const letters = nextLevel >= 2 ? artifacts.letters : [];
  return {
    exhausted: false,
    round: {
      ...round,
      hintLevel: nextLevel,
      hintRequested: true,
      wordMask: artifacts.mask,
      wordLength: artifacts.length,
      hintLetters: letters,
    },
    hint: {
      type: nextLevel === 1 ? 'structure' : 'letters',
      structure: artifacts.mask,
      letters,
      level: nextLevel,
      wordLength: artifacts.length,
    },
  };
}
