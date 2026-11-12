import { useSyncExternalStore } from 'react';
import type { ClientEngineContextType } from '../PhoneClientEngine';

/**
 * The mounted phone engine, for UI rendered outside its React tree (the app-level game
 * settings sheet). Without it the sheet saw the default context and profile edits were lost.
 */
let current: ClientEngineContextType | null = null;
const listeners = new Set<() => void>();

export const publishClientEngine = (value: ClientEngineContextType | null): void => {
  current = value;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMountedClientEngine = (): ClientEngineContextType | null =>
  useSyncExternalStore(subscribe, () => current);
