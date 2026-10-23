import { describe, it, expect } from 'vitest';
import { ALIGN_SAMPLE_RATE, frameCentre, frameCount } from '../dsp';
import { fitMarksToNotes, type OnsetBands } from '../noteFit';
import type { ScoreSong } from '../types';

describe('frame timing', () => {
  it('keeps frame times exact over a long recording', () => {
    // 10 ms is 110.25 samples; rounding the hop once would be 0.67 s off after five minutes
    expect(frameCentre(30000, 0.01)).toBe(300 * ALIGN_SAMPLE_RATE);
    expect(frameCount(300 * ALIGN_SAMPLE_RATE, 0.01)).toBe(30001);
  });
});

/** Sixteen 3/4 bars at 60 bpm: kick on 1, snare on 3, a tone on every beat. */
function song(): ScoreSong {
  const bars = 16;
  const drums = [];
  const tones = [];
  for (let b = 0; b < bars; b++) {
    drums.push({ t: b * 3, dur: 0.5, pitch: 36 }, { t: b * 3 + 2, dur: 0.5, pitch: 38 });
    for (let i = 0; i < 3; i++) tones.push({ t: b * 3 + i, dur: 1, pitch: 60 + i });
  }
  return {
    title: 't',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: 60 }],
    measureStarts: Array.from({ length: bars }, (_, i) => i * 3),
    measureLengths: Array(bars).fill(3),
    measureNumbers: Array.from({ length: bars }, (_, i) => i + 1),
    end: bars * 3,
    parts: [
      { id: 'd', name: 'Drums', notes: drums, isDrum: true, program: null, guess: 'drums' },
      { id: 'p', name: 'Piano', notes: tones, isDrum: false, program: 0, guess: 'keyboard' },
    ],
  };
}

describe('fitMarksToNotes', () => {
  it('moves coarse marks onto the attacks, with the tempo drifting through the song', async () => {
    const s = song();
    // the recording starts at 2 s and slows down from 1.0 to 1.15 s per beat
    const secOfBeat = (beat: number) => 2 + beat + (0.15 * (beat * beat)) / (2 * s.end);
    const frames = Math.ceil((secOfBeat(s.end) + 2) / 0.01);
    const bands: OnsetBands = [
      new Float32Array(frames),
      new Float32Array(frames),
      new Float32Array(frames),
    ];
    for (const n of s.parts[0].notes)
      bands[n.pitch === 36 ? 0 : 2][Math.round(secOfBeat(n.t) / 0.01)] = 1;
    for (const n of s.parts[1].notes) bands[1][Math.round(secOfBeat(n.t) / 0.01)] = 0.5;
    const truth = [...s.measureStarts, s.end].map((beat) => ({ beat, sec: secOfBeat(beat) }));
    // coarse marks up to 0.3 s off, the error wandering from bar to bar
    const coarse = truth.map((m, i) => ({ beat: m.beat, sec: m.sec + 0.3 * Math.sin(i / 2) }));

    const fitted = await fitMarksToNotes(s, coarse, bands);
    for (let i = 0; i < truth.length; i++)
      expect(Math.abs(fitted[i].sec - truth[i].sec)).toBeLessThan(0.03);
  });

  it('keeps the marks when the score has no notes', async () => {
    const empty = { ...song(), parts: [] };
    const marks = [
      { beat: 0, sec: 1 },
      { beat: 3, sec: 4 },
    ];
    const bands: OnsetBands = [new Float32Array(10), new Float32Array(10), new Float32Array(10)];
    expect(await fitMarksToNotes(empty, marks, bands)).toBe(marks);
  });
});
