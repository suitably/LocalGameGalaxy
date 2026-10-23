import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseMusicXml, ScoreImportError } from '../musicXml';
import { playOrder } from '../musicXmlBars';
import { extractMxl } from '../mxl';
import { parseMidi } from '../midi';
import { beatToSec } from '../timing';
import { REPEAT_SCORE, buildMidi, parseXml, textMeta, vlq } from './fixtures';

describe('playOrder', () => {
  it('writes out repeats with first and second endings', () => {
    const bars = [
      { forward: true, backward: false, times: 2, endings: null },
      { forward: false, backward: true, times: 2, endings: [1] },
      { forward: false, backward: false, times: 2, endings: [2] },
    ];
    expect(playOrder(bars)).toEqual([0, 1, 0, 2]);
  });

  it('plays a repeat three times when asked', () => {
    const bars = [
      { forward: false, backward: false, times: 2, endings: null },
      { forward: true, backward: true, times: 3, endings: null },
    ];
    expect(playOrder(bars)).toEqual([0, 1, 1, 1]);
  });
});

describe('parseMusicXml', () => {
  const song = parseMusicXml(REPEAT_SCORE, 'test.musicxml', parseXml);

  it('reads metadata and the shared timeline', () => {
    expect(song.title).toBe('Test Song');
    expect(song.artist).toBe('Tester');
    expect(song.measureNumbers).toEqual([1, 2, 1, 3]);
    expect(song.measureStarts).toEqual([0, 4, 8, 12]);
    expect(song.end).toBe(16);
    expect(song.tempoMap).toEqual([
      { beat: 0, bpm: 90 },
      { beat: 12, bpm: 120 },
    ]);
  });

  it('writes out repeated notes, merges ties and keeps lyrics', () => {
    const piano = song.parts.find((p) => p.name === 'Piano');
    expect(piano?.guess).toBe('keyboard');
    expect(piano?.notes.map((n) => [n.t, n.dur, n.pitch])).toEqual([
      [0, 2, 60],
      [2, 4, 64],
      [8, 2, 60],
      [10, 2, 64],
      [12, 4, 67],
      [12, 4, 70],
    ]);
    expect(piano?.notes[0].syl).toBe('Hal-');
  });

  it('maps unpitched drums through midi-unpitched and applies transposition', () => {
    const drums = song.parts.find((p) => p.name === 'Drumset');
    expect(drums?.isDrum).toBe(true);
    expect(drums?.guess).toBe('drums');
    expect(drums?.notes.slice(0, 2).map((n) => n.pitch)).toEqual([36, 38]);
    const guitar = song.parts.find((p) => p.name === 'Electric Guitar');
    expect(guitar?.notes[0].pitch).toBe(52);
    expect(guitar?.guess).toBe('guitar');
  });

  it('rejects files that are not partwise scores', () => {
    expect(() => parseMusicXml('<score-timewise/>', 'x', parseXml)).toThrow(ScoreImportError);
    expect(() => parseMusicXml('<html/>', 'x', parseXml)).toThrow(ScoreImportError);
  });

  it('follows the tempo map in seconds', () => {
    expect(beatToSec(song.tempoMap, 12)).toBeCloseTo(8);
    expect(beatToSec(song.tempoMap, 16)).toBeCloseTo(10);
  });
});

describe('extractMxl', () => {
  it('finds the root file through META-INF/container.xml', () => {
    const zip = zipSync({
      'META-INF/container.xml': strToU8(
        '<container><rootfiles><rootfile full-path="score/main.xml"/></rootfiles></container>',
      ),
      'score/main.xml': strToU8('<score-partwise/>'),
    });
    expect(extractMxl(zip)).toBe('<score-partwise/>');
  });

  it('rejects data that is not a zip', () => {
    expect(() => extractMxl(new Uint8Array([1, 2, 3]))).toThrow(ScoreImportError);
  });
});

describe('parseMidi', () => {
  const ppq = 480;
  const track = [
    ...vlq(0),
    ...textMeta(0x03, 'Gitarre'),
    ...vlq(0),
    0xff,
    0x51,
    0x03,
    0x07,
    0xa1,
    0x20, // 120 bpm
    ...vlq(0),
    0xff,
    0x58,
    0x04,
    0x03,
    0x02,
    0x18,
    0x08, // 3/4
    ...vlq(0),
    0xc0,
    25,
    ...vlq(0),
    ...textMeta(0x05, 'Hal-'),
    ...vlq(0),
    0x90,
    64,
    100,
    ...vlq(0),
    0x99,
    36,
    100,
    ...vlq(120),
    0x89,
    36,
    0,
    ...vlq(360),
    0x80,
    64,
    0,
    ...vlq(0),
    0x90,
    67,
    100,
    ...vlq(960),
    0x90,
    67,
    0,
    ...vlq(0),
    0xff,
    0x2f,
    0x00,
  ];
  const song = parseMidi(buildMidi(ppq, [track]), 'song.mid');

  it('splits parts by channel and names them', () => {
    expect(song.parts.map((p) => [p.name, p.guess, p.isDrum])).toEqual([
      ['Gitarre', 'guitar', false],
      ['Drums', 'drums', true],
    ]);
  });

  it('reads notes, tempo, bars and lyrics', () => {
    const g = song.parts[0];
    expect(g.notes.map((n) => [n.t, n.dur, n.pitch])).toEqual([
      [0, 1, 64],
      [1, 2, 67],
    ]);
    expect(g.notes[0].syl).toBe('Hal-');
    expect(song.tempoMap).toEqual([{ beat: 0, bpm: 120 }]);
    expect(song.measureLengths).toEqual([3]);
  });

  it('rejects other files', () => {
    expect(() => parseMidi(new Uint8Array([1, 2, 3, 4]), 'x.mid')).toThrow(ScoreImportError);
  });

  it('plays at 120 bpm until the first tempo event', () => {
    // 90 bpm (666667 µs per quarter) from beat 8
    const late = [
      ...vlq(0),
      0x90,
      60,
      100,
      ...vlq(8 * 480),
      0xff,
      0x51,
      0x03,
      0x0a,
      0x2c,
      0x2b,
      ...vlq(480),
      0x80,
      60,
      0,
      ...vlq(0),
      0xff,
      0x2f,
      0x00,
    ];
    expect(parseMidi(buildMidi(480, [late]), 'late.mid').tempoMap).toEqual([
      { beat: 0, bpm: 120 },
      { beat: 8, bpm: 90 },
    ]);
  });

  it('stops at the end of the data when a track length is corrupt', () => {
    const data = buildMidi(480, [[...vlq(0), 0x90, 60, 100, ...vlq(480), 0x80, 60, 0]]);
    new DataView(data.buffer).setUint32(18, 0xfffffff0);
    expect(parseMidi(data, 'broken.mid').parts[0].notes).toHaveLength(1);
  });
});
