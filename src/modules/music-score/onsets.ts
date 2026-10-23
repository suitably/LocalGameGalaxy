import { fft, frameCentre, frameCount, hann } from './dsp';
import type { BarMark } from './types';

const ONSET_FFT = 512;
const ONSET_HOP_SEC = 0.01;
const ONSET_SEARCH_SEC = 0.12;
const FIRST_BAR_SEARCH_SEC = 0.4;

/** Spectral-flux onset strength of the recording, one value per 10 ms. */
export function onsetEnvelope(samples: Float32Array): Float32Array {
  const frames = frameCount(samples.length, ONSET_HOP_SEC);
  const half = ONSET_FFT / 2;
  const win = hann(ONSET_FFT);
  const re = new Float64Array(ONSET_FFT);
  const im = new Float64Array(ONSET_FFT);
  let last = new Float64Array(ONSET_FFT / 2);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const centre = frameCentre(f, ONSET_HOP_SEC);
    for (let i = 0; i < ONSET_FFT; i++) {
      re[i] = (samples[centre + i - half] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float64Array(ONSET_FFT / 2);
    let flux = 0;
    for (let k = 1; k < ONSET_FFT / 2; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      flux += Math.max(0, mag[k] - last[k]);
    }
    out[f] = flux;
    last = mag;
  }
  return out;
}

/** Moves each mark onto the strongest nearby onset, preferring closer ones; weak evidence keeps the mark. */
export function refineMarksWithOnsets(marks: BarMark[], onsets: Float32Array): BarMark[] {
  const radius = Math.round(ONSET_SEARCH_SEC / ONSET_HOP_SEC);
  const out = marks.map((mk) => {
    const c = Math.round(mk.sec / ONSET_HOP_SEC);
    const lo = Math.max(0, c - radius);
    const hi = Math.min(onsets.length - 1, c + radius);
    if (hi <= lo) return mk;
    const window = Array.from(onsets.subarray(lo, hi + 1)).sort((a, b) => a - b);
    const median = window[window.length >> 1];
    let best = -1;
    let bestScore = 0;
    for (let k = lo; k <= hi; k++) {
      const score = onsets[k] * (1 - (0.5 * Math.abs(k - c)) / radius);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    }
    if (best < 0 || onsets[best] < median * 1.8) return mk;
    return { beat: mk.beat, sec: best * ONSET_HOP_SEC };
  });
  if (out.length) out[0] = firstOnset(out[0], onsets);
  for (let k = 1; k < out.length; k++) {
    if (out[k].sec <= out[k - 1].sec + 0.05) out[k] = { ...out[k], sec: out[k - 1].sec + 0.05 };
  }
  return out;
}

/**
 * The warp is least reliable where the music starts (silence or noise before it),
 * so bar 1 snaps to the first clear onset within a wider window.
 */
function firstOnset(mark: BarMark, onsets: Float32Array): BarMark {
  const sorted = Array.from(onsets).sort((a, b) => a - b);
  const strong = Math.max(
    sorted[Math.floor(sorted.length * 0.9)] ?? 0,
    (sorted[sorted.length >> 1] ?? 0) * 3,
  );
  const radius = Math.round(FIRST_BAR_SEARCH_SEC / ONSET_HOP_SEC);
  const c = Math.round(mark.sec / ONSET_HOP_SEC);
  for (let k = Math.max(0, c - radius); k <= Math.min(onsets.length - 1, c + radius); k++) {
    if (
      onsets[k] >= strong &&
      onsets[k] >= (onsets[k - 1] ?? 0) &&
      onsets[k] >= (onsets[k + 1] ?? 0)
    ) {
      return { beat: mark.beat, sec: k * ONSET_HOP_SEC };
    }
  }
  return mark;
}
