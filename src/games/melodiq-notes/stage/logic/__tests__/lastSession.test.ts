import { describe, it, expect } from 'vitest';
import { lastSongOf, parseInstrument, parseLastSong } from '../lastSession';
import { defaultSeats } from '../../engine/players';
import { song } from '../../engine/__tests__/fixtures';

describe('last session (#635)', () => {
  it('keeps songs that can be opened again, not local files', () => {
    expect(lastSongOf({ kind: 'example', title: 'Ode' })).toEqual({
      kind: 'example',
      title: 'Ode',
    });
    expect(lastSongOf({ kind: 'notes', title: 'X', songId: 's1', scoreFile: 'Band.mxl' })).toEqual({
      kind: 'notes',
      songId: 's1',
      scoreFile: 'Band.mxl',
    });
    expect(lastSongOf({ kind: 'karaoke', title: 'X', songId: 's2' })).toEqual({
      kind: 'karaoke',
      songId: 's2',
    });
    expect(lastSongOf({ kind: 'file', title: 'local' })).toBeNull();
  });

  it('rejects stored values it does not understand', () => {
    expect(parseLastSong({ kind: 'notes', songId: 's1', scoreFile: 'a.mxl' })).toEqual({
      kind: 'notes',
      songId: 's1',
      scoreFile: 'a.mxl',
    });
    expect(parseLastSong({ kind: 'notes', songId: 's1' })).toBeNull();
    expect(parseLastSong({ kind: 'file', title: 'x' })).toBeNull();
    expect(parseLastSong('nonsense')).toBeNull();
    expect(parseLastSong(null)).toBeNull();
    expect(parseInstrument('drums')).toBe('drums');
    expect(parseInstrument('')).toBeNull();
    expect(parseInstrument('banjo')).toBeNull();
  });

  it('seats the player on a part of the instrument they last picked', () => {
    const s = song();
    expect(defaultSeats(s)[0].partId).toBe('piano');
    expect(defaultSeats(s, 'drums')[0]).toEqual({ partId: 'drums', inst: 'drums' });
    expect(defaultSeats(s, 'bass')[0].partId).toBe('bass');
    // the song has no such part: the usual choice
    expect(defaultSeats(s, 'vocals')[0].partId).toBe('piano');
  });
});
