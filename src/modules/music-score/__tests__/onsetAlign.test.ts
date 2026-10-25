import { describe, it, expect } from 'vitest';
import { alignRecording } from '../alignment';
import { ALIGN_SAMPLE_RATE } from '../dsp';
import type { OnsetBands } from '../noteFit';
import { estimateTempoAndStart, hasPitchedNotes, marksFromOnsets } from '../onsetAlign';
import type { ScoreNote, ScoreSong } from '../types';
import { barErrors, onlyParts, renderBand, type RenderOptions } from './bandFixtures';

const BARS = 40;

/**
 * A long song whose drums enter in bar 3: a kick/snare/hi-hat groove that
 * repeats for the whole song, a crash every four bars, a fill every eight and
 * one break bar — like a real drum part, mostly the same bar over and over.
 * A guitar plays throughout, so the recording sounds before the drums enter.
 */
function grooveSong(): ScoreSong {
  const drums: ScoreNote[] = [];
  const guitar: ScoreNote[] = [];
  const roots = [40, 43, 45, 38];
  for (let bar = 0; bar < BARS; bar++) {
    const b = bar * 4;
    for (const iv of [0, 7, 12]) guitar.push({ t: b, dur: 4, pitch: roots[bar % 4] + 12 + iv });
    if (bar < 2) continue;
    if (bar === 25) {
      drums.push({ t: b, dur: 4, pitch: 36 });
      continue;
    }
    const fill = bar % 8 === 1;
    for (let k = 0; k < (fill ? 4 : 8); k++) drums.push({ t: b + k / 2, dur: 0.5, pitch: 42 });
    drums.push({ t: b, dur: 1, pitch: 36 }, { t: b + 1, dur: 1, pitch: 38 });
    if (bar % 4 === 2) drums.push({ t: b, dur: 1, pitch: 49 });
    if (fill) for (let k = 0; k < 8; k++) drums.push({ t: b + 2 + k / 4, dur: 0.25, pitch: 38 });
    else
      drums.push(
        { t: b + 2, dur: 1, pitch: 36 },
        { t: b + 2.5, dur: 1, pitch: 36 },
        { t: b + 3, dur: 1, pitch: 38 },
      );
  }
  const part = (id: string, name: string, notes: ScoreNote[], isDrum: boolean) => ({
    id,
    name,
    notes,
    isDrum,
    program: null,
    guess: isDrum ? ('drums' as const) : ('guitar' as const),
  });
  return {
    title: 'groove',
    artist: '',
    source: 'groove',
    tempoMap: [{ beat: 0, bpm: 110 }],
    measureStarts: Array.from({ length: BARS }, (_, k) => k * 4),
    measureLengths: Array(BARS).fill(4),
    measureNumbers: Array.from({ length: BARS }, (_, k) => k + 1),
    end: BARS * 4,
    parts: [part('g', 'Guitar', guitar, false), part('d', 'Drums', drums, true)],
  };
}

/** Slower at first, speeding up, then slightly slower again: about 1.2 s of drift over the song. */
const drift: RenderOptions['factorAt'] = (b) => (b < 50 ? 1.05 : b < 110 ? 0.98 : 1.02);

describe('hasPitchedNotes', () => {
  it('ignores drum parts', () => {
    const song = grooveSong();
    expect(hasPitchedNotes(song)).toBe(true);
    expect(hasPitchedNotes(onlyParts(song, ['d']))).toBe(false);
  });
});

describe('estimateTempoAndStart', () => {
  it('finds tempo and start of a click track', async () => {
    // one click per beat at 120 bpm in the score, an accent every bar; the recording is 10 % slower and starts at 3.2 s
    const notes: ScoreNote[] = [];
    for (let b = 0; b < 64; b++) notes.push({ t: b, dur: 1, pitch: b % 4 ? 42 : 36 });
    const song: ScoreSong = {
      title: 'click',
      artist: '',
      source: 'click',
      tempoMap: [{ beat: 0, bpm: 120 }],
      measureStarts: Array.from({ length: 16 }, (_, k) => k * 4),
      measureLengths: Array(16).fill(4),
      measureNumbers: Array.from({ length: 16 }, (_, k) => k + 1),
      end: 64,
      parts: [{ id: 'd', name: 'Click', notes, isDrum: true, program: null, guess: 'drums' }],
    };
    const frames = 6000;
    const bands: OnsetBands = [
      new Float32Array(frames),
      new Float32Array(frames),
      new Float32Array(frames),
    ];
    for (let b = 0; b < 64; b++) {
      const k = Math.round((3.2 + b * 0.5 * 1.1) / 0.01);
      bands[b % 4 ? 2 : 0][k] = 1;
    }
    const est = await estimateTempoAndStart(song, bands);
    expect(est).not.toBeNull();
    expect(Math.abs(est!.ratio / 1.1 - 1)).toBeLessThan(0.02);
    const marks = await marksFromOnsets(song, bands);
    expect(marks).toHaveLength(17);
    marks
      .slice(0, 16)
      .forEach((m, k) => expect(Math.abs(m.sec - (3.2 + k * 2.2))).toBeLessThan(0.05));
  });
});

describe('alignRecording with a drums-only score', () => {
  it('follows a repeating groove with tempo drift through a long song', async () => {
    const song = grooveSong();
    const { samples, truth } = renderBand(song, { startSec: 4.1, factorAt: drift });
    expect(samples.length / ALIGN_SAMPLE_RATE).toBeGreaterThan(80);
    const { marks } = await alignRecording(onlyParts(song, ['d']), samples);
    expect(marks).toHaveLength(BARS + 1);
    expect(Math.abs(marks[0].sec - truth[0])).toBeLessThan(0.05);
    const e = barErrors(marks, truth);
    expect(e.max).toBeLessThan(0.05);
  });

  it('copes with a written tempo far from the recording', async () => {
    const song = grooveSong();
    const { samples, truth } = renderBand(song, { startSec: 1.7, factorAt: drift });
    // the score says 125 bpm, the band plays about 105-112
    const score = { ...onlyParts(song, ['d']), tempoMap: [{ beat: 0, bpm: 125 }] };
    const { marks } = await alignRecording(score, samples);
    expect(Math.abs(marks[0].sec - truth[0])).toBeLessThan(0.05);
    expect(barErrors(marks, truth).max).toBeLessThan(0.05);
  });
});
