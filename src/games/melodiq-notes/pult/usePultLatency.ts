/**
 * This device's input latency as a pult, kept per device [ID: GAME-MELODIQ-NOTES-PULT-LATENCY]
 */
import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { clampLatency } from './logic/clockSync';

export function usePultLatency() {
  const [ms, setMs] = useState(() =>
    clampLatency(Number(storage.get(STORAGE_KEYS.MELODIQ_NOTES_INPUT_LATENCY, '0'))),
  );
  const set = useCallback((next: number) => {
    const v = clampLatency(next);
    storage.set(STORAGE_KEYS.MELODIQ_NOTES_INPUT_LATENCY, String(v));
    setMs(v);
  }, []);
  return { ms, set };
}
