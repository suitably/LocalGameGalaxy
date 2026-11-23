import { describe, expect, it, vi } from 'vitest';
import type { SongMeta } from '../db';
import { createMemoryTransport } from '../../../modules/room-game/roomTransport';
import {
  handleLibraryResultsEvent,
  handleLibrarySearchEvent,
  LIBRARY_SEARCH_LIMIT,
  parseLibrarySearch,
  searchLibrary,
  type LibraryEvent,
} from './librarySearch';

const song = (id: string, over: Partial<SongMeta> = {}) =>
  ({ id, title: `Title ${id}`, artist: `Artist ${id}`, ...over }) as SongMeta;

const songs = [
  song('1', { title: 'Alpha', artist: 'Bob', genre: 'Pop', year: '2012', language: 'English' }),
  song('2', { title: 'Beta', artist: 'Carl', genre: 'Rock', year: '1995', language: 'German' }),
  song('3', { title: 'Gamma', artist: 'Alpha Band', genre: 'pop', year: '2019' }),
  song('4', { title: 'Delta', artist: 'Dan' }),
];
const ids = (r: { id: string }[]) => r.map((s) => s.id);

describe('searchLibrary', () => {
  it('returns all songs for empty filters and query', () => {
    expect(ids(searchLibrary(songs, '', {}))).toEqual(['1', '2', '3', '4']);
    expect(ids(searchLibrary(songs, ''))).toEqual(['1', '2', '3', '4']);
    expect(
      ids(searchLibrary(songs, '', { genre: 'All', year: 'All', language: 'All' })),
    ).toHaveLength(4);
  });

  it('matches title or artist case-insensitively', () => {
    expect(ids(searchLibrary(songs, 'ALPHA', {}))).toEqual(['1', '3']);
    expect(ids(searchLibrary(songs, 'carl', {}))).toEqual(['2']);
  });

  it('filters genre case-insensitively', () => {
    expect(ids(searchLibrary(songs, '', { genre: 'POP' }))).toEqual(['1', '3']);
  });

  it('filters exact year and decade', () => {
    expect(ids(searchLibrary(songs, '', { year: '1995' }))).toEqual(['2']);
    expect(ids(searchLibrary(songs, '', { year: '2012' }))).toEqual(['1']);
    expect(ids(searchLibrary(songs, '', { year: '2010s' }))).toEqual(['1', '3']);
    expect(ids(searchLibrary(songs, '', { year: '1990s' }))).toEqual(['2']);
  });

  it('filters language and combines filters with the query', () => {
    expect(ids(searchLibrary(songs, '', { language: 'german' }))).toEqual(['2']);
    expect(ids(searchLibrary(songs, 'alpha', { genre: 'Pop', year: '2010s' }))).toEqual(['1', '3']);
    expect(ids(searchLibrary(songs, 'alpha', { language: 'German' }))).toEqual([]);
  });

  it('limits and strips results', () => {
    const many = Array.from({ length: 80 }, (_, i) => song(String(i)));
    const out = searchLibrary(many, '', {});
    expect(out).toHaveLength(LIBRARY_SEARCH_LIMIT);
    expect(Object.keys(out[0]).sort()).toEqual([
      'artist',
      'genre',
      'id',
      'language',
      'title',
      'year',
    ]);
  });
});

describe('parseLibrarySearch', () => {
  it('requires from and reqId', () => {
    expect(parseLibrarySearch({ type: 'library.search', reqId: 'r' })).toBeNull();
    expect(parseLibrarySearch({ type: 'library.search', from: 'a' })).toBeNull();
    expect(parseLibrarySearch({ type: 'x', from: 'a', reqId: 'r' })).toBeNull();
    expect(parseLibrarySearch({ type: 'library.search', from: 'a', reqId: 'r' })?.filters).toEqual(
      {},
    );
  });
});

describe('library search over a transport', () => {
  it('host answers only the requester with the same reqId; phone drops stale replies', () => {
    const t = createMemoryTransport();
    const ch = 'melodiq_room_live';
    const send = (e: LibraryEvent) => t.publish(ch, e);
    t.subscribe(ch, (e) =>
      handleLibrarySearchEvent(e, { getSongs: () => songs, send, selfId: 'host' }),
    );
    const make = (selfId: string) => {
      let latest: string | null = null;
      const onResults = vi.fn();
      t.subscribe(ch, (e) =>
        handleLibraryResultsEvent(e, { selfId, getLatestReqId: () => latest, onResults }),
      );
      return {
        onResults,
        ask: (reqId: string, query: string) => {
          latest = reqId;
          send({ type: 'library.search', from: selfId, reqId, query, filters: {} });
        },
      };
    };
    const a = make('dev_a');
    const b = make('dev_b');
    const seen: LibraryEvent[] = [];
    t.subscribe(ch, (e) => seen.push(e as LibraryEvent));

    a.ask('r1', 'beta');
    b.ask('r2', 'delta');
    const reply = seen.find((e) => e.type === 'library.results' && e.reqId === 'r1');
    expect(reply).toMatchObject({ from: 'host', to: 'dev_a', reqId: 'r1' });
    expect(a.onResults).toHaveBeenCalledTimes(1);
    expect(ids(a.onResults.mock.calls[0][0])).toEqual(['2']);
    expect(ids(b.onResults.mock.calls[0][0])).toEqual(['4']);

    // Stale: A asks again, an old reply for r1 arrives afterwards.
    a.ask('r3', 'alpha');
    a.onResults.mockClear();
    send({ type: 'library.results', from: 'host', to: 'dev_a', reqId: 'r1', results: [] });
    expect(a.onResults).not.toHaveBeenCalled();
  });
});
