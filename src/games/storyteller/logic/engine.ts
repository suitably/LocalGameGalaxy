import {
  appendEntry,
  createStoryGame,
  fetchEntriesForGame,
  getStoryGame,
  listStoryGames,
  updateStoryGame,
  upsertEntry,
  upsertGame,
} from './repository';
import { getRandomWords } from './storyLexicon';
import { evaluateRouletteWords } from './modifiers';
import type {
  StoryEntry,
  StoryGameRecord,
  StoryGameSnapshot,
  StoryModifierSettings,
} from '../types';

export const isStorySnapshotNewer = (
  snapshot: StoryGameSnapshot,
  existingGame: StoryGameRecord,
  existingEntries: StoryEntry[],
): boolean => {
  if (snapshot.game.turnNumber > existingGame.turnNumber) return true;
  if (snapshot.game.turnNumber < existingGame.turnNumber) return false;

  if (snapshot.entries.length > existingEntries.length) return true;
  if (snapshot.entries.length < existingEntries.length) return false;

  if (snapshot.game.status === 'completed' && existingGame.status !== 'completed') {
    return true;
  }

  const snapTime = new Date(snapshot.game.updatedAt || 0).getTime();
  const existTime = new Date(existingGame.updatedAt || 0).getTime();
  return snapTime > existTime;
};

export const LocalStoryEngine = {
  async createGame(payload: {
    name?: string;
    players: (string | { name: string; isRemote?: boolean })[];
    language?: string;
    modifiers?: StoryModifierSettings;
  }): Promise<StoryGameRecord> {
    return createStoryGame(payload);
  },

  async getGameSnapshot(gameId: string): Promise<StoryGameSnapshot> {
    const game = await getStoryGame(gameId);
    if (!game) {
      throw new Error(`Story game ${gameId} not found`);
    }
    const entries = await fetchEntriesForGame(gameId);
    return { game, entries };
  },

  async listGames(): Promise<StoryGameRecord[]> {
    return listStoryGames();
  },

  async updateGameDetails(
    gameId: string,
    payload: {
      name?: string;
      players?: { id: string; name: string }[];
    },
  ): Promise<StoryGameSnapshot> {
    const game = await getStoryGame(gameId);
    if (!game) {
      throw new Error(`Story game ${gameId} not found`);
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

    const updatedGame = await updateStoryGame(gameId, (current) => ({
      ...current,
      name: payload.name !== undefined ? payload.name.trim() || undefined : current.name,
      players: updatedPlayers,
    }));

    const entries = await fetchEntriesForGame(gameId);
    return { game: updatedGame, entries };
  },

  async submitTurn(
    gameId: string,
    payload: {
      text: string;
      timeSpentSeconds?: number;
    },
  ): Promise<StoryGameSnapshot> {
    const game = await getStoryGame(gameId);
    if (!game) {
      throw new Error(`Story game ${gameId} not found`);
    }
    if (game.status !== 'writing') {
      throw new Error('Story is not in writing state');
    }

    const rawText = payload.text.trim();
    if (!rawText) {
      throw new Error('Story text cannot be empty');
    }

    // Validate Word Roulette if active
    if (game.options.modifiers.wordRoulette.enabled && game.currentRequiredWords) {
      const evaluation = evaluateRouletteWords(rawText, game.currentRequiredWords);
      const missing = evaluation.filter((e) => !e.matched);
      if (missing.length > 0) {
        throw new Error(
          `Missing required roulette words: ${missing.map((m) => m.word).join(', ')}`,
        );
      }
    }

    const activePlayer = game.players[game.currentPlayerIndex] || {
      id: 'unknown',
      name: 'Unknown Player',
    };

    const words = rawText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    await appendEntry(gameId, {
      gameId,
      turnNumber: game.turnNumber,
      authorId: activePlayer.id,
      authorName: activePlayer.name,
      text: rawText,
      wordCount,
      submittedAt: new Date().toISOString(),
      requiredWords: game.currentRequiredWords,
      timeSpentSeconds: payload.timeSpentSeconds,
    });

    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    const nextTurnNumber = game.turnNumber + 1;

    // Pick new roulette words for the next turn if modifier is enabled
    const nextRequiredWords = game.options.modifiers.wordRoulette.enabled
      ? getRandomWords(
          game.options.language,
          game.options.modifiers.wordRoulette.wordsPerTurn,
          game.currentRequiredWords,
        )
      : undefined;

    const updatedGame = await updateStoryGame(gameId, (current) => ({
      ...current,
      turnNumber: nextTurnNumber,
      currentPlayerIndex: nextPlayerIndex,
      currentRequiredWords: nextRequiredWords,
      statistics: {
        totalWords: (current.statistics?.totalWords || 0) + wordCount,
        totalTurns: (current.statistics?.totalTurns || 0) + 1,
      },
    }));

    const entries = await fetchEntriesForGame(gameId);
    return { game: updatedGame, entries };
  },

  async finishStory(gameId: string): Promise<StoryGameSnapshot> {
    const game = await getStoryGame(gameId);
    if (!game) {
      throw new Error(`Story game ${gameId} not found`);
    }

    const updatedGame = await updateStoryGame(gameId, (current) => ({
      ...current,
      status: 'completed',
    }));

    const entries = await fetchEntriesForGame(gameId);
    return { game: updatedGame, entries };
  },

  async importSnapshot(
    snapshot: StoryGameSnapshot,
  ): Promise<{ game: StoryGameRecord; entries: StoryEntry[]; updated: boolean }> {
    if (!snapshot || !snapshot.game) {
      throw new Error('Invalid story snapshot');
    }

    const existing = await getStoryGame(snapshot.game.id);
    if (!existing) {
      await upsertGame(snapshot.game);
      for (const entry of snapshot.entries || []) {
        await upsertEntry(entry);
      }
      return { game: snapshot.game, entries: snapshot.entries || [], updated: true };
    }

    const existingEntries = await fetchEntriesForGame(existing.id);
    if (isStorySnapshotNewer(snapshot, existing, existingEntries)) {
      await upsertGame(snapshot.game);
      for (const entry of snapshot.entries || []) {
        await upsertEntry(entry);
      }
      return { game: snapshot.game, entries: snapshot.entries || [], updated: true };
    }

    return {
      game: existing,
      entries: existingEntries,
      updated: false,
    };
  },
};
