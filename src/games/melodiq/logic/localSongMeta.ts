import { type SongMeta } from '../db';
import { type LocalSong } from './localLibraryProvider';

/** List entry of a song from the local folder (File System Access), incl. its album (#636). */
export function toLocalSongMeta(s: LocalSong): SongMeta {
  // `bpm` is kept on the object although `SongMeta` does not declare it
  const meta = {
    id: s.id,
    source: 'local' as const,
    title: s.title,
    artist: s.artist,
    bpm: (s as unknown as { bpm?: number }).bpm,
    year: s.year,
    language: s.language,
    genre: s.genre,
    cover: s.cover,
    coverThumbnail: s.coverThumbnail,
    video: s.video,
    audio: s.audio,
    originalAudio: s.originalAudio,
    instrumentalAudio: s.instrumentalAudio,
    vocalsAudio: s.vocalsAudio,
    hasSeparation: s.hasSeparation,
    duration: s.duration,
    edition: s.edition,
    album: s.album,
    hasCover: s.hasCover,
    hasVideo: s.hasVideo,
    txtPath: s.dirPath,
  };
  return meta;
}

/** Local songs first, then server songs whose id is not taken yet. */
export function mergeLibraries(local: SongMeta[], server: SongMeta[]): SongMeta[] {
  if (server.length === 0) return local;
  if (local.length === 0) return server;
  const seen = new Set<string>();
  return [...local, ...server].filter((s) => !seen.has(s.id) && Boolean(seen.add(s.id)));
}
