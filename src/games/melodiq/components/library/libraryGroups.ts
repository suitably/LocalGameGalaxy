import { type SongMeta } from '../../db';
import { groupByAlbum, groupByArtist } from '../../logic/songLibrary';
import { type LibraryGroup } from './LibraryGroupList';

export interface LibraryGroupLabels {
  unknownArtist: string;
  unknownAlbum: string;
  /** e.g. "2 albums · 5 songs" */
  artistSummary: (albums: number, songs: number) => string;
  /** e.g. "Artist · 5 songs" */
  albumSummary: (artist: string, songs: number) => string;
}

/** Artist accordion entries: one section per album (named, "Unknown album" last). */
export function toArtistGroups(songs: SongMeta[], labels: LibraryGroupLabels): LibraryGroup[] {
  return groupByArtist(songs).map((artist) => ({
    key: `artist:${artist.artist.toLowerCase()}`,
    title: artist.artist || labels.unknownArtist,
    subtitle: labels.artistSummary(artist.albums.length, artist.songCount),
    sections: artist.albums.map((album) => ({
      key: album.key,
      label: album.album || labels.unknownAlbum,
      songs: album.songs,
    })),
  }));
}

/** Album accordion entries (per artist): one unlabelled section with the album's songs. */
export function toAlbumGroups(songs: SongMeta[], labels: LibraryGroupLabels): LibraryGroup[] {
  return groupByAlbum(songs).map((album) => ({
    key: `album:${album.key}`,
    title: album.album || labels.unknownAlbum,
    subtitle: labels.albumSummary(album.artist || labels.unknownArtist, album.songs.length),
    sections: [{ key: album.key, songs: album.songs }],
  }));
}
