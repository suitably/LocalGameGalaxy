import { describe, it, expect } from 'vitest';
import { alignRecording } from '../alignment';
import { bandSong, barErrors, onlyParts, renderBand, type RenderOptions } from './bandFixtures';
import type { ScoreSong } from '../types';

const drift: RenderOptions['factorAt'] = (b) => (b < 20 ? 1.06 : b < 32 ? 0.97 : 1.02);

/** Renders the full band, aligns the given score to it and returns the bar errors. */
async function alignCase(scoreParts: string[], opts: Partial<RenderOptions> = {}) {
  const song = bandSong();
  const { samples, truth } = renderBand(song, { startSec: 2.3, factorAt: drift, ...opts });
  const result = await alignRecording(onlyParts(song, scoreParts), samples);
  return { ...barErrors(result.marks, truth), ...result };
}

/** The song with `bars` bars of held chords the recording does not have, before or after it (an arrangement's intro or outro). */
function withExtraBars(song: ScoreSong, bars: number, where: 'intro' | 'outro'): ScoreSong {
  const shift = where === 'intro' ? bars * 4 : 0;
  const first = where === 'intro' ? 0 : song.end;
  const extra = Array.from({ length: bars }, (_, k) =>
    [0, 4, 7].map((iv) => ({ t: first + k * 4, dur: 4, pitch: 49 + 5 * k + iv })),
  ).flat();
  const starts = song.measureStarts.map((b) => b + shift);
  const extraStarts = Array.from({ length: bars }, (_, k) => first + k * 4);
  return {
    ...song,
    measureStarts: where === 'intro' ? [...extraStarts, ...starts] : [...starts, ...extraStarts],
    measureLengths: [...song.measureLengths, ...Array<number>(bars).fill(4)],
    measureNumbers: Array.from({ length: song.measureNumbers.length + bars }, (_, k) => k + 1),
    end: song.end + bars * 4,
    parts: song.parts.map((p) => ({
      ...p,
      notes: [...(p.id === 'g' ? extra : []), ...p.notes.map((n) => ({ ...n, t: n.t + shift }))],
    })),
  };
}

describe('alignRecording on a band recording', () => {
  it('leaves out an intro the recording does not have', async () => {
    const song = bandSong();
    const { samples, truth } = renderBand(song, { startSec: 0.3, factorAt: drift });
    const result = await alignRecording(withExtraBars(song, 3, 'intro'), samples);
    expect(barErrors(result.marks.slice(3), truth).max).toBeLessThan(0.05);
    expect(result.marks[2].sec).toBeLessThan(result.marks[3].sec);
  });

  it('leaves out an outro the recording does not have', async () => {
    const song = bandSong();
    const { samples, truth } = renderBand(song, { startSec: 2.3, factorAt: drift });
    const result = await alignRecording(withExtraBars(song, 3, 'outro'), samples);
    expect(barErrors(result.marks.slice(0, truth.length), truth).max).toBeLessThan(0.05);
  });

  it('aligns a full-band score', async () => {
    const e = await alignCase(['g', 'b', 'd', 'v']);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a drums-only score', async () => {
    const e = await alignCase(['d']);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a guitar-only score against the full mix', async () => {
    const e = await alignCase(['g']);
    expect(e.max).toBeLessThan(0.05);
    expect(e.median).toBeLessThan(0.025);
  });

  it('aligns a guitar-only score when the band tuned down a half-step', async () => {
    const e = await alignCase(['g'], { cents: -100 });
    expect(e.tuning.semitones).toBe(-1);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a guitar-only score when the recording is 30 cents flat', async () => {
    const e = await alignCase(['g'], { cents: -30 });
    // the plucked strings render a few cents off (whole-sample periods), so the estimate is loose
    expect(e.tuning.semitones).toBe(0);
    expect(Math.abs(e.tuning.cents + 30)).toBeLessThan(15);
    expect(e.max).toBeLessThan(0.05);
  });
});

/** The band song's 12 bars played `times` in a row (a song built on one progression). */
function looped(times: number): ScoreSong {
  const s = bandSong();
  const n = times * 12;
  return {
    ...s,
    measureStarts: Array.from({ length: n }, (_, k) => k * 4),
    measureLengths: Array<number>(n).fill(4),
    measureNumbers: Array.from({ length: n }, (_, k) => k + 1),
    end: s.end * times,
    parts: s.parts.map((p) => ({
      ...p,
      notes: Array.from({ length: times }, (_, r) =>
        p.notes.map((x) => ({ ...x, t: x.t + r * s.end })),
      ).flat(),
    })),
  };
}

/** `song` without bars `from..from + bars - 1`. */
function without(song: ScoreSong, from: number, bars: number): ScoreSong {
  const a = from * 4;
  const d = bars * 4;
  const keep = (b: number) => b < a || b >= a + d;
  const move = (b: number) => (b >= a + d ? b - d : b);
  return {
    ...song,
    measureStarts: song.measureStarts.filter(keep).map(move),
    measureLengths: song.measureLengths.slice(bars),
    measureNumbers: song.measureNumbers.slice(bars),
    end: song.end - d,
    parts: song.parts.map((p) => ({
      ...p,
      notes: p.notes.filter((x) => keep(x.t)).map((x) => ({ ...x, t: move(x.t) })),
    })),
  };
}

describe('alignRecording when score and recording differ in the middle', () => {
  it('lets the score wait through a section only the recording has (an extra chorus)', async () => {
    const full = looped(3);
    const { samples, truth } = renderBand(full, { startSec: 1, factorAt: () => 1.03 });
    const result = await alignRecording(without(full, 14, 4), samples);
    // before the extra bars and after them, on the right bar (no shift by the gap)
    expect(barErrors(result.marks.slice(0, 14), truth.slice(0, 14)).max).toBeLessThan(0.05);
    expect(barErrors(result.marks.slice(14, 32), truth.slice(18)).max).toBeLessThan(0.05);
  });

  it('skips a section only the score has (a repeat the band left out)', async () => {
    const full = looped(3);
    const short = without(full, 14, 4);
    const { samples, truth } = renderBand(short, { startSec: 1, factorAt: () => 1.03 });
    const result = await alignRecording(full, samples);
    expect(barErrors(result.marks.slice(0, 14), truth.slice(0, 14)).max).toBeLessThan(0.05);
    // the first bars after the gap settle within a bar or two
    expect(barErrors(result.marks.slice(20, 36), truth.slice(16)).max).toBeLessThan(0.05);
    expect(Math.abs(result.marks[18].sec - truth[14])).toBeLessThan(0.5);
  });
});
