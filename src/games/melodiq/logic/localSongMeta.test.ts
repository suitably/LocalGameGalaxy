import { describe, expect, it } from 'vitest';
import { mergeLibraries, toLocalSongMeta } from './localSongMeta';
import { type LocalSong } from './localLibraryProvider';

describe('localSongMeta', () => {
  it('keeps the album of a local song', () => {
    const meta = toLocalSongMeta({
      id: 'l1',
      title: 'T',
      artist: 'A',
      album: 'Best Of',
    } as LocalSong);
    expect(meta).toMatchObject({ id: 'l1', source: 'local', album: 'Best Of' });
  });

  it('prefers local songs over server songs with the same id', () => {
    const local = [{ id: 'a', title: 'local', artist: '' }];
    const server = [
      { id: 'a', title: 'server', artist: '' },
      { id: 'b', title: 'b', artist: '' },
    ];
    expect(mergeLibraries(local, server).map((s) => s.title)).toEqual(['local', 'b']);
    expect(mergeLibraries([], server)).toBe(server);
  });
});
