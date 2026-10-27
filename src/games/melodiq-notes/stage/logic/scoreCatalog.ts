import {
  hasKaraoke,
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
 * (Q18). A piece linked to a Melodiq song (`songId`) plays with that song's mix. Melodiq songs with
 * a karaoke `.txt` add their vocals (#566): on the piece linked to them, else as an entry of their
 * own without a piece.
 */
export interface CatalogScore {
  file: string;
  piece: NotesPiece;
  score: NotesPieceScore;
  /** The linked Melodiq song, when the server still has it. */
  song: CompanionSong | null;
}

export interface CatalogEntry {
  /** The piece id, or `song:<id>` for a karaoke song without a piece. */
  key: string;
  title: string;
  artist: string;
  /** Null for a karaoke song no piece links. */
  piece: NotesPiece | null;
  /** The linked Melodiq song, when the server still has it. */
  song: CompanionSong | null;
  scores: CatalogScore[];
  /** The song whose karaoke `.txt` plays as a vocal part, when it has one. */
  karaoke: CompanionSong | null;
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

/** One entry per Notes piece plus one per karaoke song no piece links, by artist and title. */
export function buildScoreCatalog(pieces: NotesPiece[], songs: CompanionSong[]): CatalogEntry[] {
  const songsById = new Map(songs.map((s) => [s.id, s]));
  const linkedIds = new Set(pieces.map((p) => p.songId).filter(Boolean));
  const mixCount = (song: CompanionSong | null) => (song && songRecording(song) ? 1 : 0);
  const pieceEntries = pieces.map((piece): CatalogEntry => {
    const song = (piece.songId && songsById.get(piece.songId)) || null;
    return {
      key: piece.id,
      title: piece.title,
      artist: piece.artist,
      piece,
      song,
      scores: piece.scores.map((score) => ({ file: score.file, piece, score, song })),
      karaoke: song && hasKaraoke(song) ? song : null,
      recordings: piece.recordings.length + mixCount(song),
    };
  });
  const karaokeEntries = songs
    .filter((song) => hasKaraoke(song) && !linkedIds.has(song.id))
    .map((song): CatalogEntry => ({
      key: `song:${song.id}`,
      title: song.title,
      artist: song.artist,
      piece: null,
      song,
      scores: [],
      karaoke: song,
      recordings: mixCount(song),
    }));
  return [...pieceEntries, ...karaokeEntries].sort(
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
  // a server without the Melodiq plugin has no song list: only warn when a piece needs it
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
