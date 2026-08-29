import { evaluateGuess } from './guessEvaluator';
import {
  buildWordMask,
  normalizeLanguageCode,
  resolveHintArtifacts,
  shortLanguageCode,
} from './hintResolver';
import {
  appendRound,
  createLocalGame,
  deleteLocalGame,
  fetchRoundsForGame,
  getLocalGame,
  getRoundByNumber,
  listLocalGames,
  updateLocalGame,
  upsertRound,
} from './repository';
import type {
  GameSnapshot,
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  SelectWordPayload,
  WordTranslationEntry,
} from './types';

const DEFAULT_SCENE = JSON.stringify({ elements: [], appState: {}, files: {} });

export const toRoundPayload = (
  round: GuessArtRound | null,
  game: GuessArtGameRecord,
  language?: string,
): GuessArtRound | null => {
  if (!round) {
    return null;
  }
  const normalizedLanguage = normalizeLanguageCode(language || game.options?.language || 'en');
  const translations = round.translations || {};
  const artifacts = resolveHintArtifacts(
    translations,
    normalizedLanguage,
    round.wordLanguageCode,
    round.word,
  );

  const drawer = game.players.find((player) => player.id === round.drawnById);
  const isDrawerCurrentPlayer = game.status !== 'guessing';

  return {
    ...round,
    drawnByName: drawer?.name || '',
    drawerIsCurrentPlayer: isDrawerCurrentPlayer,
    canvasData: round.canvasData || DEFAULT_SCENE,
    hintLetters: artifacts?.letters || round.hintLetters || [],
    wordMask: artifacts?.mask || (round.word ? buildWordMask(round.word) : []),
    wordLength: artifacts?.length || (round.word ? Array.from(round.word).length : 0),
  };
};

const nextPlayerIndex = (game: GuessArtGameRecord): number =>
  (game.currentPlayerIndex + 1) % game.players.length;

