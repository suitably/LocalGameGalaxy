import { createIdbStoreOperations } from '../../../modules/async-game';

const DB_NAME = 'storyteller-local';
const DB_VERSION = 1;

export const STORE_GAMES = 'games';
export const STORE_ENTRIES = 'entries';

let openRequestPromise: Promise<IDBDatabase> | null = null;

const createUpgradeHandler = (event: IDBVersionChangeEvent) => {
  const target = event.target as IDBOpenDBRequest;
  const db = target.result;

  if (event.oldVersion < 1) {
    const games = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
    games.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
    games.createIndex('byStatus', 'status', { unique: false });

    const entries = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
    entries.createIndex('byGame', 'gameId', { unique: false });
    entries.createIndex('byTurnNumber', ['gameId', 'turnNumber'], { unique: true });
  }
};

export const openDatabase = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (openRequestPromise) {
    return openRequestPromise;
  }

  openRequestPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = createUpgradeHandler;
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
  })
    .then((db) => {
      db.onversionchange = () => {
        db.close();
        openRequestPromise = null;
      };
      return db;
    })
    .catch((error) => {
      openRequestPromise = null;
      throw error;
    });

  return openRequestPromise;
};

const ops = createIdbStoreOperations(openDatabase);

export const withStore = ops.withStore;
export const getAll = ops.getAll;
export const getByKey = ops.getByKey;
export const putItem = ops.putItem;
export const deleteByKey = ops.deleteByKey;
export const clearStore = ops.clearStore;
