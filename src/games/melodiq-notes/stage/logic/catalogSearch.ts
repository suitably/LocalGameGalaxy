import type { InstrumentKind } from '../../../../modules/music-score';
import {
  matchesQuery,
  SCORE_FORMATS,
  type CatalogEntry,
  type CatalogItem,
  type ScoreFormat,
} from './scoreCatalog';

/**
 * Search of the Melodiq Notes library: free text plus facets. Within a facet the chosen values
 * are alternatives (MusicXML or MIDI), across facets all must hold. Format and instrument narrow
 * a song down to the scores that match, so "MIDI" lists only the MIDI files of each song.
 */
export type CatalogSort = 'artist' | 'title' | 'year';

export interface CatalogFilters {
  query: string;
  formats: ScoreFormat[];
  instruments: InstrumentKind[];
  languages: string[];
  genres: string[];
  sort: CatalogSort;
}

export const NO_CATALOG_FILTERS: CatalogFilters = {
  query: '',
  formats: [],
  instruments: [],
  languages: [],
  genres: [],
  sort: 'artist',
};

/** A song that matches, with the scores (and karaoke vocals) that match. */
export interface CatalogMatch {
  entry: CatalogEntry;
  items: CatalogItem[];
}

/** The values each facet offers in this catalog, in display order. */
export interface CatalogFacets {
  formats: ScoreFormat[];
  instruments: InstrumentKind[];
  languages: string[];
  genres: string[];
}

const INSTRUMENT_ORDER: InstrumentKind[] = [
  'vocals',
  'keyboard',
  'guitar',
  'bass',
  'drums',
  'ukulele',
  'melody',
];

const anyOf = <T>(selected: readonly T[], values: readonly T[]) =>
  selected.length === 0 || values.some((v) => selected.includes(v));

export const toggleValue = <T>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Facet filters in use (the query and the sort order do not count). */
export const activeFilterCount = (f: CatalogFilters) =>
  f.formats.length + f.instruments.length + f.languages.length + f.genres.length;

export const itemMatches = (item: CatalogItem, f: CatalogFilters) =>
  anyOf(f.formats, [item.format]) && anyOf(f.instruments, item.instruments);

const itemName = (item: CatalogItem) =>
  item.kind === 'score' ? (item.score.label ?? item.score.file) : '';

const yearOf = (entry: CatalogEntry) => parseInt(entry.year, 10) || 0;

const SORTS: Record<CatalogSort, (a: CatalogEntry, b: CatalogEntry) => number> = {
  artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist),
  // newest first, songs without a year last
  year: (a, b) => yearOf(b) - yearOf(a) || SORTS.artist(a, b),
};

/**
 * Songs matching every filter. The query must find each of its words in artist, title, genre,
 * language, a score's label or file name, or in `terms` of a score (e.g. translated instrument
 * and format names, so "Gitarre" or "midi" find something).
 */
export function searchCatalog(
  entries: CatalogEntry[],
  f: CatalogFilters,
  terms: (item: CatalogItem) => string = () => '',
): CatalogMatch[] {
  const narrowsItems = f.formats.length > 0 || f.instruments.length > 0;
  const matches: CatalogMatch[] = [];
  for (const entry of entries) {
    if (!anyOf(f.languages, [entry.language]) || !anyOf(f.genres, [entry.genre])) continue;
    const words = entry.items.map((item) => `${itemName(item)} ${terms(item)}`);
    const text = [entry.artist, entry.title, entry.genre, entry.language, ...words].join(' ');
    if (!matchesQuery(text, f.query)) continue;
    const items = entry.items.filter((item) => itemMatches(item, f));
    if (narrowsItems && items.length === 0) continue;
    matches.push({ entry, items });
  }
  return matches.sort((a, b) => SORTS[f.sort](a.entry, b.entry));
}

const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

export function catalogFacets(entries: CatalogEntry[]): CatalogFacets {
  const items = entries.flatMap((e) => e.items);
  const formats = new Set(items.map((i) => i.format));
  const instruments = new Set(items.flatMap((i) => i.instruments));
  return {
    formats: SCORE_FORMATS.filter((f) => formats.has(f)),
    instruments: INSTRUMENT_ORDER.filter((i) => instruments.has(i)),
    languages: distinct(entries.map((e) => e.language)),
    genres: distinct(entries.map((e) => e.genre)),
  };
}
