import { describe, expect, it } from 'vitest';
import type { ScoreNote, ScorePart, ScoreSong } from '../../../../../modules/music-score';
import { stageView, updatePartSettings } from '../partSettings';
import {
  barIndexAt,
  derivedStrums,
  resolveStrums,
  updateStrumSetting,
  withStrums,
} from '../strumDirection';

const BARS = [0, 4, 8];
/** A two-note chord at each beat, optionally marked. */
const chordsAt = (times: number[], strum?: ScoreNote['strum']): ScoreNote[] =>
  times.flatMap((t) => [
    { t, dur: 0.5, pitch: 52, ...(strum && { strum }) },
    { t, dur: 0.5, pitch: 59, ...(strum && { strum }) },
  ]);
const guitar = (notes: ScoreNote[]): ScorePart => ({
  id: 'P1',
  name: 'Guitar',
  notes,
  isDrum: false,
  program: null,
  guess: 'guitar',
});
const song = (parts: ScorePart[]): ScoreSong => ({
  title: 'S',
  artist: '',
  source: 's.musicxml',
  tempoMap: [{ beat: 0, bpm: 120 }],
  measureStarts: BARS,
  measureLengths: [4, 4, 4],
  measureNumbers: [1, 2, 3],
  end: 12,
  parts,
});
const strumsAt = (notes: ScoreNote[]) => [
  ...new Map(notes.filter((n) => n.strum).map((n) => [n.t, n.strum])).values(),
];

describe('derivedStrums (#634)', () => {
  it('downstrokes on beats, upstrokes on eighth offbeats', () => {
    expect(derivedStrums([0, 0.5, 1, 1.5, 2, 3.5], BARS)).toEqual([
      'down',
      'up',
      'down',
      'up',
      'down',
      'up',
    ]);
  });

  it('in a beat with sixteenths: down on the eighths, up on the sixteenths between', () => {
    // beat 1: 1 e & a; beat 2: only eighths, so the & stays an upstroke
    expect(derivedStrums([0, 0.25, 0.5, 0.75, 1, 1.5], BARS)).toEqual([
      'down',
      'up',
      'down',
      'up',
      'down',
      'up',
    ]);
    // dotted eighth + sixteenth: the last sixteenth is an upstroke
    expect(derivedStrums([4, 4.75], BARS)).toEqual(['down', 'up']);
  });

  it('counts from each bar start and alternates off the grid (triplets)', () => {
    expect(derivedStrums([4.5, 8], BARS)).toEqual(['up', 'down']);
    expect(derivedStrums([0, 1 / 3, 2 / 3], BARS)).toEqual(['down', 'up', 'down']);
  });

  it('finds the bar of a beat', () => {
    expect(barIndexAt({ measureStarts: BARS }, 3.99)).toBe(0);
    expect(barIndexAt({ measureStarts: BARS }, 4)).toBe(1);
    expect(barIndexAt({ measureStarts: BARS }, 20)).toBe(2);
  });
});

describe('resolveStrums precedence (#634)', () => {
  it('marks only chords; single unmarked notes keep no direction', () => {
    const part = guitar([...chordsAt([0, 0.5]), { t: 1, dur: 1, pitch: 60 }]);
    const notes = resolveStrums(part, song([part]), undefined);
    expect(strumsAt(notes)).toEqual(['down', 'up']);
    expect(notes.find((n) => n.t === 1)?.strum).toBeUndefined();
  });

  it('score marks win over the rhythm, a single marked note counts as a stroke', () => {
    const part = guitar([...chordsAt([0], 'up'), { t: 1, dur: 1, pitch: 60, strum: 'up' }]);
    expect(strumsAt(resolveStrums(part, song([part]), undefined))).toEqual(['up', 'up']);
  });

  it('the user mode wins over marks, a bar override over the mode', () => {
    const part = guitar([...chordsAt([0], 'up'), ...chordsAt([4.5]), ...chordsAt([8], 'up')]);
    const s = song([part]);
    expect(strumsAt(resolveStrums(part, s, { mode: 'down' }))).toEqual(['down', 'down', 'down']);
    expect(strumsAt(resolveStrums(part, s, { mode: 'down', bars: { 2: 'up' } }))).toEqual([
      'down',
      'up',
      'down',
    ]);
    // a bar back on auto uses the mark again
    expect(strumsAt(resolveStrums(part, s, { mode: 'down', bars: { 3: 'auto' } }))).toEqual([
      'down',
      'down',
      'up',
    ]);
  });

  it('leaves non-strummed parts alone', () => {
    const bass = { ...guitar(chordsAt([0])), guess: 'bass' as const };
    const s = song([bass]);
    expect(withStrums(s, {})).toBe(s);
  });
});

describe('strum settings (#634)', () => {
  it('keeps only what differs from the default', () => {
    expect(updateStrumSetting(undefined, { mode: 'auto' })).toBeUndefined();
    const down = updateStrumSetting(undefined, { mode: 'down' });
    expect(down).toEqual({ mode: 'down' });
    const bar = updateStrumSetting(down, { bar: 3, barMode: 'up' });
    expect(bar).toEqual({ mode: 'down', bars: { 3: 'up' } });
    expect(updateStrumSetting(bar, { bar: 3 })).toEqual({ mode: 'down' });
    // switching the song to up drops the bar override that now matches it
    expect(updateStrumSetting(bar, { mode: 'up' })).toEqual({ mode: 'up' });
  });

  it('survives other part edits and shows on the stage song', () => {
    const part = guitar(chordsAt([0, 0.5]));
    const s = song([part, { ...guitar(chordsAt([0])), id: 'P2', guess: 'keyboard' }]);
    let settings = updatePartSettings({}, part, { strum: { mode: 'up' } });
    settings = updatePartSettings(settings, part, { name: 'Rhythm' });
    expect(settings.P1).toEqual({ name: 'Rhythm', strum: { mode: 'up' } });
    expect(strumsAt(stageView(s, settings).song.parts[0].notes)).toEqual(['up', 'up']);
    expect(updatePartSettings(settings, part, { strum: undefined }).P1).toEqual({ name: 'Rhythm' });
  });
});
