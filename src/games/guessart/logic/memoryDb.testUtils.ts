/**
 * In-memory stand-in for `./db` (IndexedDB) so repository, catalogue and engine tests run
 * without a browser database. Use with `vi.mock('./db', () => import('./memoryDb.testUtils'))`.
 */
type Row = Record<string, unknown>;

const KEY_PATHS: Record<string, string> = {
  games: 'id',
  rounds: 'id',
  catalogues: 'language',
  metadata: 'key',
};

const stores = new Map<string, Map<string, Row>>();

const storeOf = (name: string): Map<string, Row> => {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
};

export const STORE_GAMES = 'games';
export const STORE_ROUNDS = 'rounds';
export const STORE_CATALOGUES = 'catalogues';
export const STORE_METADATA = 'metadata';

export const resetMemoryDb = (): void => stores.clear();

const keyOf = (name: string, value: Row): string => String(value[KEY_PATHS[name]]);

export const openDatabase = async (): Promise<never> => {
  throw new Error('openDatabase is not available in the in-memory test database');
};

export const getByKey = async <T>(name: string, key: string): Promise<T | null> =>
  (storeOf(name).get(String(key)) as T | undefined) ?? null;

export const putItem = async <T extends Row>(name: string, value: T): Promise<string> => {
  const key = keyOf(name, value);
  storeOf(name).set(key, structuredClone(value));
  return key;
};

export const deleteByKey = async (name: string, key: string): Promise<void> => {
  storeOf(name).delete(String(key));
};

export const clearStore = async (name: string): Promise<void> => {
  storeOf(name).clear();
};

export const getAll = async <T>(
  name: string,
  indexName?: string,
  _query?: unknown,
  direction: 'next' | 'prev' = 'next',
): Promise<T[]> => {
  const rows = [...storeOf(name).values()];
  if (indexName === 'byUpdatedAt') {
    rows.sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  }
  if (direction === 'prev') rows.reverse();
  return rows as T[];
};

/** Minimal `IDBObjectStore` double: `put`, `delete` and the `byRoundNumber` composite index. */
export const withStore = async <T>(
  name: string,
  _mode: string,
  callback: (store: unknown) => Promise<T> | T,
): Promise<T> => {
  const store = {
    put: (value: Row) => {
      storeOf(name).set(keyOf(name, value), structuredClone(value));
    },
    delete: (key: string) => {
      storeOf(name).delete(String(key));
    },
    index: () => ({
      get: (key: [string, number]) => {
        const request: {
          result?: unknown;
          error?: unknown;
          onsuccess?: () => void;
          onerror?: () => void;
        } = {};
        queueMicrotask(() => {
          request.result = [...storeOf(name).values()].find(
            (r) => r.gameId === key[0] && r.roundNumber === key[1],
          );
          request.onsuccess?.();
        });
        return request;
      },
    }),
  };
  return callback(store);
};
