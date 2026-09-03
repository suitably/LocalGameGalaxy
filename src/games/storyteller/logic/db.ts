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

export const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let settled = false;
    let resultValue: T | undefined;

    const cleanup = () => {
      transaction.oncomplete = null;
      transaction.onerror = null;
      transaction.onabort = null;
    };

    transaction.oncomplete = () => {
      cleanup();
      if (!settled) {
        settled = true;
        resolve(resultValue as T);
      }
    };

    transaction.onerror = () => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(transaction.error || new Error('IndexedDB transaction error'));
      }
    };

    transaction.onabort = () => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(transaction.error || new Error('IndexedDB transaction aborted'));
      }
    };

    try {
      const result = callback(store, transaction);
      if (result instanceof Promise) {
        result.then(
          (value) => {
            resultValue = value;
          },
          (err) => {
            if (!settled) {
              settled = true;
              reject(err);
            }
          },
        );
      } else {
        resultValue = result;
      }
    } catch (error) {
      if (!settled) {
        settled = true;
        reject(error);
      }
    }
  });
};

export const getAll = <T>(
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange | null,
  direction: IDBCursorDirection = 'next',
): Promise<T[]> =>
  withStore(storeName, 'readonly', (store) =>
    new Promise<T[]>((resolve, reject) => {
      let source: IDBObjectStore | IDBIndex = store;
      if (indexName) {
        source = store.index(indexName);
      }

      const request = source.openCursor(query ?? undefined, direction);
      const items: T[] = [];

      request.onerror = () => reject(request.error || new Error('IndexedDB cursor error'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(items);
          return;
        }
        items.push(cursor.value as T);
        cursor.continue();
      };
    }),
  );

export const getByKey = <T>(storeName: string, key: IDBValidKey): Promise<T | null> =>
  withStore(storeName, 'readonly', (store) =>
    new Promise<T | null>((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error || new Error('IndexedDB get failed'));
      request.onsuccess = () => resolve((request.result as T) ?? null);
    }),
  );

export const putItem = <T>(storeName: string, value: T): Promise<IDBValidKey> =>
  withStore(storeName, 'readwrite', (store) =>
    new Promise<IDBValidKey>((resolve, reject) => {
      const request = store.put(value);
      request.onerror = () => reject(request.error || new Error('IndexedDB put failed'));
      request.onsuccess = () => resolve(request.result);
    }),
  );

export const deleteByKey = (storeName: string, key: IDBValidKey): Promise<void> =>
  withStore(storeName, 'readwrite', (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error || new Error('IndexedDB delete failed'));
      request.onsuccess = () => resolve();
    }),
  );

export const clearStore = (storeName: string): Promise<void> =>
  withStore(storeName, 'readwrite', (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error || new Error('IndexedDB clear failed'));
      request.onsuccess = () => resolve();
    }),
  );
