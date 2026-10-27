import {
  hasKaraoke,
  listLibrarySongs,
  songRecording,
  type CompanionSong,
  type SongScore,
} from '../../../../lib/companion/songScoresApi';

/**
 * The sheet-music library of Melodiq Notes: one entry per song folder, the only store for Melodiq
 * and Melodiq Notes (#568). An entry holds the folder's scores, its recordings (the mix plus Notes
 * recordings) and, when the song has a karaoke `.txt`, its vocals (#566). Songs without `.txt`
 * (sheet music only) are listed here but not in Melodiq's karaoke list.
 */
export interface CatalogScore {
  file: string;
  /** Free text from `song.json`, else null (the file name is shown). */
  label: string | null;
  score: SongScore;
  song: CompanionSong;
}

export interface CatalogEntry {
  /** The song id. */
  key: string;
  title: string;
  artist: string;
  song: CompanionSong;
  scores: CatalogScore[];
  /** The song itself when its karaoke `.txt` plays as a vocal part. */
  karaoke: CompanionSong | null;
  /** The song's mix plus its other recordings. */
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

/** The song folder with the same artist and title (see catalogKey), if there is one. */
export function findSongFolder(
  songs: CompanionSong[],
  title: string,
  artist: string,
): CompanionSong | null {
  const key = catalogKey(title, artist);
  return songs.find((s) => catalogKey(s.title, s.artist) === key) ?? null;
}

export function catalogEntry(song: CompanionSong): CatalogEntry {
  return {
    key: song.id,
    title: song.title,
    artist: song.artist,
    song,
    scores: (song.scores ?? []).map((score) => ({
      file: score.file,
      label: score.label || null,
      score,
      song,
    })),
    karaoke: hasKaraoke(song) ? song : null,
    recordings: (song.recordings ?? []).length + (songRecording(song) ? 1 : 0),
  };
}

/** One entry per song folder, sorted by artist and title. */
export function buildScoreCatalog(songs: CompanionSong[]): CatalogEntry[] {
  return songs
    .map(catalogEntry)
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

/** Reads every song folder of the server (also those without `.txt`). */
export async function loadScoreCatalog(
  listSongs: () => Promise<CompanionSong[]> = listLibrarySongs,
): Promise<CatalogEntry[]> {
  return buildScoreCatalog(await listSongs());
}
