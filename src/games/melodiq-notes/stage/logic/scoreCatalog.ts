import {
  listCompanionSongs,
  type CompanionScore,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';
import {
  listNotesPieces,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../../lib/companion/notesLibraryApi';

/**
 * One sheet-music library for Melodiq Notes, built from two server stores:
 * the Notes library (writable) and the scores in Melodiq song folders (read-only here).
 */
export type CatalogScore =
  | { source: 'notes'; file: string; piece: NotesPiece; score: NotesPieceScore }
  | { source: 'song'; file: string; song: CompanionSong; score: CompanionScore };

export interface CatalogEntry {
  /** Normalised artist + title; pieces with the same key are shown as one. */
  key: string;
  title: string;
  artist: string;
  /** Notes library pieces under this title (writable, deletable). */
  pieces: NotesPiece[];
  /** Melodiq songs whose folder holds a score under this title. */
  songs: CompanionSong[];
  /** Notes library scores first, then song-folder scores. */
  scores: CatalogScore[];
  recordings: number;
}

/** Case, accents, punctuation and extra spaces do not make two pieces different. */
export function normaliseCatalogText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export const catalogKey = (title: string, artist: string) =>
  `${normaliseCatalogText(artist)}\u0000${normaliseCatalogText(title)}`;

/** Merges both stores; song folders without sheet music are not pieces and are left out. */
export function buildScoreCatalog(pieces: NotesPiece[], songs: CompanionSong[]): CatalogEntry[] {
  const byKey = new Map<string, CatalogEntry>();
  const entryFor = (title: string, artist: string) => {
    const key = catalogKey(title, artist);
    let entry = byKey.get(key);
    if (!entry) {
      entry = { key, title, artist, pieces: [], songs: [], scores: [], recordings: 0 };
      byKey.set(key, entry);
    }
    return entry;
  };
  for (const piece of pieces) {
    const entry = entryFor(piece.title, piece.artist);
    entry.pieces.push(piece);
    entry.recordings += piece.recordings.length;
    for (const score of piece.scores) {
      entry.scores.push({ source: 'notes', file: score.file, piece, score });
    }
  }
  for (const song of songs) {
    const scores = song.scores.filter((s) => !!s.url);
    if (scores.length === 0) continue;
    const entry = entryFor(song.title, song.artist);
    entry.songs.push(song);
    if (song.originalAudio ?? song.audio) entry.recordings += 1;
    for (const score of scores)
      entry.scores.push({ source: 'song', file: score.file, song, score });
  }
  return [...byKey.values()].sort(
    (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
  );
}

/** Every word of the query must appear in artist or title. */
export function filterCatalog(entries: CatalogEntry[], query: string): CatalogEntry[] {
  const words = normaliseCatalogText(query).split(' ').filter(Boolean);
  if (words.length === 0) return entries;
  return entries.filter((e) => {
    const text = normaliseCatalogText(`${e.artist} ${e.title}`);
    return words.every((w) => text.includes(w));
  });
}

export interface ScoreCatalog {
  entries: CatalogEntry[];
  /** A store that could not be read; the other one is still listed. */
  errors: { notes?: string; songs?: string };
}

export interface CatalogApi {
  listPieces: () => Promise<NotesPiece[]>;
  listSongs: () => Promise<CompanionSong[]>;
}

const defaultApi: CatalogApi = { listPieces: listNotesPieces, listSongs: listCompanionSongs };

const reason = (r: PromiseRejectedResult) =>
  r.reason instanceof Error ? r.reason.message : String(r.reason);

/** Reads both stores; one failing (e.g. the `notes` plugin is off) does not hide the other. */
export async function loadScoreCatalog(api: CatalogApi = defaultApi): Promise<ScoreCatalog> {
  const [pieces, songs] = await Promise.allSettled([api.listPieces(), api.listSongs()]);
  const errors: ScoreCatalog['errors'] = {};
  if (pieces.status === 'rejected') errors.notes = reason(pieces);
  if (songs.status === 'rejected') errors.songs = reason(songs);
  return {
    entries: buildScoreCatalog(
      pieces.status === 'fulfilled' ? pieces.value : [],
      songs.status === 'fulfilled' ? songs.value : [],
    ),
    errors,
  };
}
