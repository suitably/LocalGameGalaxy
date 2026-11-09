import { DOMParser } from '@xmldom/xmldom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ODE_TO_JOY_XML } from '../../demoSongs';
import { buildMidi, vlq } from '../../../../modules/music-score/__tests__/fixtures';
import {
  findDeviceSong,
  isScoreFileName,
  loadStoredSong,
  storedSongFromScore,
} from '../deviceSong';
import { lastSongOf, parseLastSong } from '../../stage/logic/lastSession';

const toBuffer = (u: Uint8Array) =>
  u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
const bytes = (text: string) => toBuffer(new TextEncoder().encode(text));
const midiBytes = () =>
  toBuffer(buildMidi(480, [[...vlq(0), 0x90, 60, 100, ...vlq(480), 0x80, 60, 0]]));
const extra = { id: 'a', folderId: 'f1', addedAt: 1 };

describe('device songs (#697)', () => {
  // readScoreFile parses MusicXML with the browser's DOMParser; Node tests use xmldom
  beforeAll(() => {
    vi.stubGlobal('DOMParser', DOMParser);
  });

  it('accepts MusicXML, MIDI and Guitar Pro files, not other files', () => {
    for (const n of ['a.xml', 'a.MusicXML', 'a.mxl', 'a.mid', 'a.MIDI', 'a.gp'])
      expect(isScoreFileName(n)).toBe(true);
    for (const n of ['a.mp3', 'a.txt', 'a.gp5', 'notes.xml.bak'])
      expect(isScoreFileName(n)).toBe(false);
  });

  it('imports a MusicXML file as text through readScoreFile', () => {
    const stored = storedSongFromScore('ode.xml', bytes(ODE_TO_JOY_XML), extra);
    expect(stored).toMatchObject({ fileName: 'ode.xml', folderId: 'f1', id: 'a' });
    expect(stored.xmlContent).toContain('<score-partwise');
    expect(stored.scoreData).toBeUndefined();
    expect(loadStoredSong(stored).song.parts.length).toBeGreaterThan(0);
  });

  it('imports a .mid file from a folder and opens it again', () => {
    const stored = storedSongFromScore('tune.mid', midiBytes(), extra);
    expect(stored.scoreData).toBeInstanceOf(ArrayBuffer);
    expect(stored.xmlContent).toBeUndefined();
    expect(stored.baseBpm).toBe(120);
    const loaded = loadStoredSong(stored);
    expect(loaded.xml).toBeNull();
    expect(loaded.song.parts[0].notes).toHaveLength(1);
  });

  it('opens an older row that holds the extracted text of a .mxl', () => {
    const old = {
      ...extra,
      title: 'Ode',
      artist: '',
      baseBpm: 100,
      fileName: 'ode.mxl',
      xmlContent: ODE_TO_JOY_XML,
    };
    expect(loadStoredSong(old).song.parts.length).toBeGreaterThan(0);
  });

  it('rejects a file that is not a score', () => {
    expect(() => storedSongFromScore('bad.mid', bytes('nope'), extra)).toThrow();
    const empty = { ...extra, title: '', artist: '', baseBpm: 1, fileName: 'x.xml' };
    expect(() => loadStoredSong(empty)).toThrow();
  });

  it('remembers a device song by file name and finds it again after a re-sync', () => {
    const origin = { kind: 'device', title: 'Tune', fileName: 'tune.mid' } as const;
    const last = lastSongOf(origin);
    expect(last).toEqual({ kind: 'device', fileName: 'tune.mid' });
    expect(parseLastSong(JSON.parse(JSON.stringify(last)))).toEqual(last);
    expect(parseLastSong({ kind: 'device' })).toBeNull();
    const stored = storedSongFromScore('tune.mid', midiBytes(), { ...extra, id: 'new-id' });
    expect(findDeviceSong([stored], 'tune.mid')?.id).toBe('new-id');
    expect(findDeviceSong([stored], 'other.mid')).toBeUndefined();
  });
});
