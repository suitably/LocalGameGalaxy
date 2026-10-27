/**
 * Melodiq songs on the companion server, as Melodiq Notes uses them [ID: LIB-COMPANION-SCORES]
 *
 * Sheet music and bar marks live only in the Notes library (`notesLibraryApi.ts`); a Notes piece
 * links a song with `songId` and plays with its mix. The song folders store no scores (Q18).
 */
import { getHelperUrl, isHelperActive } from './companionSettings';
import { companionRequest as request, companionUrl } from './companionHttp';

export { companionUrl };

export interface CompanionSong {
  id: string;
  title: string;
  artist: string;
  /** Mixed recording (server-relative media URL). */
  originalAudio: string | null;
  audio: string | null;
  instrumentalAudio: string | null;
  cover: string | null;
  /** The UltraStar `.txt` (karaoke lyrics and notes); Melodiq Notes shows it as a vocal part (#566). */
  txtContent?: string;
}

export interface StoredBarMarks {
  marks: { beat: number; sec: number }[];
  offsetSec: number;
  /** Recording the marks belong to: a file of the piece, or null / anything else for the song mix. */
  audio: string | null;
}

export const isCompanionEnabled = () => isHelperActive() && !!getHelperUrl();

export const listCompanionSongs = () => request<CompanionSong[]>('/api/songs');

/** Whether the song has karaoke notes Melodiq Notes can play as a vocal part. */
export const hasKaraoke = (song: CompanionSong) => !!song.txtContent?.trim();

/** The song's mixed recording (server-relative media URL), if it has one. */
export const songRecording = (song: CompanionSong) => song.originalAudio ?? song.audio;

export async function fetchCompanionFile(path: string): Promise<ArrayBuffer> {
  const res = await fetch(companionUrl(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

/** Opens musescore.com's search for the song; the user downloads the MusicXML with their own account. */
export const scoreSearchUrl = (artist: string, title: string) =>
  `https://musescore.com/sheetmusic?text=${encodeURIComponent(`${artist} ${title}`.trim())}`;
