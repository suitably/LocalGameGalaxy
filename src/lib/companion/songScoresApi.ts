/**
 * Melodiq songs on the companion server, as Melodiq Notes reads them [ID: LIB-COMPANION-SCORES]
 *
 * A song folder is the only store for Melodiq and Melodiq Notes (#568): the karaoke `.txt` with
 * its mix, sheet music with bar marks, and extra recordings. Songs without `.txt` (sheet music
 * only) are listed with `?all=1`. Writing goes through `notesLibraryApi.ts`.
 */
import { getHelperUrl, isHelperActive } from './companionSettings';
import { companionRequest as request, companionUrl } from './companionHttp';

export { companionUrl };

export interface SongScore {
  file: string;
  /** Server-relative media URL with token; resolve with companionUrl(). */
  url: string;
  hasMarks: boolean;
  /** Free text shown instead of the file name (`song.json`), or null. */
  label?: string | null;
}

export interface SongRecording {
  file: string;
  /** Server-relative media URL with token. */
  url: string;
}

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
  /** False for a song without karaoke `.txt` (sheet music only); absent on older servers. */
  karaoke?: boolean;
  /** Header fields of the karaoke `.txt`; absent for songs without one. */
  genre?: string;
  language?: string;
  year?: string;
  /** Sheet music in the song folder. */
  scores?: SongScore[];
  /** Audio in the song folder besides the mix (Notes recordings). */
  recordings?: SongRecording[];
}

export interface StoredBarMarks {
  marks: { beat: number; sec: number }[];
  offsetSec: number;
  /** Recording the marks belong to: a file in the song folder, or null for the song's mix. */
  audio: string | null;
}

export const isCompanionEnabled = () => isHelperActive() && !!getHelperUrl();

/** Karaoke songs only (what Melodiq lists). */
export const listCompanionSongs = () => request<CompanionSong[]>('/api/songs');

/** Every song folder, also those without `.txt`: the Melodiq Notes library. */
export const listLibrarySongs = () => request<CompanionSong[]>('/api/songs?all=1');

export const getCompanionSong = (id: string) =>
  request<CompanionSong>(`/api/songs/${encodeURIComponent(id)}`);

/** Whether the song has karaoke notes Melodiq Notes can play as a vocal part. */
export const hasKaraoke = (song: CompanionSong) =>
  song.karaoke !== false && !!song.txtContent?.trim();

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
