/**
 * Melodiq Notes library on the companion server (`notes` plugin) [ID: LIB-COMPANION-NOTES]
 */
import { companionRequest as request, jsonBody } from './companionHttp';
import type { StoredBarMarks } from './songScoresApi';

export interface NotesPieceScore {
  file: string;
  /** Server-relative media URL with token; resolve with companionUrl(). */
  url: string;
  hasMarks: boolean;
}

export interface NotesPiece {
  id: string;
  title: string;
  artist: string;
  /** Melodiq song the piece plays with (its mix instead of a copy); absent on older servers. */
  songId?: string | null;
  updatedAt: number;
  scores: NotesPieceScore[];
  recordings: { file: string; url: string }[];
}

export interface StoredNotesFile {
  file: string;
  kind: 'score' | 'recording';
}

const piecePath = (id: string) => `/api/notes/pieces/${encodeURIComponent(id)}`;
const marksPath = (id: string, file: string) =>
  `${piecePath(id)}/scores/${encodeURIComponent(file)}/marks`;

export const listNotesPieces = () => request<NotesPiece[]>('/api/notes/pieces');

export interface NotesPieceMeta {
  title: string;
  artist: string;
  /** Left out keeps the stored link; null removes it. */
  songId?: string | null;
}

export const getNotesPiece = (id: string) => request<NotesPiece>(piecePath(id));

export const createNotesPiece = (meta: NotesPieceMeta) =>
  request<NotesPiece>('/api/notes/pieces', jsonBody('POST', meta));

export const updateNotesPiece = (id: string, meta: NotesPieceMeta) =>
  request<NotesPiece>(piecePath(id), jsonBody('PUT', meta));

/** Stores a score or a recording; the server picks a free file name and says which it used. */
export async function uploadNotesFile(pieceId: string, file: File): Promise<StoredNotesFile> {
  const form = new FormData();
  form.append('file', file);
  return request<StoredNotesFile>(`${piecePath(pieceId)}/files`, { method: 'POST', body: form });
}

export async function getNotesMarks(pieceId: string, file: string): Promise<StoredBarMarks | null> {
  try {
    return await request<StoredBarMarks>(marksPath(pieceId, file));
  } catch {
    return null;
  }
}

export const saveNotesMarks = (pieceId: string, file: string, marks: StoredBarMarks) =>
  request<{ success: true }>(marksPath(pieceId, file), jsonBody('PUT', marks));

export const deleteNotesPiece = (pieceId: string) =>
  request<{ success: true }>(piecePath(pieceId), { method: 'DELETE' });
