import { describe, expect, it } from 'vitest';
import {
  addSongIds,
  filterLibrary,
  groupByAlbum,
  groupByArtist,
  moveSongId,
  songsByIds,
  sortPlaylists,
  toggleFavorite,
  type LibraryPlaylist,
} from './songLibrary';

const songs = [
  { id: '1', title: 'Zeta', artist: 'Band', album: 'Second' },
  { id: '2', title: 'Alpha', artist: 'Band', album: 'First' },
  { id: '3', title: 'Beta', artist: 'band ', album: 'first' },
  { id: '4', title: 'Loose', artist: 'Band' },
  { id: '5', title: 'Solo', artist: 'Abba', album: ' ' },
  { id: '6', title: 'Anon', artist: '' },
];

describe('groupByArtist', () => {
  it('groups artists case-insensitively, albums sorted, unknown album and artist last', () => {
    const groups = groupByArtist(songs);
    expect(groups.map((g) => g.artist)).toEqual(['Abba', 'Band', '']);
    const band = groups[1];
    expect(band.songCount).toBe(4);
    expect(band.albums.map((a) => a.album)).toEqual(['First', 'Second', '']);
    expect(band.albums[0].songs.map((s) => s.title)).toEqual(['Alpha', 'Beta']);
    expect(groups[0].albums[0].album).toBe('');
  });
});

describe('groupByAlbum', () => {
  it('keeps same-named albums of different artists apart and puts unknown albums last', () => {
    const groups = groupByAlbum([
      ...songs,
      { id: '7', title: 'Other', artist: 'Cover Band', album: 'First' },
    ]);
    expect(groups.map((g) => `${g.album}/${g.artist}`)).toEqual([
      'First/Band',
      'First/Cover Band',
      'Second/Band',
      '/Abba',
      '/Band',
      '/',
    ]);
  });
});

describe('filterLibrary', () => {
  it('matches every word in title, artist or album', () => {
    expect(filterLibrary(songs, 'band first').map((s) => s.id)).toEqual(['2', '3']);
    expect(filterLibrary(songs, '  ')).toHaveLength(songs.length);
    expect(filterLibrary(songs, 'nothing')).toEqual([]);
  });
});

describe('favourites and playlist helpers', () => {
  it('toggles favourites, newest first', () => {
    expect(toggleFavorite(['a'], 'b')).toEqual(['b', 'a']);
    expect(toggleFavorite(['b', 'a'], 'b')).toEqual(['a']);
  });

  it('resolves ids in order and skips missing songs', () => {
    expect(songsByIds(songs, ['3', 'x', '1']).map((s) => s.id)).toEqual(['3', '1']);
  });

  it('adds only new ids and keeps the array when nothing changes', () => {
    const list = ['a'];
    expect(addSongIds(list, ['a'])).toBe(list);
    expect(addSongIds(list, ['b', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('moves an entry, ignoring out-of-range indices', () => {
    expect(moveSongId(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveSongId(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('sorts own playlists before shared ones', () => {
    const p = (name: string, mine: boolean): LibraryPlaylist => ({
      id: name,
      name,
      songs: [],
      shared: !mine,
      mine,
      updatedAt: 0,
    });
    expect(sortPlaylists([p('b', false), p('z', true), p('a', true)]).map((x) => x.id)).toEqual([
      'a',
      'z',
      'b',
    ]);
  });
});
