import { describe, expect, it } from 'vitest';
import { type SongMeta } from '../../db';
import { toAlbumGroups, toArtistGroups, type LibraryGroupLabels } from './libraryGroups';

const labels: LibraryGroupLabels = {
  unknownArtist: '?artist',
  unknownAlbum: '?album',
  artistSummary: (a, s) => `${a}/${s}`,
  albumSummary: (artist, s) => `${artist}/${s}`,
};

const songs: SongMeta[] = [
  { id: '1', title: 'A', artist: 'Band', album: 'One' },
  { id: '2', title: 'B', artist: 'Band' },
  { id: '3', title: 'C', artist: '' },
];

describe('library groups', () => {
  it('labels unknown artists and albums', () => {
    const artists = toArtistGroups(songs, labels);
    expect(artists.map((g) => [g.title, g.subtitle])).toEqual([
      ['Band', '2/2'],
      ['?artist', '1/1'],
    ]);
    expect(artists[0].sections.map((s) => s.label)).toEqual(['One', '?album']);
  });

  it('lists albums per artist with the artist in the subtitle', () => {
    const albums = toAlbumGroups(songs, labels);
    expect(albums.map((g) => [g.title, g.subtitle])).toEqual([
      ['One', 'Band/1'],
      ['?album', 'Band/1'],
      ['?album', '?artist/1'],
    ]);
  });
});
