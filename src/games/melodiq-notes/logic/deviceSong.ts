/**
 * Songs imported from this device (single folder files, #697): one parser path for every source.
 * A stored song keeps the file as read — MusicXML text, or the raw bytes of a .mid / .gp / .mxl —
 * and opens through `readScoreFile`, like a song from the companion server.
 */
import { readScoreFile, type LoadedScore } from '../stage/loadScore';
import type { StoredSheetMusic } from './db';

const SCORE_FILE = /\.(xml|musicxml|mxl|mid|midi|gp)$/i;
const TEXT_SCORE_FILE = /\.(xml|musicxml)$/i;

export const isScoreFileName = (name: string): boolean => SCORE_FILE.test(name);

/** Reads a score file into a library row. Throws when the file is not a readable score. */
export function storedSongFromScore(
  fileName: string,
  data: ArrayBuffer,
  extra: { id: string; folderId?: string; addedAt: number },
): StoredSheetMusic {
  const { song, xml } = readScoreFile(fileName, data);
  const text = TEXT_SCORE_FILE.test(fileName);
  return {
    id: extra.id,
    title: song.title,
    artist: song.artist,
    baseBpm: song.tempoMap[0]?.bpm ?? 120,
    // MusicXML stays readable text; everything else is kept byte for byte
    ...(text && xml !== null ? { xmlContent: xml } : { scoreData: data }),
    fileName,
    folderId: extra.folderId,
    addedAt: extra.addedAt,
  };
}

/** The bytes `readScoreFile` needs for a stored song, or null when the row holds no score. */
function storedBytes(stored: StoredSheetMusic): ArrayBuffer | null {
  if (stored.scoreData) return stored.scoreData;
  if (stored.xmlContent === undefined) return null;
  const bytes = new TextEncoder().encode(stored.xmlContent);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Opens a stored song. Throws when the row is empty or the score no longer parses. */
export function loadStoredSong(stored: StoredSheetMusic): LoadedScore {
  const data = storedBytes(stored);
  if (!data) throw new Error(`"${stored.fileName}" holds no score`);
  return readScoreFile(stored.fileName, data);
}

/** The stored song a remembered device song points at (file name; ids change on re-sync). */
export const findDeviceSong = (
  songs: readonly StoredSheetMusic[],
  fileName: string,
): StoredSheetMusic | undefined => songs.find((s) => s.fileName === fileName);