export const LocalGameEngine = {
  async createGame(payload: {
    name?: string;
    players: string[];
    language?: string;
    manualWordMode?: boolean;
    ownerId?: string | null;
  }): Promise<GuessArtGameRecord> {
    const record = await createLocalGame(payload);
    return record;
  },

  async updateGameDetails(
    gameId: string,
    payload: {
      name?: string;
      players?: { id: string; name: string }[];
    },
    language?: string,
  ): Promise<GameSnapshot> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }

    const updatedPlayers = Array.isArray(payload.players)
      ? game.players.map((existingPlayer) => {
          const match = payload.players?.find((p) => p.id === existingPlayer.id);
          return {
            ...existingPlayer,
            name: match ? match.name.trim() : existingPlayer.name,
          };
        })
      : game.players;

    const updatedGame = await updateLocalGame(gameId, (current) => ({
      ...current,
      name: payload.name !== undefined ? (payload.name.trim() || undefined) : current.name,
      players: updatedPlayers,
    }));

    const round = await getRoundByNumber(gameId, updatedGame.roundNumber);
    return {
      game: updatedGame,
      round: toRoundPayload(round, updatedGame, language),
    };
  },

  async getGameSnapshot(gameId: string, language?: string): Promise<GameSnapshot> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }
    const round = await getRoundByNumber(gameId, game.roundNumber);
    return {
      game,
      round: toRoundPayload(round, game, language),
    };
  },

  async listGames(): Promise<GuessArtGameRecord[]> {
    return listLocalGames();
  },

  async selectWord(
    gameId: string,
    payload: SelectWordPayload,
    language?: string,
  ): Promise<GameSnapshot> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }
    if (game.status !== 'selecting') {
      throw new Error('Word selection only allowed during selecting phase');
    }
    const round = await getRoundByNumber(gameId, game.roundNumber);
    if (!round) {
      throw new Error('Active round missing');
    }

    const normalizedLanguage = shortLanguageCode(
      payload.languageCode || language || game.options.language,
    );
    const translations: Record<string, WordTranslationEntry> = {};
    const entries = payload.translations || {};

    Object.entries(entries).forEach(([code, entry]) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const key = shortLanguageCode(code) || normalizeLanguageCode(code);
      if (!key) {
        return;
      }
      translations[key] = {
        canonical: (entry.canonical || '').trim(),
        synonyms: Array.isArray(entry.synonyms) ? entry.synonyms.filter(Boolean) : [],
        forms: Array.isArray(entry.forms) ? entry.forms.filter(Boolean) : [],
        gendered: Array.isArray(entry.gendered) ? entry.gendered.filter(Boolean) : [],
      };
    });

    if (!translations[normalizedLanguage] && payload.word) {
      translations[normalizedLanguage || 'und'] = {
        canonical: payload.word.trim(),
        synonyms: [],
        forms: [],
        gendered: [],
      };
    }

    const updatedRound = await upsertRound({
      ...round,
      status: 'drawing',
      word: payload.word.trim(),
      wordId: payload.wordId || null,
      wordCategoryId: payload.categoryId || null,
      wordLanguageCode: normalizedLanguage || game.options.language,
      wordDifficulty: payload.difficulty || 3,
      translations,
      hintLevel: 0,
      hintRequested: false,
      hintLetters: [],
      wordMask: buildWordMask(payload.word),
      wordLength: payload.word ? Array.from(payload.word).length : 0,
    });

    const updatedGame = await updateLocalGame(gameId, {
      status: 'drawing',
    });

    return {
      game: updatedGame,
      round: toRoundPayload(updatedRound, updatedGame, language),
    };
  },

  async submitDrawing(
    gameId: string,
    canvasData: string,
    language?: string,
  ): Promise<GameSnapshot> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }
    if (game.status !== 'drawing') {
      throw new Error('Drawing submission only allowed during drawing phase');
    }
    const round = await getRoundByNumber(gameId, game.roundNumber);
    if (!round) {
      throw new Error('Active round missing');
    }

    const updatedRound = await upsertRound({
      ...round,
      status: 'guessing',
      canvasData,
    });

    const updatedGame = await updateLocalGame(gameId, (current) => ({
      ...current,
      status: 'guessing',
      currentPlayerIndex: nextPlayerIndex(current),
    }));

    return {
      game: updatedGame,
      round: toRoundPayload(updatedRound, updatedGame, language),
    };
  },

  async submitGuess(
    gameId: string,
    guess: string,
    language?: string,
  ): Promise<{ correct: boolean; game: GuessArtGameRecord; round: GuessArtRound | null }> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }
    if (game.status !== 'guessing') {
      throw new Error('Guess submission only allowed during guessing phase');
    }
    const round = await getRoundByNumber(gameId, game.roundNumber);
    if (!round) {
      throw new Error('Active round missing');
    }

    const guesses = Array.isArray(round.guesses) ? [...round.guesses, guess] : [guess];
    const translations = round.translations || {};
    const isCorrect = evaluateGuess(translations, round.word, guess, {
      exactOnly: (round.hintLevel || 0) >= 2,
    });

    let updatedRound = await upsertRound({
      ...round,
      guesses,
      guess: isCorrect ? guess : round.guess,
      status: isCorrect ? 'completed' : round.status,
      completedAt: isCorrect ? new Date().toISOString() : round.completedAt,
    });

    let updatedGame = game;

    if (isCorrect) {
      updatedGame = await updateLocalGame(gameId, (current) => ({
        ...current,
        status: 'selecting',
        roundNumber: current.roundNumber + 1,
        currentPlayerIndex: current.currentPlayerIndex,
        statistics: {
          roundsCompleted: (current.statistics?.roundsCompleted || 0) + 1,
        },
      }));

      await appendRound(gameId, {
        roundNumber: updatedGame.roundNumber,
        drawnById: updatedGame.players[updatedGame.currentPlayerIndex]?.id,
        status: 'selecting',
        word: '',
        wordId: null,
        wordLanguageCode: updatedGame.options.language,
        wordDifficulty: 3,
        translations: {},
        guesses: [],
        hintLevel: 0,
        hintRequested: false,
        hintLetters: [],
        wordMask: [],
        wordLength: 0,
        canvasData: DEFAULT_SCENE,
      });

      const nextRound = await getRoundByNumber(gameId, updatedGame.roundNumber);
      return {
        correct: true,
        game: updatedGame,
        round: toRoundPayload(nextRound, updatedGame, language),
      };
    }

    const fetchedRound = await getRoundByNumber(gameId, updatedGame.roundNumber);
    if (fetchedRound) {
      updatedRound = fetchedRound;
    }
    return {
      correct: false,
      game: updatedGame,
      round: toRoundPayload(updatedRound, updatedGame, language),
    };
  },

  async requestHint(
    gameId: string,
    language?: string,
  ): Promise<{ game: GuessArtGameRecord; round: GuessArtRound | null; hint?: HintResult; exhausted?: boolean }> {
    const game = await getLocalGame(gameId);
    if (!game) {
      throw new Error('Local game not found');
    }
    if (game.status !== 'guessing') {
      throw new Error('Hints only available during guessing phase');
    }

    const round = await getRoundByNumber(gameId, game.roundNumber);
    if (!round) {
      throw new Error('Active round missing');
    }

    const nextLevel = Math.min((round.hintLevel || 0) + 1, 2);
    if (nextLevel === round.hintLevel && round.hintRequested) {
      return { game, round: toRoundPayload(round, game, language), exhausted: true };
    }

    const artifacts = resolveHintArtifacts(
      round.translations || {},
      language || game.options.language,
      round.wordLanguageCode,
      round.word,
    );

    if (!artifacts) {
      throw new Error('No hint data available');
    }

    const updatedRound = await upsertRound({
      ...round,
      hintLevel: nextLevel,
      hintRequested: true,
      wordMask: artifacts.mask,
      wordLength: artifacts.length,
      hintLetters: nextLevel >= 2 ? artifacts.letters : [],
    });

    return {
      game,
      round: toRoundPayload(updatedRound, game, language),
      hint: {
        type: nextLevel === 1 ? 'structure' : 'letters',
        structure: artifacts.mask,
        letters: nextLevel >= 2 ? artifacts.letters : [],
        level: nextLevel,
        wordLength: artifacts.length,
      },
    };
  },

  async deleteGame(gameId: string): Promise<boolean> {
    await deleteLocalGame(gameId);
    return true;
  },

  async listRounds(gameId: string): Promise<GuessArtRound[]> {
    return fetchRoundsForGame(gameId);
  },
};
