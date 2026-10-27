import { describe, expect, it } from 'vitest';
import { parseUltraStarTxt, ultraStarToScore } from '..';

const SOLO = [
  '#TITLE:Song',
  '#ARTIST:Band',
  '#BPM:300',
  '#GAP:2000',
  ': 0 4 0 Hel',
  ': 4 4 2 lo',
  '* 8 4 4  world',
  '- 14',
  'F 16 2 5  free',
  'R 20 2 0  rap',
  'G 24 2 0  gold',
  'E',
].join('\n');

const DUET = [
  '#TITLE:Duet',
  '#BPM:240,5',
  '#GAP:1000,5',
  '#DUETSINGERP1:Ann',
  '#DUETSINGERP2:Ben',
  'P1',
  ': 0 4 7 la',
  'P2',
  ': 4 4 -5 lu',
  'E',
].join('\n');

describe('parseUltraStarTxt (shared, #566)', () => {
  it('reads headers, comma decimals, duets and line breaks', () => {
    const duet = parseUltraStarTxt(DUET);
    expect(duet.bpm).toBeCloseTo(240.5);
    expect(duet.gap).toBeCloseTo(1000.5);
    expect(duet.tracks.map((t) => t.name)).toEqual(['Ann', 'Ben']);
    const solo = parseUltraStarTxt(SOLO);
    expect(solo.tracks[0].notes.map((n) => n.type)).toEqual([':', ':', '*', '-', 'F', 'R', 'G']);
  });
});

describe('ultraStarToScore (#566)', () => {
  it('turns a track into a vocal part: quarters, MIDI pitch, syllables, kinds, breaks', () => {
    const { song } = ultraStarToScore(parseUltraStarTxt(SOLO));
    const [part] = song.parts;
    expect(part).toMatchObject({ id: 'P1', guess: 'vocals', isDrum: false, phraseBreaks: [3.5] });
    expect(song).toMatchObject({ title: 'Song', artist: 'Band' });
    expect(part.notes.map((n) => [n.t, n.dur, n.pitch])).toEqual([
      [0, 1, 60],
      [1, 1, 62],
      [2, 1, 64],
      [4, 0.5, 65],
      [5, 0.5, 60],
      [6, 0.5, 60],
    ]);
    // "Hel" + "lo" form one word; " world" starts a new one
    expect(part.notes.map((n) => n.syl)).toEqual(['Hel-', 'lo', 'world', 'free', 'rap', 'gold']);
    expect(part.notes.map((n) => n.ultrastar)).toEqual([
      undefined,
      undefined,
      'golden',
      'freestyle',
      'rap',
      'goldenRap',
    ]);
  });

  it('computes bar marks from #BPM and #GAP, no alignment needed', () => {
    // BPM 300 → a quarter lasts 0.2 s; GAP 2 s; notes end at beat 6.5 → 2 bars of 4/4
    const { song, marks } = ultraStarToScore(parseUltraStarTxt(SOLO));
    expect(song.measureStarts).toEqual([0, 4]);
    expect(song.end).toBe(8);
    expect(marks.map((m) => m.beat)).toEqual([0, 4, 8]);
    expect(marks.map((m) => m.sec)).toEqual([2, 2.8, 3.6].map((x) => expect.closeTo(x, 9)));
  });

  it('makes one part per duet singer and keeps their names', () => {
    const { song } = ultraStarToScore(parseUltraStarTxt(DUET));
    expect(song.parts.map((p) => [p.id, p.name, p.notes[0].pitch])).toEqual([
      ['P1', 'Ann', 67],
      ['P2', 'Ben', 55],
    ]);
  });
});
