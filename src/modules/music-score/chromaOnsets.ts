import { ALIGN_SAMPLE_RATE, fft, frameCentre, frameCount, hann } from './dsp';
import { pitchClassOf } from './tuning';

export const CHROMA_ONSET_HOP_SEC = 0.01;
const FFT_SIZE = 1024;
/** Below this a 1024-point bin is wider than a semitone; low notes still show up through their overtones. */
const MIN_HZ = 180;
const MAX_HZ = 3000;
const NORM_RADIUS = 200;
const NORM_BLOCK = 50;
/** As in `onsetBands`, but the longer window peaks further ahead of an attack (measured). */
const WINDOW_LAG_SEC = 0.035;

/** Pitch-specific onset strength per 10 ms, one envelope per pitch class (C = 0). */
export type ChromaOnsets = Float32Array[];

/**
 * Where each pitch class starts sounding: spectral flux folded onto the 12
 * pitch classes, minus its mean over all classes. A drum hit or a noisy
 * strum raises every class alike and cancels; a note raises its own class
 * (and the fifth above, its third partial). Scaled so the local 98th
 * percentile of the strongest class is 1.
 */
export function chromaOnsets(samples: Float32Array, cents = 0): ChromaOnsets {
  const sr = ALIGN_SAMPLE_RATE;
  const frames = frameCount(samples.length, CHROMA_ONSET_HOP_SEC);
  const half = FFT_SIZE / 2;
  const win = hann(FFT_SIZE);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const pcOfBin = new Int8Array(half).fill(-1);
  const binsPerPc = new Float64Array(12);
  for (let k = 1; k < half; k++) {
    const hz = (k * sr) / FFT_SIZE;
    if (hz < MIN_HZ || hz > MAX_HZ) continue;
    pcOfBin[k] = pitchClassOf(hz, cents);
    binsPerPc[pcOfBin[k]]++;
  }
  const out: ChromaOnsets = Array.from({ length: 12 }, () => new Float32Array(frames));
  const peak = new Float32Array(frames);
  const flux = new Float64Array(12);
  const lag = Math.round(WINDOW_LAG_SEC * sr);
  let last = new Float64Array(half);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, CHROMA_ONSET_HOP_SEC) - lag;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    flux.fill(0);
    const mag = new Float64Array(half);
    for (let k = 1; k < half; k++) {
      mag[k] = Math.log1p(100 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
      const pc = pcOfBin[k];
      if (pc >= 0) flux[pc] += Math.max(0, mag[k] - last[k]);
    }
    last = mag;
    let mean = 0;
    for (let c = 0; c < 12; c++) {
      flux[c] /= binsPerPc[c] || 1;
      mean += flux[c] / 12;
    }
    for (let c = 0; c < 12; c++) {
      const v = Math.max(0, flux[c] - mean);
      out[c][f] = v;
      if (v > peak[f]) peak[f] = v;
    }
  }
  // quiet passages count as much as loud ones, but near-silence is not blown up to full scale
  const sorted = Array.from(peak).sort((a, b) => a - b);
  const floor = 0.1 * sorted[Math.floor(sorted.length * 0.98)] + 1e-9;
  for (let i = 0; i < frames; i += NORM_BLOCK) {
    const near = Array.from(
      peak.subarray(Math.max(0, i - NORM_RADIUS), Math.min(frames, i + NORM_RADIUS)),
    ).sort((a, b) => a - b);
    const scale = 1 / Math.max(floor, near[Math.floor(near.length * 0.98)]);
    for (let j = i; j < Math.min(frames, i + NORM_BLOCK); j++)
      for (let c = 0; c < 12; c++) out[c][j] = Math.min(1.5, out[c][j] * scale);
  }
  return out;
}
