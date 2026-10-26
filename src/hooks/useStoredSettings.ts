import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { STORAGE_KEYS, storage } from '../lib/storage';

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

const emit = (key: string): void => listeners.get(key)?.forEach((l) => l());

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads stored JSON for `key` merged over `defaults`; invalid data falls back to defaults. */
export function readStoredSettings<T extends object>(
  key: string,
  defaults: T,
  isValid?: (v: unknown) => v is T,
): T {
  const stored = storage.getJson<unknown>(key, null);
  if (!isRecord(stored)) return defaults;
  const merged = { ...defaults, ...stored };
  if (isValid && !isValid(merged)) return defaults;
  return merged as T;
}

/** Persists the patch merged over the current value and notifies same-key hook instances. */
export function writeStoredSettings<T extends object>(
  key: string,
  defaults: T,
  patch: Partial<T>,
  isValid?: (v: unknown) => v is T,
): void {
  storage.setJson(key, { ...readStoredSettings(key, defaults, isValid), ...patch });
  emit(key);
}

export function resetStoredSettings(key: string): void {
  storage.remove(key);
  emit(key);
}

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) listener();
  };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    set.delete(listener);
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('storage', onStorage);
    }
  };
}

/**
 * Persisted settings object under one storage key. Stored values are merged over `defaults`;
 * instances sharing a key stay in sync (module emitter + window `storage` event).
 * Keep `defaults` referentially stable (module constant).
 */
export function useStoredSettings<T extends object>(
  key: StorageKey,
  defaults: T,
  isValid?: (v: unknown) => v is T,
): { value: T; update: (patch: Partial<T>) => void; reset: () => void } {
  const raw = useSyncExternalStore(
    useCallback((l) => subscribe(key, l), [key]),
    () => storage.get(key, ''),
    () => '',
  );
  // `raw` is the cache key: a new object is only built when the stored string changes.
  const value = useMemo(
    () => readStoredSettings(key, defaults, isValid),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, raw, defaults],
  );
  const update = useCallback(
    (patch: Partial<T>) => writeStoredSettings(key, defaults, patch, isValid),
    [key, defaults, isValid],
  );
  const reset = useCallback(() => resetStoredSettings(key), [key]);
  return { value, update, reset };
}
