import { describe, expect, it } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import {
  activeFilterCount,
  catalogFacets,
  NO_CATALOG_FILTERS,
  searchCatalog,
  toggleValue,
  type CatalogFilters,
} from '../catalogSearch';
import { buildScoreCatalog } from '../scoreCatalog';

const score = (file: string, label: string | null = null) => ({
  file,
  url: `/media?path=${file}`,
  hasMarks: false,
  label,
});

const song = (id: string, over: Partial<CompanionSong>): CompanionSong => ({
  id,
  title: id,
  artist: 'A',
  originalAudio: null,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  ...over,
});

const catalog = buildScoreCatalog([
  song('brightside', {
    title: 'Mr. Brightside',
    artist: 'The Killers',
    txtContent: '#BPM:120\n: 0 4 0 la\nE',
    genre: 'Rock',
    language: 'English',
    year: '2004',
    scores: [score('Beginner.mxl', 'Piano Beginner'), score('Drums.mid'), score('Band.mxl')],
  }),
  song('etude', {
    title: 'Etude',
    artist: 'Chopin',
    karaoke: false,
    scores: [score('Etude_Piano.musicxml')],
  }),
  song('lied', {
    title: 'Lied',
    artist: 'Nena',
    txtContent: '#BPM:120\n: 0 4 0 la\nE',
    genre: 'Pop',
    language: 'German',
    year: '1983',
  }),
]);

const search = (patch: Partial<CatalogFilters>) =>
  searchCatalog(catalog, { ...NO_CATALOG_FILTERS, ...patch });
const keys = (patch: Partial<CatalogFilters>) => search(patch).map((m) => m.entry.key);
const files = (patch: Partial<CatalogFilters>, key: string) =>
  search(patch)
    .find((m) => m.entry.key === key)
    ?.items.map((i) => (i.kind === 'score' ? i.score.file : 'txt'));

describe('searchCatalog', () => {
  it('lists every song with all its items without filters, sorted by artist', () => {
    expect(keys({})).toEqual(['etude', 'lied', 'brightside']);
    expect(files({}, 'brightside')).toEqual(['Beginner.mxl', 'Drums.mid', 'Band.mxl', 'txt']);
  });

  it('finds query words in score labels, file names and extra terms', () => {
    expect(keys({ query: 'beginner' })).toEqual(['brightside']);
    expect(keys({ query: 'killers drums' })).toEqual(['brightside']);
    expect(keys({ query: 'rock' })).toEqual(['brightside']);
    const terms = (item: { instruments: string[] }) =>
      item.instruments.includes('keyboard') ? 'Klavier' : '';
    expect(searchCatalog(catalog, { ...NO_CATALOG_FILTERS, query: 'klavier' }, terms)).toHaveLength(
      2,
    );
  });

  it('narrows songs to the items of the chosen formats', () => {
    expect(keys({ formats: ['midi'] })).toEqual(['brightside']);
    expect(files({ formats: ['midi'] }, 'brightside')).toEqual(['Drums.mid']);
    expect(keys({ formats: ['txt'] })).toEqual(['lied', 'brightside']);
    expect(files({ formats: ['midi', 'txt'] }, 'brightside')).toEqual(['Drums.mid', 'txt']);
  });

  it('narrows songs to the items of the chosen instruments; karaoke counts as vocals', () => {
    expect(keys({ instruments: ['keyboard'] })).toEqual(['etude', 'brightside']);
    expect(files({ instruments: ['vocals'] }, 'brightside')).toEqual(['txt']);
    expect(keys({ instruments: ['drums'], formats: ['musicxml'] })).toEqual([]);
  });

  it('filters by language and genre and sorts by title or year', () => {
    expect(keys({ languages: ['German'] })).toEqual(['lied']);
    expect(keys({ genres: ['Rock', 'Pop'] })).toEqual(['lied', 'brightside']);
    expect(keys({ sort: 'title' })).toEqual(['etude', 'lied', 'brightside']);
    expect(keys({ sort: 'year' })).toEqual(['brightside', 'lied', 'etude']);
  });
});

describe('catalog facets', () => {
  it('offers only values the catalog has, in display order', () => {
    expect(catalogFacets(catalog)).toEqual({
      formats: ['musicxml', 'midi', 'txt'],
      instruments: ['vocals', 'keyboard', 'drums'],
      languages: ['English', 'German'],
      genres: ['Pop', 'Rock'],
    });
  });

  it('toggles values and counts active facet filters', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
    expect(activeFilterCount({ ...NO_CATALOG_FILTERS, query: 'x', formats: ['midi'] })).toBe(1);
  });
});
