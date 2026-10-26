/**
 * Calibrated input latency of this device, per role and input source [ID: GAME-MELODIQ-NOTES-INPUT-LATENCY]
 *
 * One value per source (screen and keys, MIDI, microphone) because each has its own delay, and
 * per role: on the stage the player hears this device, on a pult they hear the stage.
 */
import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { clampLatency } from '../pult/logic/clockSync';
import type { StageInputSource } from './useStageInput';

export type LatencyRole = 'stage' | 'pult';
type LatencyMap = Partial<Record<string, number>>;

function read(): LatencyMap {
  const raw = storage.get(STORAGE_KEYS.MELODIQ_NOTES_INPUT_LATENCY, '');
  try {
    const v: unknown = JSON.parse(raw || '{}');
    // a plain number is the single pult value stored before latencies were kept per source
    if (typeof v === 'number') return { 'pult:keys': v };
    return v && typeof v === 'object' ? (v as LatencyMap) : {};
  } catch {
    return {};
  }
}

export function useInputLatency(role: LatencyRole, source: StageInputSource) {
  const [all, setAll] = useState(read);
  const key = `${role}:${source}`;
  const ms = clampLatency(all[key] ?? 0);
  const set = useCallback(
    (next: number) => {
      const map = { ...read(), [key]: clampLatency(next) };
      storage.set(STORAGE_KEYS.MELODIQ_NOTES_INPUT_LATENCY, JSON.stringify(map));
      setAll(map);
    },
    [key],
  );
  return { ms, set };
}
