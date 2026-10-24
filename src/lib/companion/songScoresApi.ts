/**
 * Sheet music and bar marks stored next to songs on the companion server [ID: LIB-COMPANION-SCORES]
 */
import { getHelperUrl, isHelperActive } from './companionSettings';
import { companionRequest as request, companionUrl } from './companionHttp';

export { companionUrl };

export interface CompanionScore {
  file: string;
  /** Server-relative media URL; resolve with companionUrl(). */
  url: string | null;
  hasMarks: boolean;
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
  scores: CompanionScore[];
}

export interface StoredBarMarks {
  marks: { beat: number; sec: number }[];
  offsetSec: number;
  audio: string | null;
}

export const isCompanionEnabled = () => isHelperActive() && !!getHelperUrl();

const scorePath = (songId: string, file: string) =>
  `/api/songs/${encodeURIComponent(songId)}/scores/${encodeURIComponent(file)}`;

/** Servers from before sheet-music support send songs without `scores`. */
export const listCompanionSongs = async (): Promise<CompanionSong[]> =>
  (await request<CompanionSong[]>('/api/songs')).map((s) => ({ ...s, scores: s.scores ?? [] }));

export async function fetchCompanionFile(path: string): Promise<ArrayBuffer> {
  const res = await fetch(companionUrl(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

export async function uploadScore(songId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await request<{ file: string }>(`/api/songs/${encodeURIComponent(songId)}/scores`, {
    method: 'POST',
    body: form,
  });
  return res.file;
}

export async function getBarMarks(songId: string, file: string): Promise<StoredBarMarks | null> {
  try {
    return await request<StoredBarMarks>(`${scorePath(songId, file)}/marks`);
  } catch {
    return null;
  }
}

export const saveBarMarks = (songId: string, file: string, marks: StoredBarMarks) =>
  request<{ success: true }>(`${scorePath(songId, file)}/marks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(marks),
  });

/** Opens musescore.com's search for the song; the user downloads the MusicXML with their own account. */
export const scoreSearchUrl = (artist: string, title: string) =>
  `https://musescore.com/sheetmusic?text=${encodeURIComponent(`${artist} ${title}`.trim())}`;
