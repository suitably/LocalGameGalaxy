import { v4 as uuidv4 } from 'uuid';
import {
  deleteByKey,
  getAll,
  getByKey,
  putItem,
  STORE_ENTRIES,
  STORE_GAMES,
} from './db';
import { DEFAULT_MODIFIER_SETTINGS } from './modifiers';
import { getRandomWords } from './storyLexicon';
import type {
  StoryEntry,
  StoryGameRecord,
  StoryModifierSettings,
  StoryPlayer,
} from '../types';
import { storage } from '../../../lib/storage';

export const createStoryGame = async (payload: {
  name?: string;
  players: (string | { name: string; isRemote?: boolean })[];
  language?: string;
  modifiers?: StoryModifierSettings;
}): Promise<StoryGameRecord> => {
  const language = payload.language || 'de';
  const modifiers = payload.modifiers || DEFAULT_MODIFIER_SETTINGS;
  const initialRequiredWords = modifiers.wordRoulette.enabled
    ? getRandomWords(language, modifiers.wordRoulette.wordsPerTurn)
    : undefined;

  const ownRelay = storage.getPushRelayUrl();
  const prefMethod = storage.getNotificationMethod();
  const userNtfyTopic = storage.getUserNtfyTopic();
  const players: StoryPlayer[] = (payload.players || []).map((p, index) => {
    const isString = typeof p === 'string';
    const isRemote = isString ? false : Boolean(p.isRemote);
    const pName = isString ? p.trim() || `Spieler ${index + 1}` : p.name.trim() || `Spieler ${index + 1}`;
    return {
      id: `player_${index + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: pName,
      isRemote,
      relayUrl: !isRemote && index === 0 ? ownRelay || undefined : undefined,
      notificationMethod: !isRemote && index === 0 ? prefMethod : undefined,
      ntfyTopic: !isRemote && index === 0 ? userNtfyTopic : undefined,
    };
  });

  const now = new Date().toISOString();
  const gameRecord: StoryGameRecord = {
    id: uuidv4(),
    name: payload.name?.trim() || undefined,
    type: 'local',
    status: 'writing',
    turnNumber: 1,
    createdAt: now,
    updatedAt: now,
    players,
    currentPlayerIndex: 0,
    options: {
      language,
      modifiers,
    },
    currentRequiredWords: initialRequiredWords,
    statistics: {
      totalWords: 0,
      totalTurns: 0,
    },
  };

  await putItem(STORE_GAMES, gameRecord);
  return gameRecord;
};

export const getStoryGame = async (id: string): Promise<StoryGameRecord | null> => {
  return getByKey<StoryGameRecord>(STORE_GAMES, id);
};

export const updateStoryGame = async (
  id: string,
  updater:
    | ((current: StoryGameRecord) => StoryGameRecord)
    | Partial<StoryGameRecord>,
): Promise<StoryGameRecord> => {
  const current = await getStoryGame(id);
  if (!current) {
    throw new Error(`Game ${id} not found`);
  }

  const updated: StoryGameRecord =
    typeof updater === 'function'
      ? updater(current)
      : { ...current, ...updater, updatedAt: new Date().toISOString() };

  updated.updatedAt = new Date().toISOString();
  await putItem(STORE_GAMES, updated);
  return updated;
};

export const listStoryGames = async (): Promise<StoryGameRecord[]> => {
  const games = await getAll<StoryGameRecord>(STORE_GAMES, 'byUpdatedAt', null, 'prev');
  return games;
};

export const deleteStoryGame = async (id: string): Promise<void> => {
  await deleteByKey(STORE_GAMES, id);
  const entries = await fetchEntriesForGame(id);
  for (const entry of entries) {
    await deleteByKey(STORE_ENTRIES, entry.id);
  }
};

export const fetchEntriesForGame = async (gameId: string): Promise<StoryEntry[]> => {
  const entries = await getAll<StoryEntry>(
    STORE_ENTRIES,
    'byGame',
    IDBKeyRange.only(gameId),
    'next',
  );
  return entries.sort((a, b) => a.turnNumber - b.turnNumber);
};

export const getEntryByTurnNumber = async (
  gameId: string,
  turnNumber: number,
): Promise<StoryEntry | null> => {
  const entries = await fetchEntriesForGame(gameId);
  return entries.find((e) => e.turnNumber === turnNumber) || null;
};

export const appendEntry = async (
  gameId: string,
  entryData: Omit<StoryEntry, 'id'>,
): Promise<StoryEntry> => {
  const entry: StoryEntry = {
    ...entryData,
    id: uuidv4(),
    gameId,
  };
  await putItem(STORE_ENTRIES, entry);
  return entry;
};

export const upsertGame = async (game: StoryGameRecord): Promise<void> => {
  await putItem(STORE_GAMES, game);
};

export const upsertEntry = async (entry: StoryEntry): Promise<void> => {
  await putItem(STORE_ENTRIES, entry);
};
