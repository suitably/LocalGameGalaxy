import { createDatabaseExports } from '../../../modules/async-game/idbHelper';
const DB_NAME = 'storyteller-local';
const DB_VERSION = 1;

export const STORE_GAMES = 'games';
export const STORE_ENTRIES = 'entries';

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

export const { openDatabase, withStore, getAll, getByKey, putItem, deleteByKey, clearStore } =
  createDatabaseExports(DB_NAME, DB_VERSION, createUpgradeHandler);
