import { ALIGN_SAMPLE_RATE } from '../dsp';
import type { ScoreNote, ScorePart, ScoreSong } from '../types';

const BARS = 12;
const BPM = 110;

/** Deterministic noise so renders (and test results) do not change between runs. */
function noise(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
}

const part = (id: string, name: string, notes: ScoreNote[], isDrum = false): ScorePart => ({
  id,
  name,
  notes,
  isDrum,
  program: null,
  guess: isDrum ? 'drums' : name === 'Bass' ? 'bass' : name === 'Voice' ? 'vocals' : 'guitar',
});

/**
 * A rock-style song: a syncopated power-chord riff (attacks on the "and" of beats
 * where the snare is silent), bass on the roots, kick/snare/hi-hat and a sung
 * melody on long notes. Twelve 4/4 bars, the chord changes every bar.
 */
export function bandSong(): ScoreSong {
  const roots = [40, 43, 45, 38, 41, 40, 47, 45, 43, 38, 45, 40];
  const riff = [0, 1.5, 2.5, 3, 3.5];
  const guitar: ScoreNote[] = [];
  const bass: ScoreNote[] = [];
  const drums: ScoreNote[] = [];
  const voice: ScoreNote[] = [];
  roots.forEach((root, bar) => {
    const b = bar * 4;
    riff.forEach((r, i) => {
      const dur = (riff[i + 1] ?? 4) - r;
      for (const iv of [0, 7, 12]) guitar.push({ t: b + r, dur, pitch: root + 12 + iv });
    });
    bass.push({ t: b, dur: 1.5, pitch: root }, { t: b + 2.5, dur: 1.5, pitch: root });
    for (let k = 0; k < 8; k++) drums.push({ t: b + k / 2, dur: 0.5, pitch: 42 });
    drums.push({ t: b, dur: 1, pitch: 36 }, { t: b + 2, dur: 1, pitch: 36 });
    drums.push({ t: b + 1, dur: 1, pitch: 38 }, { t: b + 3, dur: 1, pitch: 38 });
    voice.push(
      { t: b, dur: 2, pitch: 64 + (bar % 3) * 2 },
      { t: b + 2, dur: 2, pitch: 69 - (bar % 4) },
    );
  });
  return {
    title: 'band',
    artist: '',
    source: 'band',
    tempoMap: [{ beat: 0, bpm: BPM }],
    measureStarts: roots.map((_, k) => k * 4),
    measureLengths: roots.map(() => 4),
    measureNumbers: roots.map((_, k) => k + 1),
    end: BARS * 4,
    parts: [
      part('g', 'Guitar', guitar),
      part('b', 'Bass', bass),
      part('d', 'Drums', drums, true),
      part('v', 'Voice', voice),
    ],
  };
}

/** The same song with only the named parts (a guitar-only MuseScore download, say). */
export function onlyParts(song: ScoreSong, ids: string[]): ScoreSong {
  return { ...song, parts: song.parts.filter((p) => ids.includes(p.id)) };
}

export interface RenderOptions {
  /** Silence before bar 1, in seconds. */
  startSec: number;
  /** Tempo factor (>1 is slower) of the beat starting at `beat`. */
  factorAt: (beat: number) => number;
  /** Detuning of every pitched part in cents (−100 is a half-step down, as in Eb tuning). */
  cents?: number;
}

/** Plucked string (Karplus-Strong) through soft clipping, like a driven electric guitar. */
function pluck(
  out: Float32Array,
  at: number,
  len: number,
  hz: number,
  gain: number,
  rnd: () => number,
) {
  const sr = ALIGN_SAMPLE_RATE;
  const period = Math.max(2, Math.round(sr / hz));
  const buf = Float32Array.from({ length: period }, () => rnd());
  for (let i = 0; i < len && at + i < out.length; i++) {
    const k = i % period;
    const v = buf[k];
    buf[k] = 0.498 * (v + buf[(k + 1) % period]);
    out[at + i] += gain * Math.tanh(3 * v) * Math.min(1, (len - i) / 200);
  }
}

function drum(out: Float32Array, at: number, key: number, rnd: () => number) {
  const sr = ALIGN_SAMPLE_RATE;
  const len = Math.round(sr * (key === 42 ? 0.05 : 0.25));
  for (let i = 0; i < len && at + i < out.length; i++) {
    const t = i / sr;
    let v: number;
    if (key === 36)
      v = Math.sin(2 * Math.PI * (55 + 80 * Math.exp(-t * 30)) * t) * Math.exp(-t * 12);
    else if (key === 38)
      v = (0.7 * rnd() + 0.4 * Math.sin(2 * Math.PI * 190 * t)) * Math.exp(-t * 18);
    else v = 0.25 * rnd() * Math.exp(-t * 60);
    out[at + i] += 0.5 * v;
  }
}

/** Renders the parts with a drifting tempo, returning the samples and the true start of every bar. */
export function renderBand(song: ScoreSong, opts: RenderOptions) {
  const sr = ALIGN_SAMPLE_RATE;
  const beatSec: number[] = [];
  let t = opts.startSec;
  for (let b = 0; b <= song.end; b++) {
    beatSec.push(t);
    t += (60 / BPM) * opts.factorAt(b);
  }
  const secOf = (beat: number) => {
    const b = Math.min(song.end - 1, Math.floor(beat));
    return beatSec[b] + (beat - b) * (beatSec[b + 1] - beatSec[b]);
  };
  const out = new Float32Array(Math.ceil((t + 1) * sr));
  const rnd = noise(7);
  const detune = 2 ** ((opts.cents ?? 0) / 1200);
  for (const p of song.parts) {
    for (const n of p.notes) {
      const at = Math.round(secOf(n.t) * sr);
      const len = Math.round((secOf(n.t + n.dur) - secOf(n.t)) * sr);
      const hz = 440 * 2 ** ((n.pitch - 69) / 12) * detune;
      if (p.isDrum) drum(out, at, n.pitch, rnd);
      else if (p.guess === 'vocals') {
        for (let i = 0; i < len && at + i < out.length; i++) {
          const vib = 1 + 0.006 * Math.sin((2 * Math.PI * 5.5 * i) / sr);
          const env = Math.min(1, i / 400, (len - i) / 400);
          out[at + i] += 0.12 * env * Math.sin((2 * Math.PI * hz * vib * i) / sr);
        }
      } else pluck(out, at, len, hz, p.guess === 'bass' ? 0.25 : 0.08, rnd);
    }
  }
  return { samples: out, truth: song.measureStarts.map(secOf) };
}

/** Largest and median distance (s) between found and true bar starts. */
export function barErrors(marks: { sec: number }[], truth: number[]) {
  const errs = truth.map((sec, i) => Math.abs(marks[i].sec - sec)).sort((a, b) => a - b);
  return { max: errs[errs.length - 1], median: errs[errs.length >> 1] };
}
