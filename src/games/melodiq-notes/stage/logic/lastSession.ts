/**
 * What Melodiq Notes remembers between visits (#635): the song last on stage and the instrument
 * the player picked. A score opened from a local file cannot be opened again and is not kept.
 */
import type { InstrumentKind } from '../../../../modules/music-score';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import type { SongOrigin } from '../serverScoreLoad';

export type LastSong =
  | { kind: 'example'; title: string }
  | { kind: 'notes'; songId: string; scoreFile: string }
  | { kind: 'karaoke'; songId: string }
  /** Looked up by file name: ids of the local library change with every folder re-sync. */
  | { kind: 'device'; fileName: string };

const INSTRUMENTS: readonly InstrumentKind[] = [
  'keyboard',
  'guitar',
  'bass',
  'ukulele',
  'drums',
  'vocals',
  'melody',
];

/** The part of the origin worth keeping, or null for a local file. */
export function lastSongOf(origin: SongOrigin): LastSong | null {
  switch (origin.kind) {
    case 'example':
      return { kind: 'example', title: origin.title };
    case 'notes':
      return { kind: 'notes', songId: origin.songId, scoreFile: origin.scoreFile };
    case 'karaoke':
      return { kind: 'karaoke', songId: origin.songId };
    case 'device':
      return { kind: 'device', fileName: origin.fileName };
    default:
      return null;
  }
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Validates stored JSON (it may come from an older version or be edited by hand). */
export function parseLastSong(raw: unknown): LastSong | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (v.kind === 'example' && isText(v.title)) return { kind: 'example', title: v.title };
  if (v.kind === 'notes' && isText(v.songId) && isText(v.scoreFile))
    return { kind: 'notes', songId: v.songId, scoreFile: v.scoreFile };
  if (v.kind === 'karaoke' && isText(v.songId)) return { kind: 'karaoke', songId: v.songId };
  if (v.kind === 'device' && isText(v.fileName)) return { kind: 'device', fileName: v.fileName };
  return null;
}

export const readLastSong = (): LastSong | null =>
  parseLastSong(storage.getJson<unknown>(STORAGE_KEYS.MELODIQ_NOTES_LAST_SONG, null));

/** Keeps the song on stage; a local file leaves the previous entry as it is. */
export function rememberSong(origin: SongOrigin) {
  const last = lastSongOf(origin);
  if (last) storage.setJson(STORAGE_KEYS.MELODIQ_NOTES_LAST_SONG, last);
}

export function parseInstrument(raw: string | null): InstrumentKind | null {
  return INSTRUMENTS.find((k) => k === raw) ?? null;
}

export const readInstrument = () =>
  parseInstrument(storage.get(STORAGE_KEYS.MELODIQ_NOTES_INSTRUMENT));

export const rememberInstrument = (inst: InstrumentKind) =>
  storage.set(STORAGE_KEYS.MELODIQ_NOTES_INSTRUMENT, inst);
