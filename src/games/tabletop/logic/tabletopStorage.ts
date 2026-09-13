/**
 * Tabletop IndexedDB Storage Repository [ID: GAME-TABLETOP-STORAGE]
 */
import { requestToPromise, runWithStore, cursorCollect } from '../../../modules/async-game/idbHelper';
import type { TabletopGameDefinition, TabletopGameSummary } from './types';

const DB_NAME = 'galaxy_tabletop_db';
const DB_VERSION = 1;
const STORE_GAMES = 'custom_games';

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
  const updated: TabletopGameDefinition = {
    ...game,
    updatedAt: Date.now(),
  };

  return runWithStore(openTabletopDb, STORE_GAMES, 'readwrite', (store) => {
    store.put(updated);
  });
}

export async function getTabletopGame(id: string): Promise<TabletopGameDefinition | null> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readonly', async (store) => {
    const res = await requestToPromise<TabletopGameDefinition | undefined>(store.get(id));
    return res || null;
  });
}

export async function listTabletopGames(): Promise<TabletopGameSummary[]> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readonly', async (store) => {
    const cursorReq = store.openCursor();
    const fullGames = await cursorCollect<TabletopGameDefinition>(cursorReq);

    return fullGames.map((g) => {
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
        version: g.version,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        supportedModes: g.supportedModes,
        cardCount,
        widgetCount,
        updatedAt: g.updatedAt || 0,
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export async function deleteTabletopGame(id: string): Promise<void> {
  return runWithStore(openTabletopDb, STORE_GAMES, 'readwrite', (store) => {
    store.delete(id);
  });
}
