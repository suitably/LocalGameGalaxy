import { ALIGN_SAMPLE_RATE, fft, hann } from './dsp';
import type { BarMark, ScoreSong } from './types';

const ONSET_FFT = 512;
const ONSET_HOP_SEC = 0.01;
const ONSET_SEARCH_SEC = 0.12;
const FIRST_BAR_SEARCH_SEC = 0.4;
const NOTE_SEARCH_SEC = 0.15;

/** Spectral-flux onset strength of the recording, one value per 10 ms. */
export function onsetEnvelope(samples: Float32Array): Float32Array {
  const hop = Math.round(ALIGN_SAMPLE_RATE * ONSET_HOP_SEC);
  const frames = Math.max(1, Math.floor(samples.length / hop) + 1);
  const half = ONSET_FFT / 2;
  const win = hann(ONSET_FFT);
  const re = new Float64Array(ONSET_FFT);
  const im = new Float64Array(ONSET_FFT);
  let last = new Float64Array(ONSET_FFT / 2);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < ONSET_FFT; i++) {
      re[i] = (samples[f * hop + i - half] ?? 0) * win[i];
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

/**
 * Moves each bar mark (within ±NOTE_SEARCH_SEC) so that the notes of the two
 * bars it bounds land on onsets in the recording. Uses every part, drums
 * included, because their attacks are the clearest timing evidence.
 */
export function refineMarksWithNotes(
  song: ScoreSong,
  marks: BarMark[],
  onsets: Float32Array,
): BarMark[] {
  const out = marks.map((m) => ({ ...m }));
  const onsetTimes = Array.from(
    new Set(song.parts.flatMap((p) => p.notes.map((n) => Math.round(n.t * 1000) / 1000))),
  ).sort((a, b) => a - b);
  const strength = (sec: number) => {
    const k = Math.round(sec / ONSET_HOP_SEC);
    let best = 0;
    for (let i = k - 2; i <= k + 2; i++) best = Math.max(best, onsets[i] ?? 0);
    return best;
  };
  const beatsBetween = (from: number, to: number) => {
    const res: number[] = [];
    let lo = 0;
    let hi = onsetTimes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (onsetTimes[mid] < from) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < onsetTimes.length && onsetTimes[i] < to; i++) res.push(onsetTimes[i]);
    return res;
  };
  const fit = (k: number, sec: number) => {
    let total = 0;
    const prev = out[k - 1];
    const next = out[k + 1];
    if (prev)
      for (const b of beatsBetween(prev.beat, out[k].beat))
        total += strength(
          prev.sec + ((b - prev.beat) / (out[k].beat - prev.beat)) * (sec - prev.sec),
        );
    if (next)
      for (const b of beatsBetween(out[k].beat, next.beat))
        total += strength(sec + ((b - out[k].beat) / (next.beat - out[k].beat)) * (next.sec - sec));
    return total;
  };
  const steps = Math.round(NOTE_SEARCH_SEC / ONSET_HOP_SEC);
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k < out.length; k++) {
      const lower = k > 0 ? out[k - 1].sec + 0.05 : 0;
      const upper = k + 1 < out.length ? out[k + 1].sec - 0.05 : Infinity;
      let bestSec = out[k].sec;
      let bestFit = fit(k, bestSec);
      for (let d = -steps; d <= steps; d++) {
        const sec = out[k].sec + d * ONSET_HOP_SEC;
        if (sec < lower || sec > upper) continue;
        const f = fit(k, sec) - Math.abs(d) * 1e-6;
        if (f > bestFit) {
          bestFit = f;
          bestSec = sec;
        }
      }
      out[k].sec = bestSec;
    }
  }
  return out;
}
