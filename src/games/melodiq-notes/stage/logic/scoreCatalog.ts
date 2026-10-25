import {
  listCompanionSongs,
  songRecording,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';
import {
  listNotesPieces,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../../lib/companion/notesLibraryApi';

/**
 * The sheet-music library of Melodiq Notes: the pieces of the Notes library, the only score store
 * (Q18). A piece linked to a Melodiq song (`songId`) plays with that song's mix.
 */
export interface CatalogScore {
  file: string;
  piece: NotesPiece;
  score: NotesPieceScore;
  /** The linked Melodiq song, when the server still has it. */
  song: CompanionSong | null;
}

export interface CatalogEntry {
  /** The piece id. */
  key: string;
  title: string;
  artist: string;
  piece: NotesPiece;
  /** The linked Melodiq song, when the server still has it. */
  song: CompanionSong | null;
  scores: CatalogScore[];
  /** The piece's own recordings plus the linked song's mix. */
  recordings: number;
}

/** Case, accents, punctuation and extra spaces do not make two titles different. */
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

/** One entry per Notes piece, sorted by artist and title; `songs` only resolve `songId`. */
export function buildScoreCatalog(pieces: NotesPiece[], songs: CompanionSong[]): CatalogEntry[] {
  const songsById = new Map(songs.map((s) => [s.id, s]));
  return pieces
    .map((piece): CatalogEntry => {
      const song = (piece.songId && songsById.get(piece.songId)) || null;
      return {
        key: piece.id,
        title: piece.title,
        artist: piece.artist,
        piece,
        song,
        scores: piece.scores.map((score) => ({ file: score.file, piece, score, song })),
        recordings: piece.recordings.length + (song && songRecording(song) ? 1 : 0),
      };
    })
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
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
  /** `notes`: the library could not be read; `songs`: linked songs play without their mix. */
  errors: { notes?: string; songs?: string };
}

export interface CatalogApi {
  listPieces: () => Promise<NotesPiece[]>;
  listSongs: () => Promise<CompanionSong[]>;
}

const defaultApi: CatalogApi = { listPieces: listNotesPieces, listSongs: listCompanionSongs };

const reason = (r: PromiseRejectedResult) =>
  r.reason instanceof Error ? r.reason.message : String(r.reason);

/** Reads the library and the songs it links; a failing song list still lists every piece. */
export async function loadScoreCatalog(api: CatalogApi = defaultApi): Promise<ScoreCatalog> {
  const [pieces, songs] = await Promise.allSettled([api.listPieces(), api.listSongs()]);
  const errors: ScoreCatalog['errors'] = {};
  if (pieces.status === 'rejected') errors.notes = reason(pieces);
  const linked = pieces.status === 'fulfilled' && pieces.value.some((p) => !!p.songId);
  if (songs.status === 'rejected' && linked) errors.songs = reason(songs);
  return {
    entries: buildScoreCatalog(
      pieces.status === 'fulfilled' ? pieces.value : [],
      songs.status === 'fulfilled' ? songs.value : [],
    ),
    errors,
  };
}
