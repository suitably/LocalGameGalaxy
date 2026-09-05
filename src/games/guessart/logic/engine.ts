import { evaluateGuess } from './guessEvaluator';
import {
  buildWordMask,
  normalizeLanguageCode,
  resolveHintArtifacts,
  resolveWordForLanguage,
  shortLanguageCode,
} from './hintResolver';
import { DEFAULT_WORDS } from './lexicon';
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
  upsertGame,
  createInitialRound,
} from './repository';
import type {
  GameSnapshot,
  PlayerIdentity,
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  SelectWordPayload,
  WordTranslationEntry,
} from './types';
import { playerAssignment } from './playerAssignment';

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
  const shortLang = shortLanguageCode(normalizedLanguage);
  let resolvedTranslations = { ...(round.translations || {}) };

  // If translation for requested language is missing, enrich from DEFAULT_WORDS
  if (round.word && !resolvedTranslations[shortLang] && !resolvedTranslations[normalizedLanguage]) {
    const wordId = round.wordId ? String(round.wordId) : null;
    const match = DEFAULT_WORDS.find(
      (w) =>
        (wordId && String(w.id) === wordId) ||
        w.word.toLowerCase() === round.word.toLowerCase() ||
        Object.values(w.translations || {}).some(
          (t) => t.canonical.toLowerCase() === round.word.toLowerCase(),
        ),
    );
    if (match?.translations) {
      resolvedTranslations = { ...match.translations, ...resolvedTranslations };
    }
  }

  const resolved = resolveWordForLanguage(
    resolvedTranslations,
    normalizedLanguage,
    round.wordLanguageCode,
    round.word,
  );
  const artifacts = resolveHintArtifacts(
    resolvedTranslations,
    normalizedLanguage,
    round.wordLanguageCode,
    round.word,
  );

  const drawerIndex = game.players.findIndex((player) => player.id === round.drawnById);
  const effectiveDrawerIdx = drawerIndex >= 0 ? drawerIndex : (Math.max(1, round.roundNumber) - 1) % (game.players.length || 1);
  const effectiveGuesserIdx = (effectiveDrawerIdx + 1) % (game.players.length || 1);
  const drawer = game.players[effectiveDrawerIdx];
  const guesser = game.players[effectiveGuesserIdx];
  const isDrawerCurrentPlayer = game.status !== 'guessing';

  return {
    ...round,
    word: resolved.word || round.word,
    translations: resolvedTranslations,
    drawnById: round.drawnById || drawer?.id || '',
    drawnByName: drawer?.name || round.drawnByName || '',
    guesserId: round.guesserId || guesser?.id || '',
    guesserName: round.guesserName || guesser?.name || '',
    drawerIsCurrentPlayer: isDrawerCurrentPlayer,
    canvasData: round.canvasData || DEFAULT_SCENE,
    hintLetters: artifacts?.letters || round.hintLetters || [],
    wordMask: artifacts?.mask || (round.word ? buildWordMask(round.word) : []),
    wordLength: artifacts?.length || (round.word ? buildWordMask(round.word).length : 0),
  };
};

const nextPlayerIndex = (game: GuessArtGameRecord): number =>
  (game.currentPlayerIndex + 1) % game.players.length;

