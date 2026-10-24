import { ALIGN_SAMPLE_RATE, fft, hann } from './dsp';

const TUNING_FFT = 8192;
const TUNING_HOP_SEC = 0.5;
const MIN_HZ = 100;
const MAX_HZ = 1500;
const PEAKS_PER_FRAME = 8;

/**
 * How far the recording's pitch sits from A = 440 Hz, in cents (−50…50): the
 * magnitude-weighted circular mean of the deviation of spectral peaks from the
 * nearest semitone. A band tuned a whole half-step down reads as 0 here; that
 * shift is found by trying rotated pitch classes during the alignment.
 */
export function estimateTuningCents(samples: Float32Array): number {
  const sr = ALIGN_SAMPLE_RATE;
  const hop = Math.round(TUNING_HOP_SEC * sr);
  const win = hann(TUNING_FFT);
  const re = new Float64Array(TUNING_FFT);
  const im = new Float64Array(TUNING_FFT);
  const lo = Math.ceil((MIN_HZ * TUNING_FFT) / sr);
  const hi = Math.floor((MAX_HZ * TUNING_FFT) / sr);
  const mag = new Float64Array(hi + 2);
  let x = 0;
  let y = 0;
  for (let start = 0; start + TUNING_FFT <= samples.length; start += hop) {
    for (let i = 0; i < TUNING_FFT; i++) {
      re[i] = samples[start + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = lo - 1; k <= hi + 1; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    const peaks: { k: number; m: number }[] = [];
    for (let k = lo; k <= hi; k++) {
      if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1]) peaks.push({ k, m: mag[k] });
    }
    peaks.sort((a, b) => b.m - a.m);
    for (const { k, m } of peaks.slice(0, PEAKS_PER_FRAME)) {
      // parabolic interpolation on log magnitudes for a sub-bin peak position
      const a = Math.log(mag[k - 1] + 1e-12);
      const b = Math.log(m + 1e-12);
      const c = Math.log(mag[k + 1] + 1e-12);
      const den = a - 2 * b + c;
      const bin = k + (den < 0 ? (0.5 * (a - c)) / den : 0);
      const midi = 69 + 12 * Math.log2((bin * sr) / TUNING_FFT / 440);
      const angle = 2 * Math.PI * (midi - Math.round(midi));
      const w = Math.log1p(m);
      x += w * Math.cos(angle);
      y += w * Math.sin(angle);
    }
  }
  if (x === 0 && y === 0) return 0;
  return (Math.atan2(y, x) / (2 * Math.PI)) * 100;
}

/** MIDI pitch class (0–11) a frequency belongs to in a recording tuned `cents` away from A = 440 Hz. */
export function pitchClassOf(hz: number, cents: number): number {
  const midi = 69 + 12 * Math.log2(hz / 440) - cents / 100;
  return ((Math.round(midi) % 12) + 12) % 12;
}
