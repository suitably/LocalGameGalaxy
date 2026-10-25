import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { SongMeta } from '../db';

/** Song restored after a reload, optionally carrying its saved position (seconds). */
export type RestoredSong = SongMeta & { currentTime?: number };

/** Position of the running song, persisted by `usePlaybackReporting` roughly once per second. */
interface SavedPlayback {
  id: string;
  time: number;
}

/** Pure parser: returns the saved position for `songId`, or null when absent, stale or invalid. */
export function parseSavedPlaybackTime(raw: unknown, songId: string): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, time } = raw as Partial<SavedPlayback>;
  if (id !== songId || typeof time !== 'number' || !Number.isFinite(time) || time <= 0) {
    return null;
  }
  return time;
}

export function readSavedPlaybackTime(songId: string): number | null {
  return parseSavedPlaybackTime(
    storage.getJson<unknown>(STORAGE_KEYS.MELODIQ_SAVED_TIME, null),
    songId,
  );
}
