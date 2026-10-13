import { createDatabaseExports } from '../../../modules/async-game/idbHelper';

const DB_NAME = 'guessart-local';
const DB_VERSION = 1;

export const STORE_GAMES = 'games';
export const STORE_ROUNDS = 'rounds';
export const STORE_CATALOGUES = 'catalogues';
export const STORE_METADATA = 'metadata';

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

export const {
  openDatabase,
  withStore,
  getAll,
  getByKey,
  putItem,
  deleteByKey,
  clearStore,
} = createDatabaseExports(DB_NAME, DB_VERSION, createUpgradeHandler);
