import { ALIGN_SAMPLE_RATE, fft, frameCentre, frameCount, hann } from './dsp';
import type { AlignProgress } from './alignment';
import type { ChromaOnsets } from './chromaOnsets';
import { noteEvents, type OnsetBands } from './noteFit';
import { beatToSec } from './timing';
import { pitchClassOf } from './tuning';
import type { ScoreSong } from './types';

/** Frame hop of the coarse match (s). */
export const HOP_SEC = 0.1;
const CHROMA_FFT = 4096;
const SILENT_COST = 0.35;
/** Onset vectors: 12 pitch classes, then low band (kick, bass) and high band (snare, cymbals). */
const ONSET_DIMS = 14;
/** Share of the frame cost that comes from attacks; the rest is harmony (chroma). */
const ONSET_SHARE = 0.3;
/** Onset cost of a score frame without attacks: neither evidence for nor against a match. */
const ONSET_NEUTRAL = 0.6;

/** Frame features on the 0.1 s grid: chroma rows of 12 and onset rows of ONSET_DIMS, both unit length. */
export interface Features {
  chroma: Float32Array;
  onsets: Float32Array;
  frames: number;
}

function normaliseRows(m: Float32Array, rows: number, dims: number): Uint8Array {
  const empty = new Uint8Array(rows);
  for (let r = 0; r < rows; r++) {
    let norm = 0;
    for (let c = 0; c < dims; c++) norm += m[r * dims + c] ** 2;
    if (norm === 0) empty[r] = 1;
    norm = Math.sqrt(norm) + 1e-9;
    for (let c = 0; c < dims; c++) m[r * dims + c] /= norm;
  }
  return empty;
}

/** Pitch-class profile (chroma) of the recording, one row of 12 per 0.1 s, for a recording tuned `cents` off A = 440 Hz. */
export async function audioChroma(samples: Float32Array, onProgress?: AlignProgress, cents = 0) {
  const sr = ALIGN_SAMPLE_RATE;
  // Frame f is centred on f * HOP_SEC so frame times line up with the score grid.
  const frames = frameCount(samples.length, HOP_SEC);
  const half = CHROMA_FFT / 2;
  const win = hann(CHROMA_FFT);
  const pcOfBin = new Int8Array(CHROMA_FFT / 2).fill(-1);
  for (let k = 1; k < CHROMA_FFT / 2; k++) {
    const f = (k * sr) / CHROMA_FFT;
    if (f > 60 && f < 2000) pcOfBin[k] = pitchClassOf(f, cents);
  }
  const out = new Float32Array(frames * 12);
  const re = new Float64Array(CHROMA_FFT);
  const im = new Float64Array(CHROMA_FFT);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, HOP_SEC);
    for (let i = 0; i < CHROMA_FFT; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 1; k < CHROMA_FFT / 2; k++) {
      const pc = pcOfBin[k];
      if (pc >= 0) out[f * 12 + pc] += Math.log1p(10 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
    }
    if (onProgress && f % 300 === 0) await onProgress('analyse', f / frames);
  }
  normaliseRows(out, frames, 12);
  return { chroma: out, frames };
}

/** Strongest attack of each kind within each 0.1 s frame of the recording. */
export function audioOnsetRows(
  chroma: ChromaOnsets,
  bands: OnsetBands,
  frames: number,
): Float32Array {
  const out = new Float32Array(frames * ONSET_DIMS);
  const per = Math.round(HOP_SEC / 0.01);
  const envs = [...chroma, bands[0], bands[2]];
  for (let f = 0; f < frames; f++) {
    const lo = Math.max(0, f * per - (per >> 1));
    for (let d = 0; d < ONSET_DIMS; d++) {
      const env = envs[d];
      let v = 0;
      for (let k = lo; k < Math.min(env.length, lo + per); k++) if (env[k] > v) v = env[k];
      out[f * ONSET_DIMS + d] = v;
    }
  }
  normaliseRows(out, frames, ONSET_DIMS);
  return out;
}

/**
 * Pitch-class profile and attacks the score predicts, on the same 0.1 s grid.
 * Drums count only as attacks. A tone adds its fifth (third partial) and fades
 * after its attack, as plucked and struck strings do.
 */
