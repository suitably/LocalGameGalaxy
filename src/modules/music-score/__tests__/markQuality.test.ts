import { describe, expect, it } from 'vitest';
import {
  assessMarks,
  clampEdgeBars,
  defaultMode,
  fitSteadyTempo,
  marksForMode,
  steadyMarks,
} from '../markQuality';
import { onsetHitScore } from '../onsetAlign';
import type { OnsetBands } from '../noteFit';
import type { BarMark, ScoreSong } from '../types';

const BPM = 87;
const BAR_SEC = (4 * 60) / BPM;

function song(bars: number): ScoreSong {
  return {
    title: 't',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: BPM }],
    measureStarts: Array.from({ length: bars }, (_, k) => k * 4),
    measureLengths: Array<number>(bars).fill(4),
    measureNumbers: Array.from({ length: bars }, (_, k) => k + 1),
    end: bars * 4,
    parts: [
      {
        id: 'd',
        name: 'Drums',
        isDrum: true,
        program: null,
        guess: 'drums',
        notes: Array.from({ length: bars * 4 }, (_, k) => ({ t: k, dur: 1, pitch: 36 })),
      },
    ],
  } as ScoreSong;
}

/** Marks of a steady recording: bar 1 at `start`, `ratio` recording seconds per score second. */
const line = (s: ScoreSong, start: number, ratio: number): BarMark[] =>
  s.measureStarts.concat(s.end).map((beat) => ({ beat, sec: start + (ratio * beat * 60) / BPM }));

describe('fitSteadyTempo', () => {
  it('finds tempo and start of a steady recording', () => {
    const s = song(40);
    const fit = fitSteadyTempo(s, line(s, 15.7, 0.999));
    expect(fit.ratio).toBeCloseTo(0.999, 6);
    expect(fit.startSec).toBeCloseTo(15.7, 6);
  });

  it('is not moved by a run of wrong bars', () => {
    const s = song(93);
    const marks = line(s, 15.7, 1);
    // a stretch slipping two bars late, as stored for "Wonderwall" by an older alignment
    for (let k = 65; k < 75; k++) marks[k].sec += ((k - 64) / 10) * 2 * BAR_SEC;
    const fit = fitSteadyTempo(s, marks);
    expect(Math.abs(fit.ratio - 1)).toBeLessThan(0.002);
    expect(Math.abs(fit.startSec - 15.7)).toBeLessThan(0.05);
  });
});

describe('assessMarks', () => {
  it('rates a clean steady alignment good and steady', () => {
    const s = song(40);
    const marks = line(s, 0.2, 1).map((m, k) => ({ ...m, sec: m.sec + (k % 2 ? 0.02 : -0.02) }));
    const q = assessMarks(s, marks);
    expect(q.verdict).toBe('good');
    expect(q.steady).toBe(true);
    expect(defaultMode(q)).toBe('steady');
  });

  it('flags the bars that drift away from the song tempo', () => {
    const s = song(40);
    const marks = line(s, 0.2, 1);
    for (let k = 20; k < 26; k++) marks[k].sec += (k - 19) * 0.6;
    for (let k = 26; k < marks.length; k++) marks[k].sec += 3.6;
    const q = assessMarks(s, marks);
    expect(q.verdict).toBe('unsure');
    expect(q.suspectBars).toEqual(expect.arrayContaining([19, 20, 21, 22, 23, 24]));
    expect(q.suspectBars).not.toContain(10);
  });

  it('calls an implausible tempo unsure even when every bar agrees', () => {
    const s = song(40);
    expect(assessMarks(s, line(s, 50, 1 / 1.35)).verdict).toBe('unsure');
  });

  it('keeps a song with a real tempo change out of steady mode', () => {
    const s = song(40);
    const marks = line(s, 0, 1);
    for (let k = 20; k < marks.length; k++)
      marks[k].sec = marks[19].sec + (k - 19) * BAR_SEC * 1.08;
    const q = assessMarks(s, marks);
    expect(q.steady).toBe(false);
    expect(defaultMode(q)).toBe('bars');
  });
});

describe('clampEdgeBars', () => {
  it('puts a last bar stretched into a fade-out back on the song tempo', () => {
    const s = song(30);
    const marks = line(s, 1, 1);
    marks[29].sec += 8;
    marks[30].sec += 16;
    const out = clampEdgeBars(s, marks);
    expect(out[29].sec).toBeCloseTo(1 + 29 * BAR_SEC, 6);
    expect(out[30].sec).toBeCloseTo(1 + 30 * BAR_SEC, 6);
    expect(out[10]).toEqual(marks[10]);
  });

  it('puts a first bar pulled into a count-in back on the song tempo', () => {
    const s = song(30);
    const marks = line(s, 3, 1);
    marks[0].sec -= 2;
    expect(clampEdgeBars(s, marks)[0].sec).toBeCloseTo(3, 6);
  });

  it('leaves clean marks alone', () => {
    const s = song(30);
    const marks = line(s, 3, 1.01);
    expect(clampEdgeBars(s, marks)).toEqual(marks);
  });
});

describe('marksForMode', () => {
  it('plays bar marks, a straight line through them, or nothing', () => {
    const s = song(20);
    const marks = line(s, 2, 1).map((m, k) => ({ ...m, sec: m.sec + (k === 5 ? 0.05 : 0) }));
    expect(marksForMode(s, marks, 'bars')).toBe(marks);
    expect(marksForMode(s, marks, 'off')).toBeNull();
    expect(marksForMode(s, null, 'steady')).toBeNull();
    const steady = marksForMode(s, marks, 'steady')!;
    expect(steady).toEqual(steadyMarks(s, fitSteadyTempo(s, marks)));
    expect(steady[5].sec).toBeCloseTo(2 + 5 * BAR_SEC, 6);
  });
});

describe('onsetHitScore', () => {
  it('scores the right placement above one a beat off', () => {
    const s = song(20);
    const hop = 0.01;
    const frames = Math.ceil((2 + s.end * (60 / BPM) + 2) / hop);
    const low = new Float32Array(frames);
    for (let b = 0; b < s.end; b++) low[Math.round((2 + (b * 60) / BPM) / hop)] = 1;
    const bands: OnsetBands = [low, new Float32Array(frames), new Float32Array(frames)];
    const right = onsetHitScore(s, line(s, 2, 1), bands);
    const off = onsetHitScore(s, line(s, 2 + 30 / BPM, 1), bands);
    expect(right).toBeGreaterThan(0.9);
    expect(off).toBeLessThan(0.1);
  });
});
