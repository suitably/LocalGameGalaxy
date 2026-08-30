import {
  STORE_GAMES,
  STORE_ROUNDS,
  clearStore,
  deleteByKey,
  getAll,
  getByKey,
  putItem,
  withStore,
} from './db';
import type { GameOptions, GuessArtGameRecord, GuessArtRound } from './types';
import { generateUUID } from '../../../lib/uuid';

const generateId = (prefix = 'local'): string => {
  const random = generateUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
};

const nowISO = (): string => new Date().toISOString();

export const createInitialRound = (gameId: string, drawerId: string): GuessArtRound => ({
  id: generateId('round'),
  gameId,
  roundNumber: 1,
  drawnById: drawerId,
  status: 'selecting',
  word: '',
  wordId: null,
  wordLanguageCode: 'en',
  translations: {},
  wordDifficulty: 3,
  guesses: [],
  hintLevel: 0,
  hintRequested: false,
  hintLetters: [],
  wordMask: [],
  wordLength: 0,
  canvasData: null,
  createdAt: nowISO(),
  updatedAt: nowISO(),
  completedAt: null,
});

export const createLocalGame = async ({
  name,
  players,
  language,
  manualWordMode,
  ownerId,
}: {
  name?: string;
  players: (string | { name: string; isRemote?: boolean })[];
  language?: string;
  manualWordMode?: boolean;
  ownerId?: string | null;
}): Promise<GuessArtGameRecord> => {
  if (!Array.isArray(players) || players.length < 2) {
    throw new Error('At least two players required for GuessArt');
  }

  const timestamp = nowISO();
  const id = generateId('local');
  const normalizedPlayers = players.map((p, index) => {
    const pName = typeof p === 'string' ? p.trim() : p.name.trim();
    const isRemote = typeof p === 'string' ? false : Boolean(p.isRemote);
    return {
      id: generateId(`player${index + 1}`),
      name: pName,
      isRemote,
    };
  });

  const record: GuessArtGameRecord = {
    id,
    name: name?.trim() || undefined,
    type: 'local',
    status: 'selecting',
    roundNumber: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    players: normalizedPlayers,
    currentPlayerIndex: 0,
    options: {
      language: language || 'en',
      manualWordMode: Boolean(manualWordMode),
      ownerId: ownerId || null,
    } as GameOptions,
    statistics: {
      roundsCompleted: 0,
    },
  };

  const initialRound = createInitialRound(record.id, record.players[0].id);

  await withStore(STORE_GAMES, 'readwrite', (store) => {
    store.put(record);
  });

  await withStore(STORE_ROUNDS, 'readwrite', (store) => {
    store.put(initialRound);
  });

  return record;
};

export const getLocalGame = async (gameId: string): Promise<GuessArtGameRecord | null> =>
  getByKey<GuessArtGameRecord>(STORE_GAMES, gameId);

export const updateLocalGame = async (
  gameId: string,
  updater: Partial<GuessArtGameRecord> | ((current: GuessArtGameRecord) => GuessArtGameRecord),
): Promise<GuessArtGameRecord> => {
  const current = await getLocalGame(gameId);
  if (!current) {
    throw new Error('Game not found');
  }
  const updates = typeof updater === 'function' ? updater(current) : updater;
  const next: GuessArtGameRecord = {
    ...current,
    ...updates,
    updatedAt: nowISO(),
  };
  await putItem(STORE_GAMES, next);
  return next;
};

export const listLocalGames = async (): Promise<GuessArtGameRecord[]> => {
  return getAll<GuessArtGameRecord>(STORE_GAMES, 'byUpdatedAt', null, 'prev');
};

export const fetchRoundsForGame = async (gameId: string): Promise<GuessArtRound[]> => {
  const keyRange = globalThis?.IDBKeyRange;
  if (keyRange && typeof keyRange.only === 'function') {
    return getAll<GuessArtRound>(STORE_ROUNDS, 'byGame', keyRange.only(gameId));
  }
  const allRounds = await getAll<GuessArtRound>(STORE_ROUNDS, 'byGame');
  return (allRounds || []).filter((round) => round.gameId === gameId);
};

export const deleteLocalGame = async (gameId: string): Promise<void> => {
  const rounds = await fetchRoundsForGame(gameId);
  await withStore(STORE_ROUNDS, 'readwrite', (store) => {
    rounds.forEach((round) => store.delete(round.id));
  });
  await deleteByKey(STORE_GAMES, gameId);
};

export const getRoundByNumber = async (
  gameId: string,
  roundNumber: number,
): Promise<GuessArtRound | null> => {
  const compositeKey = [gameId, roundNumber];
  const round = await withStore(STORE_ROUNDS, 'readonly', (store) =>
    new Promise<GuessArtRound | null>((resolve, reject) => {
      const index = store.index('byRoundNumber');
      const request = index.get(compositeKey);
      request.onerror = () => reject(request.error || new Error('IndexedDB get round failed'));
      request.onsuccess = () => resolve((request.result as GuessArtRound) ?? null);
    }),
  );
  if (round) {
    return round;
  }
  // Robust fallback for cross-browser index key handling:
  const allRounds = await fetchRoundsForGame(gameId);
  return allRounds.find((r) => r.roundNumber === roundNumber) || allRounds[allRounds.length - 1] || null;
};

export const upsertRound = async (round: GuessArtRound): Promise<GuessArtRound> => {
  const payload: GuessArtRound = {
    ...round,
    updatedAt: nowISO(),
  };
  await putItem(STORE_ROUNDS, payload);
  return payload;
};

export const appendRound = async (
  gameId: string,
  round: Partial<GuessArtRound>,
): Promise<GuessArtRound> => {
  const payload: GuessArtRound = {
    id: round.id || generateId('round'),
    gameId,
    roundNumber: round.roundNumber || 1,
    drawnById: round.drawnById || '',
    status: round.status || 'selecting',
    word: round.word || '',
    wordId: round.wordId || null,
    wordLanguageCode: round.wordLanguageCode || 'en',
    wordDifficulty: round.wordDifficulty || 3,
    translations: round.translations || {},
    guesses: round.guesses || [],
    hintLevel: round.hintLevel || 0,
    hintRequested: round.hintRequested || false,
    hintLetters: round.hintLetters || [],
    wordMask: round.wordMask || [],
    wordLength: round.wordLength || 0,
    canvasData: round.canvasData || null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    completedAt: null,
  };
  await putItem(STORE_ROUNDS, payload);
  return payload;
};

export const upsertGame = async (game: GuessArtGameRecord): Promise<void> => {
  await putItem(STORE_GAMES, game);
};

export const clearAllGames = async (): Promise<void> => {
  await clearStore(STORE_ROUNDS);
  await clearStore(STORE_GAMES);
};
