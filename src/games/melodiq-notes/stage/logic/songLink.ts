import type { CompanionSong } from '../../../../lib/companion/songScoresApi';
import { catalogKey, normaliseCatalogText } from './scoreCatalog';

/**
 * Choosing the song a score goes to (#563): when saving a score that is not on the server yet,
 * and when moving a song without `.txt` into a Melodiq song. Songs with the same normalised
 * artist + title as the score come first.
 */
export interface SongChoice {
  song: CompanionSong;
  /** Same normalised artist and title as the score. */
  exact: boolean;
}

/** Where a score is saved: an existing song folder, or a new one (null); `label` names the score. */
export interface SaveTarget {
  songId: string | null;
  label: string;
}

export const MAX_SONG_CHOICES = 50;

const byName = (a: CompanionSong, b: CompanionSong) =>
  `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`);

/**
 * The songs to offer, best first: exact artist + title matches, then those matching every word
 * of `query` in artist or title (all songs for an empty query), by artist and title. `excludeId`
 * leaves a song out (the one being moved); at most `MAX_SONG_CHOICES`.
 */
export function rankSongChoices(
  songs: CompanionSong[],
  score: { title: string; artist: string },
  query: string,
  excludeId?: string,
): SongChoice[] {
  const key = catalogKey(score.title, score.artist);
  const words = normaliseCatalogText(query).split(' ').filter(Boolean);
  const choices: SongChoice[] = [];
  for (const song of songs) {
    if (song.id === excludeId) continue;
    const exact = !!score.title.trim() && catalogKey(song.title, song.artist) === key;
    const text = normaliseCatalogText(`${song.artist} ${song.title}`);
    if (exact || words.every((w) => text.includes(w))) choices.push({ song, exact });
  }
  choices.sort((a, b) => Number(b.exact) - Number(a.exact) || byName(a.song, b.song));
  return choices.slice(0, MAX_SONG_CHOICES);
}

/** The pre-selected choice: the first exact match, else a new song (null). */
export const defaultSongChoice = (choices: SongChoice[]): string | null =>
  choices.find((c) => c.exact)?.song.id ?? null;