export const isSnapshotNewer = (
  snapshot: GameSnapshot,
  existingGame: GuessArtGameRecord,
  existingRound: GuessArtRound | null,
): boolean => {
  if (snapshot.game.roundNumber > existingGame.roundNumber) return true;
  if (snapshot.game.roundNumber < existingGame.roundNumber) return false;

  const statusRank: Record<string, number> = {
    selecting: 0,
    drawing: 1,
    guessing: 2,
    completed: 3,
  };
  const snapRank = statusRank[snapshot.round?.status || snapshot.game.status] ?? 0;
  const existRank = statusRank[existingRound?.status || existingGame.status] ?? 0;

  if (snapRank > existRank) return true;
  if (snapRank < existRank) return false;

  const snapGuesses = snapshot.round?.guesses?.length || 0;
  const existGuesses = existingRound?.guesses?.length || 0;
  if (snapGuesses > existGuesses) return true;
  if (snapGuesses < existGuesses) return false;

  const isCanvasEmpty = (canvas: string | null | undefined): boolean => {
    if (!canvas) return true;
    try {
      const parsed = JSON.parse(canvas);
      return !parsed.elements || parsed.elements.length === 0;
    } catch {
      return canvas === DEFAULT_SCENE;
    }
  };

  const snapHasCanvas = !isCanvasEmpty(snapshot.round?.canvasData);
  const existHasCanvas = !isCanvasEmpty(existingRound?.canvasData);

  if (snapHasCanvas && !existHasCanvas) {
    return true;
  }

  if (
    snapshot.round?.canvasData &&
    existingRound?.canvasData &&
    snapshot.round.canvasData !== existingRound.canvasData
  ) {
    return true;
  }

  if (snapshot.round?.word && !existingRound?.word) {
    return true;
  }

  // Check if player names, game name, or notification channels were edited
  if (snapshot.game.name !== existingGame.name) return true;
  if (
    snapshot.game.players &&
    existingGame.players &&
    JSON.stringify(
      snapshot.game.players.map((p) => ({
        id: p.id,
        name: p.name,
        ntfyTopic: p.ntfyTopic,
        relayUrl: p.relayUrl,
        notificationMethod: p.notificationMethod,
      })),
    ) !==
      JSON.stringify(
        existingGame.players.map((p) => ({
          id: p.id,
          name: p.name,
          ntfyTopic: p.ntfyTopic,
          relayUrl: p.relayUrl,
          notificationMethod: p.notificationMethod,
        })),
      )
  ) {
    return true;
  }

  const snapTime = new Date(snapshot.game.updatedAt || 0).getTime();
  const existTime = new Date(existingGame.updatedAt || 0).getTime();
  return snapTime > existTime;
};

