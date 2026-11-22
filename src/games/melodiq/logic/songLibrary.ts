/**
 * Song library browsing (#636, ADR-0010): pure grouping, sorting and filtering of the song list by
 * artist and album, plus favourite and playlist helpers. No storage, no React.
 */

/** The song fields the library needs (a subset of `SongMeta`). */
export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  album?: string;
}

export type LibraryTab = 'all' | 'artists' | 'albums' | 'favorites' | 'playlists';

export const LIBRARY_TABS: readonly LibraryTab[] = [
  'all',
  'artists',
  'albums',
  'favorites',
  'playlists',
];

/** A playlist as the library shows it; `mine` is false for a playlist another user shares. */
export interface LibraryPlaylist {
  id: string;
  name: string;
  songs: string[];
  shared: boolean;
  mine: boolean;
  ownerName?: string;
  updatedAt: number;
}

export interface AlbumGroup<S extends LibrarySong = LibrarySong> {
  /** Stable key: artist and album; the album part is '' for "Unknown album". */
  key: string;
  album: string;
  artist: string;
  songs: S[];
}

export interface ArtistGroup<S extends LibrarySong = LibrarySong> {
  artist: string;
  albums: AlbumGroup<S>[];
  songCount: number;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const byTitle = (a: LibrarySong, b: LibrarySong) => collator.compare(a.title, b.title);

/** Trimmed album name; '' means "Unknown album". */
export const albumOf = (song: LibrarySong): string => song.album?.trim() ?? '';

/** Trimmed artist name; '' means "Unknown artist". */
export const artistOf = (song: LibrarySong): string => song.artist.trim();

/** Named entries sorted by name, the empty name ("Unknown …") last. */
const compareNames = (a: string, b: string): number => {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return collator.compare(a, b);
};

/** Albums (per artist) sorted by artist, then album; songs inside sorted by title. */
export function groupByAlbum<S extends LibrarySong>(songs: readonly S[]): AlbumGroup<S>[] {
  const groups = new Map<string, AlbumGroup<S>>();
  for (const song of songs) {
    const artist = artistOf(song);
    const album = albumOf(song);
    const key = `${artist.toLowerCase()}\u0000${album.toLowerCase()}`;
    const group = groups.get(key) ?? { key, album, artist, songs: [] };
    group.songs.push(song);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, songs: [...g.songs].sort(byTitle) }))
    .sort((a, b) => compareNames(a.album, b.album) || compareNames(a.artist, b.artist));
}

/** Artists sorted by name (unknown last), each with its albums (unknown album last). */
export function groupByArtist<S extends LibrarySong>(songs: readonly S[]): ArtistGroup<S>[] {
  const artists = new Map<string, ArtistGroup<S>>();
  for (const album of groupByAlbum(songs)) {
    const key = album.artist.toLowerCase();
    const group = artists.get(key) ?? { artist: album.artist, albums: [], songCount: 0 };
    group.albums.push(album);
    group.songCount += album.songs.length;
    artists.set(key, group);
  }
  return [...artists.values()].sort((a, b) => compareNames(a.artist, b.artist));
}

/** Songs whose title, artist or album contain every word of `query` (case-insensitive). */
export function filterLibrary<S extends LibrarySong>(songs: readonly S[], query: string): S[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...songs];
  return songs.filter((s) => {
    const text = `${s.title} ${s.artist} ${s.album ?? ''}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Adds or removes `songId`; the result keeps the order (new favourites go to the front). */
export const toggleFavorite = (ids: readonly string[], songId: string): string[] =>
  ids.includes(songId) ? ids.filter((id) => id !== songId) : [songId, ...ids];

/** The songs of `ids` in that order, skipping ids missing from the library. */
export function songsByIds<S extends LibrarySong>(
  songs: readonly S[],
  ids: readonly string[],
): S[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return ids.flatMap((id) => {
    const song = byId.get(id);
    return song ? [song] : [];
  });
}

/** Adds songs not yet in the list (keeps order); returns the same array when nothing changes. */
export function addSongIds(list: readonly string[], add: readonly string[]): readonly string[] {
  const missing = add.filter((id, i) => !list.includes(id) && add.indexOf(id) === i);
  return missing.length ? [...list, ...missing] : list;
}

/** Moves the entry at `from` to `to`; out-of-range indices leave the list unchanged. */
export function moveSongId(list: readonly string[], from: number, to: number): string[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Own playlists first (by name), then the ones others share (by name). */
export const sortPlaylists = (lists: readonly LibraryPlaylist[]): LibraryPlaylist[] =>
  [...lists].sort((a, b) => Number(b.mine) - Number(a.mine) || collator.compare(a.name, b.name));
