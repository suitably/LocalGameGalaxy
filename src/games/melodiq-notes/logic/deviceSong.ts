/**
 * Songs imported from this device (single folder files, #697): one parser path for every source.
 * A stored song keeps the file as read — MusicXML text, or the raw bytes of a .mid / .gp / .mxl —
 * and opens through `readScoreFile`, like a song from the companion server.
 */
import { readMusicXmlText, readScoreFile, type LoadedScore } from '../stage/loadScore';
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

/**
 * Opens a stored song. Throws when the row is empty or the score no longer parses.
 * Text rows are MusicXML whatever the file name says (older rows hold the text of an extracted .mxl).
 */
export function loadStoredSong(stored: StoredSheetMusic): LoadedScore {
  if (stored.scoreData) return readScoreFile(stored.fileName, stored.scoreData);
  if (stored.xmlContent === undefined) throw new Error(`"${stored.fileName}" holds no score`);
  return readMusicXmlText(stored.xmlContent, stored.fileName);
}

/** The stored song a remembered device song points at (file name; ids change on re-sync). */
export const findDeviceSong = (
  songs: readonly StoredSheetMusic[],
  fileName: string,
): StoredSheetMusic | undefined => songs.find((s) => s.fileName === fileName);
