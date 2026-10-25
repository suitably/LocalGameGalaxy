/**
 * Tabletop IndexedDB Storage Repository [ID: GAME-TABLETOP-STORAGE]
 */
import {
  requestToPromise,
  runWithStore,
  cursorCollect,
} from '../../../modules/async-game/idbHelper';
import type { TabletopGameDefinition, TabletopGameSummary } from './types';

const DB_NAME = 'galaxy_tabletop_db';
const DB_VERSION = 4;
const STORE_GAMES = 'custom_games';
/** Running games, keyed by `sessionKey()`; v3. */
const STORE_SESSIONS = 'sessions';
/** Named table states the player saved to resume later (#538), keyed by `id`; v4. */
const STORE_NAMED_SAVES = 'named_saves';

let dbInstance: IDBDatabase | null = null;

export async function openTabletopDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        const store = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMED_SAVES)) {
        db.createObjectStore(STORE_NAMED_SAVES, { keyPath: 'id' }).createIndex('gameId', 'gameId', {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error || new Error('Failed to open galaxy_tabletop_db'));
  });
}

export async function saveTabletopGame(game: TabletopGameDefinition): Promise<void> {
  // Strip assetFiles so IDB only stores layout/widget snapshot state
  const { assetFiles: _unused, ...gameSnapshot } = game;
  const updated: TabletopGameDefinition = {
    ...gameSnapshot,
    updatedAt: Date.now(),
  };

  return runWithStore(openTabletopDb, STORE_GAMES, 'readwrite', (store) => {
    store.put(updated);
  });
}

export async function getTabletopGame(id: string): Promise<TabletopGameDefinition | null> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readonly', async (store) => {
    const res = await requestToPromise<TabletopGameDefinition | undefined>(store.get(id));
    if (!res) return null;
    const { assetFiles: _unused, ...clean } = res;
    return clean;
  });
}

export async function listTabletopGames(): Promise<TabletopGameSummary[]> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readonly', async (store) => {
    const cursorReq = store.openCursor();
    const fullGames = await cursorCollect<TabletopGameDefinition>(cursorReq);

    return fullGames
      .map((g) => {
        let cardCount = 0;
        let widgetCount = 0;
        for (const w of Object.values(g.widgets || {})) {
          widgetCount++;
          if (w.type === 'card') cardCount++;
          else if (w.type === 'deck') cardCount += w.cardIds?.length || 0;
        }

        return {
          id: g.id,
          name: g.name,
          description: g.description,
          author: g.author,
          version: g.version || '1.0.0',
          minPlayers: g.minPlayers ?? 1,
          maxPlayers: g.maxPlayers ?? 8,
          supportedModes: g.supportedModes || ['party_multi_device', 'local_pass_and_play', 'solo'],
          cardCount,
          widgetCount,
          updatedAt: g.updatedAt || 0,
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export async function deleteTabletopGame(id: string): Promise<void> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readwrite', (store) => {
    store.delete(id);
  });
}

export interface TabletopSessionRecord {
  key: string;
  game: TabletopGameDefinition;
  savedAt: number;
}

/** One saved session per party room, or per game when played locally on one device. */
export const sessionKey = (roomId: string | null, gameId: string): string =>
  roomId ? `room:${roomId}:${gameId}` : `local:${gameId}`;

export async function saveTabletopSession(
  key: string,
  game: TabletopGameDefinition,
): Promise<void> {
  const record: TabletopSessionRecord = { key, game, savedAt: Date.now() };
  return runWithStore(openTabletopDb, STORE_SESSIONS, 'readwrite', (store) => {
    store.put(record);
  });
}

export async function getTabletopSession(key: string): Promise<TabletopSessionRecord | null> {
  return runWithStore(openTabletopDb, STORE_SESSIONS, 'readonly', async (store) => {
    const res = await requestToPromise<TabletopSessionRecord | undefined>(store.get(key));
    return res ?? null;
  });
}

export async function deleteTabletopSession(key: string): Promise<void> {
  return runWithStore(openTabletopDb, STORE_SESSIONS, 'readwrite', (store) => {
    store.delete(key);
  });
}

/** A table state saved under a name on this device (#538). */
export interface TabletopNamedSave {
  id: string;
  gameId: string;
  name: string;
  savedAt: number;
  game: TabletopGameDefinition;
}

export type TabletopNamedSaveMeta = Omit<TabletopNamedSave, 'game'>;

const toSaveMeta = ({ id, gameId, name, savedAt }: TabletopNamedSave): TabletopNamedSaveMeta => ({
  id,
  gameId,
  name,
  savedAt,
});

/** Saves of one game, newest first, without their (large) game state. */
export async function listNamedSaves(gameId: string): Promise<TabletopNamedSaveMeta[]> {
  return runWithStore(openTabletopDb, STORE_NAMED_SAVES, 'readonly', async (store) => {
    const all = await cursorCollect<TabletopNamedSave>(
      store.index('gameId').openCursor(IDBKeyRange.only(gameId)),
    );
    return all.map(toSaveMeta).sort((a, b) => b.savedAt - a.savedAt);
  });
}

export async function getNamedSave(id: string): Promise<TabletopNamedSave | null> {
  return runWithStore(openTabletopDb, STORE_NAMED_SAVES, 'readonly', async (store) => {
    const res = await requestToPromise<TabletopNamedSave | undefined>(store.get(id));
    return res ?? null;
  });
}

/** Stores (or, with an existing id, overwrites) a named save; the game is kept whole like a session. */
export async function putNamedSave(
  save: Omit<TabletopNamedSave, 'savedAt'>,
): Promise<TabletopNamedSaveMeta> {
  const record: TabletopNamedSave = { ...save, savedAt: Date.now() };
  await runWithStore(openTabletopDb, STORE_NAMED_SAVES, 'readwrite', (store) => {
    store.put(record);
  });
  return toSaveMeta(record);
}

export async function deleteNamedSave(id: string): Promise<void> {
  return runWithStore(openTabletopDb, STORE_NAMED_SAVES, 'readwrite', (store) => {
    store.delete(id);
  });
}
