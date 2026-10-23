import type { DemoSong, StemType, StoredSheetMusic } from '../types';

/**
 * The song currently loaded into the player. Exactly one source is active at a
 * time, so title, artist, stems and tempo always come from the same place.
 */
export type SongSource =
  | { kind: 'demo'; song: DemoSong }
  | { kind: 'library'; song: StoredSheetMusic }
  | { kind: 'upload'; xmlContent: string; title: string; artist: string; baseBpm: number };

export interface ResolvedSong {
  xmlContent: string;
  title: string;
  artist: string;
  baseBpm: number;
  stems?: Partial<Record<StemType, string>>;
  syncOffsetMs: number;
}

export const DEFAULT_BASE_BPM = 100;

export function resolveSongSource(source: SongSource): ResolvedSong {
  switch (source.kind) {
    case 'demo':
      return {
        xmlContent: source.song.xmlContent,
        title: source.song.title,
        artist: source.song.artist,
        baseBpm: source.song.baseBpm ?? DEFAULT_BASE_BPM,
        stems: source.song.stems,
        syncOffsetMs: source.song.sync_offset_ms ?? 0,
      };
    case 'library':
      return {
        xmlContent: source.song.xmlContent,
        title: source.song.title,
        artist: source.song.artist,
        baseBpm: source.song.baseBpm,
        stems: source.song.stems,
        syncOffsetMs: source.song.sync_offset_ms ?? 0,
      };
    case 'upload':
      return {
        xmlContent: source.xmlContent,
        title: source.title,
        artist: source.artist,
        baseBpm: source.baseBpm,
        syncOffsetMs: 0,
      };
  }
}