export const LocalGameEngine = {
  async createGame(payload: {
    name?: string;
    players: (string | { name: string; isRemote?: boolean })[];
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
      players?: (Partial<PlayerIdentity> & { id: string })[];
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
          if (!match) return existingPlayer;
          return {
            ...existingPlayer,
            ...match,
            name: match.name !== undefined ? match.name.trim() : existingPlayer.name,
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

  async importSnapshot(
    snapshot: GameSnapshot,
    language?: string,
  ): Promise<{ game: GuessArtGameRecord; round: GuessArtRound | null; updated: boolean }> {
    if (!snapshot || !snapshot.game) {
      throw new Error('Invalid game snapshot');
    }
    const existing = await getLocalGame(snapshot.game.id);
    if (!existing) {
      // Game does not exist locally -> save game & round to IndexedDB
      await upsertGame(snapshot.game);
      if (snapshot.round) {
        await upsertRound(snapshot.round);
      } else {
        const initialRound = createInitialRound(
          snapshot.game.id,
          snapshot.game.players[0]?.id || 'player1',
        );
        await upsertRound(initialRound);
      }
      const loaded = await this.getGameSnapshot(snapshot.game.id, language);
      return { game: loaded.game, round: loaded.round, updated: true };
    }

    const existingRound = await getRoundByNumber(existing.id, existing.roundNumber);
    if (isSnapshotNewer(snapshot, existing, existingRound)) {
      const mergedPlayers = snapshot.game.players.map((incomingP) => {
        const existingP = existing.players.find((p) => p.id === incomingP.id);
        const isExistingLocal = existingP ? playerAssignment.isPlayerLocal(existing.id, existingP.id, false) : false;
        return {
          ...existingP,
          ...incomingP,
          ntfyTopic: isExistingLocal
            ? existingP?.ntfyTopic || incomingP.ntfyTopic
            : incomingP.ntfyTopic || existingP?.ntfyTopic,
          relayUrl: isExistingLocal
            ? existingP?.relayUrl || incomingP.relayUrl
            : incomingP.relayUrl || existingP?.relayUrl,
          notificationMethod: isExistingLocal
            ? existingP?.notificationMethod || incomingP.notificationMethod
            : incomingP.notificationMethod || existingP?.notificationMethod,
        };
      });
      await upsertGame({ ...snapshot.game, players: mergedPlayers });
      if (snapshot.round) {
        await upsertRound(snapshot.round);
      }
      const loaded = await this.getGameSnapshot(snapshot.game.id, language);
      return { game: loaded.game, round: loaded.round, updated: true };
    }

    // Even if game round/status is not newer, merge player channel updates (e.g. Remote just joined and announced ntfyTopic)
    const hasPlayerChannelUpdates = snapshot.game.players?.some((incomingP) => {
      const existingP = existing.players?.find((p) => p.id === incomingP.id);
      if (!existingP) return false;
      const isExistingLocal = playerAssignment.isPlayerLocal(existing.id, existingP.id, false);
      if (isExistingLocal) return false; // Never overwrite local player channels via snapshot
      return (
        (incomingP.ntfyTopic && incomingP.ntfyTopic !== existingP.ntfyTopic) ||
        (incomingP.relayUrl && incomingP.relayUrl !== existingP.relayUrl) ||
        (incomingP.notificationMethod && incomingP.notificationMethod !== existingP.notificationMethod)
      );
    });

    if (hasPlayerChannelUpdates) {
      const mergedPlayers = existing.players.map((existingP) => {
        const incomingP = snapshot.game.players?.find((p) => p.id === existingP.id);
        if (!incomingP) return existingP;
        const isExistingLocal = playerAssignment.isPlayerLocal(existing.id, existingP.id, false);
        if (isExistingLocal) return existingP;
        return {
          ...existingP,
          ntfyTopic: incomingP.ntfyTopic || existingP.ntfyTopic,
          relayUrl: incomingP.relayUrl || existingP.relayUrl,
          notificationMethod: incomingP.notificationMethod || existingP.notificationMethod,
        };
      });
      const updatedGame = await updateLocalGame(existing.id, { players: mergedPlayers });
      return {
        game: updatedGame,
        round: toRoundPayload(existingRound, updatedGame, language),
        updated: true,
      };
    }

    return {
      game: existing,
      round: toRoundPayload(existingRound, existing, language),
      updated: false,
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

    // Enrich missing translations from DEFAULT_WORDS (e.g. for manual words or incomplete bundles)
    const wordId = payload.wordId ? String(payload.wordId) : null;
    const match = DEFAULT_WORDS.find(
      (w) =>
        (wordId && String(w.id) === wordId) ||
        w.word.toLowerCase() === payload.word.trim().toLowerCase() ||
        Object.values(w.translations || {}).some(
          (t) => t.canonical.toLowerCase() === payload.word.trim().toLowerCase(),
        ),
    );
    if (match?.translations) {
      Object.entries(match.translations).forEach(([code, entry]) => {
        const key = shortLanguageCode(code) || normalizeLanguageCode(code);
        if (key && !translations[key] && entry?.canonical) {
          translations[key] = {
            canonical: entry.canonical.trim(),
            synonyms: Array.isArray(entry.synonyms) ? entry.synonyms.filter(Boolean) : [],
            forms: Array.isArray(entry.forms) ? entry.forms.filter(Boolean) : [],
            gendered: Array.isArray(entry.gendered) ? entry.gendered.filter(Boolean) : [],
          };
        }
      });
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
      wordLength: payload.word ? buildWordMask(payload.word).length : 0,
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
    isTemporaryClaim?: boolean,
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
      const isTemp = isTemporaryClaim ?? Boolean(round.temporaryClaim);
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
        temporaryClaim: isTemp,
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

  async listRounds(gameId: string, language?: string): Promise<GuessArtRound[]> {
    const game = await getLocalGame(gameId);
    const rounds = await fetchRoundsForGame(gameId);
    if (!game) {
      return rounds;
    }
    return rounds.map((r) => toRoundPayload(r, game, language) || r);
  },
};
