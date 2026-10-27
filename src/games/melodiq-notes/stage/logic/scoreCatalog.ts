import { instrumentsInName, type InstrumentKind } from '../../../../modules/music-score';
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

/** File formats the library search filters by; `txt` is a song's karaoke file. */
export const SCORE_FORMATS = ['musicxml', 'midi', 'guitarpro', 'txt'] as const;
export type ScoreFormat = (typeof SCORE_FORMATS)[number];

/** One playable thing of a song: a score file, or the vocals of its karaoke `.txt`. */
export type CatalogItem =
  | { kind: 'score'; score: CatalogScore; format: ScoreFormat; instruments: InstrumentKind[] }
  | { kind: 'karaoke'; song: CompanionSong; format: 'txt'; instruments: InstrumentKind[] };

export interface CatalogEntry {
  /** The song id. */
  key: string;
  title: string;
  artist: string;
  /** From the karaoke `.txt` header; empty for songs without one. */
  genre: string;
  language: string;
  year: string;
  song: CompanionSong;
  scores: CatalogScore[];
  /** The song itself when its karaoke `.txt` plays as a vocal part. */
  karaoke: CompanionSong | null;
  /** The scores, then the karaoke vocals. */
  items: CatalogItem[];
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

/** The format of a score file, by its extension (what `readScoreFile` accepts). */
export function scoreFormatOf(file: string): ScoreFormat {
  const ext = file.toLowerCase().split('.').pop() ?? '';
  if (ext === 'mid' || ext === 'midi') return 'midi';
  if (ext === 'gp') return 'guitarpro';
  return 'musicxml';
}

/**
 * The instruments a score's label or file name mentions ("Bass.mxl", "Piano Vocal").
 * Song title and artist are left out first, so "Arctic Monkeys" is no keyboard.
 */
export function scoreInstruments(score: CatalogScore, title: string, artist: string) {
  const name = normaliseCatalogText(score.label ?? score.file.replace(/\.[^.]+$/, ''));
  const unrelated = [title, artist].map(normaliseCatalogText).filter(Boolean);
  return instrumentsInName(unrelated.reduce((n, words) => n.split(words).join(' '), name));
}

export function catalogEntry(song: CompanionSong): CatalogEntry {
  const scores: CatalogScore[] = (song.scores ?? []).map((score) => ({
    file: score.file,
    label: score.label || null,
    score,
    song,
  }));
  const karaoke = hasKaraoke(song) ? song : null;
  const items: CatalogItem[] = scores.map((item) => ({
    kind: 'score',
    score: item,
    format: scoreFormatOf(item.file),
    instruments: scoreInstruments(item, song.title, song.artist),
  }));
  if (karaoke) items.push({ kind: 'karaoke', song, format: 'txt', instruments: ['vocals'] });
  return {
    key: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre?.trim() ?? '',
    language: song.language?.trim() ?? '',
    year: song.year?.trim() ?? '',
    song,
    scores,
    karaoke,
    items,
    recordings: (song.recordings ?? []).length + (songRecording(song) ? 1 : 0),
  };
}

/** One entry per song folder, sorted by artist and title. */
export function buildScoreCatalog(songs: CompanionSong[]): CatalogEntry[] {
  return songs
    .map(catalogEntry)
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
}

/** Every word of the query appears in the text (case, accents and punctuation aside). */
export function matchesQuery(text: string, query: string): boolean {
  const words = normaliseCatalogText(query).split(' ').filter(Boolean);
  const haystack = normaliseCatalogText(text);
  return words.every((w) => haystack.includes(w));
}

/** Reads every song folder of the server (also those without `.txt`). */
export async function loadScoreCatalog(
  listSongs: () => Promise<CompanionSong[]> = listLibrarySongs,
): Promise<CatalogEntry[]> {
  return buildScoreCatalog(await listSongs());
}
