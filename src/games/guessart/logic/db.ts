import { createIdbStoreOperations } from '../../../modules/async-game';

const DB_NAME = 'guessart-local';
const DB_VERSION = 1;

export const STORE_GAMES = 'games';
export const STORE_ROUNDS = 'rounds';
export const STORE_CATALOGUES = 'catalogues';
export const STORE_METADATA = 'metadata';

let openRequestPromise: Promise<IDBDatabase> | null = null;

const createUpgradeHandler = (event: IDBVersionChangeEvent) => {
  const target = event.target as IDBOpenDBRequest;
  const db = target.result;

  if (event.oldVersion < 1) {
    const games = db.createObjectStore(STORE_GAMES, { keyPath: 'id' });
    games.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
    games.createIndex('byStatus', 'status', { unique: false });

    const rounds = db.createObjectStore(STORE_ROUNDS, { keyPath: 'id' });
    rounds.createIndex('byGame', 'gameId', { unique: false });
    rounds.createIndex('byRoundNumber', ['gameId', 'roundNumber'], { unique: true });

    db.createObjectStore(STORE_CATALOGUES, { keyPath: 'language' });
    db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
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
