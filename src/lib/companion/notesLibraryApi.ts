/**
 * Writing to song folders on the companion server, as Melodiq Notes does [ID: LIB-COMPANION-NOTES]
 *
 * A song folder is the only store (#568): scores, their bar marks and Notes recordings are files
 * of the song; a new song without karaoke `.txt` gets a folder with `song.json`.
 */
import { companionRequest as request, jsonBody } from './companionHttp';
import type { CompanionSong, StoredBarMarks } from './songScoresApi';

export interface StoredSongFile {
  file: string;
  kind: 'score' | 'recording';
  song?: CompanionSong;
}

export interface SongMetaInput {
  title?: string;
  artist?: string;
  /** Label per score file; an empty string removes it. */
  labels?: Record<string, string>;
}

const songPath = (id: string) => `/api/songs/${encodeURIComponent(id)}`;
const marksPath = (id: string, file: string) =>
  `${songPath(id)}/scores/${encodeURIComponent(file)}/marks`;

/** A new song folder without `.txt` (title, artist in `song.json`). */
export const createLibrarySong = (meta: { title: string; artist: string }) =>
  request<CompanionSong>('/api/songs', jsonBody('POST', meta));

export const updateSongMeta = (id: string, meta: SongMetaInput) =>
  request<CompanionSong>(`${songPath(id)}/meta`, jsonBody('PUT', meta));

/** Stores a score or a recording; the server picks a free file name and says which it used. */
export async function uploadSongFile(songId: string, file: File): Promise<StoredSongFile> {
  const form = new FormData();
  form.append('file', file);
  return request<StoredSongFile>(`${songPath(songId)}/files`, { method: 'POST', body: form });
}

export const deleteSongFile = (songId: string, file: string) =>
  request<{ success: true }>(`${songPath(songId)}/files/${encodeURIComponent(file)}`, {
    method: 'DELETE',
  });

export async function getSongMarks(songId: string, file: string): Promise<StoredBarMarks | null> {
  try {
    return await request<StoredBarMarks>(marksPath(songId, file));
  } catch {
    return null;
  }
}

export const saveSongMarks = (songId: string, file: string, marks: StoredBarMarks) =>
  request<{ success: true }>(marksPath(songId, file), jsonBody('PUT', marks));

/** Removes the whole song folder (the UI offers it only for songs without karaoke `.txt`). */
export const deleteLibrarySong = (songId: string) =>
  request<{ success: true }>(songPath(songId), { method: 'DELETE' });
