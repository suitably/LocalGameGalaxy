export const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
};

export const cursorCollect = <T>(
  request: IDBRequest<IDBCursorWithValue | null>,
  predicate?: (value: T) => boolean,
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    request.onerror = () => reject(request.error || new Error('Cursor iteration failed'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(results);
        return;
      }
      const val = cursor.value as T;
      if (!predicate || predicate(val)) {
        results.push(val);
      }
      cursor.continue();
    };
  });
};

export const runWithStore = async <T>(
  openDb: () => Promise<IDBDatabase>,
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let callbackResult: Promise<T> | T;
    try {
      callbackResult = callback(store, transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    if (callbackResult instanceof Promise) {
      callbackResult
        .then((result) => {
          transaction.oncomplete = () => resolve(result);
        })
        .catch((error) => {
          transaction.abort();
          reject(error);
        });
    } else {
      transaction.oncomplete = () => resolve(callbackResult);
    }

    transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
  });
};

export const createIdbStoreOperations = (openDatabase: () => Promise<IDBDatabase>) => {
  const withStore = <T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T,
  ): Promise<T> => runWithStore(openDatabase, storeName, mode, callback);

  const getAll = <T>(
    storeName: string,
    indexName?: string,
    query?: IDBValidKey | IDBKeyRange | null,
    direction: IDBCursorDirection = 'next',
  ): Promise<T[]> =>
    withStore(storeName, 'readonly', (store) => {
      const source = indexName ? store.index(indexName) : store;
      return cursorCollect<T>(source.openCursor(query ?? undefined, direction));
    });

  const getByKey = <T>(storeName: string, key: IDBValidKey): Promise<T | null> =>
    withStore(storeName, 'readonly', async (store) => {
      const result = await requestToPromise(store.get(key));
      return (result as T) ?? null;
    });

  const putItem = <T>(storeName: string, value: T): Promise<IDBValidKey> =>
    withStore(storeName, 'readwrite', (store) => requestToPromise(store.put(value)));

  const deleteByKey = (storeName: string, key: IDBValidKey): Promise<void> =>
    withStore(storeName, 'readwrite', async (store) => {
      await requestToPromise(store.delete(key));
    });

  const clearStore = (storeName: string): Promise<void> =>
    withStore(storeName, 'readwrite', async (store) => {
      await requestToPromise(store.clear());
    });

  return {
    withStore,
    getAll,
    getByKey,
    putItem,
    deleteByKey,
    clearStore,
  };
};