export function scoreFeatures(song: ScoreSong): Features & { silent: Uint8Array } {
  const frames = Math.floor(beatToSec(song.tempoMap, song.end) / HOP_SEC) + 1;
  const chroma = new Float32Array(frames * 12);
  for (const part of song.parts) {
    if (part.isDrum) continue;
    for (const n of part.notes) {
      const a = Math.floor(beatToSec(song.tempoMap, n.t) / HOP_SEC);
      const b = Math.max(a + 1, Math.floor(beatToSec(song.tempoMap, n.t + n.dur) / HOP_SEC));
      for (let i = a; i < Math.min(frames, b); i++) {
        const w = Math.max(0.3, Math.exp(-(i - a) * HOP_SEC));
        chroma[i * 12 + (n.pitch % 12)] += w;
        chroma[i * 12 + ((n.pitch + 7) % 12)] += 0.33 * w;
      }
    }
  }
  const onsets = new Float32Array(frames * ONSET_DIMS);
  for (const e of noteEvents(song)) {
    const f = Math.round(beatToSec(song.tempoMap, e.beat) / HOP_SEC);
    if (f >= frames) continue;
    const row = f * ONSET_DIMS;
    for (let c = 0; c < 12; c++) onsets[row + c] = Math.max(onsets[row + c], e.pcs[c]);
    onsets[row + 12] = Math.max(onsets[row + 12], e.weight[0]);
    onsets[row + 13] = Math.max(onsets[row + 13], e.weight[2]);
  }
  const silent = normaliseRows(chroma, frames, 12);
  normaliseRows(onsets, frames, ONSET_DIMS);
  return { chroma, onsets, frames, silent };
}

/** The score features with every pitch class moved up by `semitones`. */
export function transpose<T extends Features>(f: T, semitones: number): T {
  const s = ((semitones % 12) + 12) % 12;
  if (!s) return f;
  const chroma = new Float32Array(f.chroma.length);
  const onsets = new Float32Array(f.onsets);
  for (let r = 0; r < f.frames; r++) {
    for (let c = 0; c < 12; c++) {
      chroma[r * 12 + ((c + s) % 12)] = f.chroma[r * 12 + c];
      onsets[r * ONSET_DIMS + ((c + s) % 12)] = f.onsets[r * ONSET_DIMS + c];
    }
  }
  return { ...f, chroma, onsets };
}

/** Averages `k` frames into one (rows renormalised): a cheap grid for comparing shifts. */
export function decimate<T extends Features & { silent?: Uint8Array }>(f: T, k: number): T {
  const frames = Math.ceil(f.frames / k);
  const chroma = new Float32Array(frames * 12);
  const onsets = new Float32Array(frames * ONSET_DIMS);
  for (let r = 0; r < f.frames; r++) {
    const q = Math.floor(r / k);
    for (let c = 0; c < 12; c++) chroma[q * 12 + c] += f.chroma[r * 12 + c];
    for (let c = 0; c < ONSET_DIMS; c++)
      onsets[q * ONSET_DIMS + c] = Math.max(
        onsets[q * ONSET_DIMS + c],
        f.onsets[r * ONSET_DIMS + c],
      );
  }
  const silent = normaliseRows(chroma, frames, 12);
  normaliseRows(onsets, frames, ONSET_DIMS);
  return { ...f, chroma, onsets, frames, silent };
}

/** Cost (0…1) of pairing score frame i with recording frame j: harmony plus attacks. */
export function frameCost(score: Features & { silent: Uint8Array }, audio: Features) {
  return (i: number, j: number) => {
    let chroma = SILENT_COST;
    if (!score.silent[i]) {
      let dot = 0;
      for (let c = 0; c < 12; c++) dot += score.chroma[i * 12 + c] * audio.chroma[j * 12 + c];
      chroma = 1 - dot;
    }
    let onset = ONSET_NEUTRAL;
    let any = 0;
    let dot = 0;
    for (let c = 0; c < ONSET_DIMS; c++) {
      const s = score.onsets[i * ONSET_DIMS + c];
      any += s;
      dot += s * audio.onsets[j * ONSET_DIMS + c];
    }
    if (any > 0) onset = 1 - dot;
    return (1 - ONSET_SHARE) * chroma + ONSET_SHARE * onset;
  };
}
