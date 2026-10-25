import { fft } from './dsp';
import type { AlignProgress } from './alignment';
import { noteEvents, type NoteEvent, type OnsetBands } from './noteFit';
import { beatToSec } from './timing';
import type { BarMark, ScoreSong } from './types';

/** Hop of the band onset envelopes (`onsetFeatures`). */
const HOP_SEC = 0.01;
/** Cells of the global search grid (20 ms): coarse enough to be fast, fine enough to find bar 1. */
const GRID = 2;
/** Recording seconds per score second tried by the global search (log-spaced). */
const MIN_RATIO = 0.7;
const MAX_RATIO = 1.4;
const RATIO_STEP = 1.01;
/** How far before the recording starts bar 1 may sit (a recording cut into a silent count-in). */
const LEAD_SEC = 2;
/** Cap of one onset value: a single loud attack must not outvote a whole groove. */
const MAX_ONSET = 1.5;
/** Largest tempo change of one bar against the global tempo (the bar-by-bar path may drift further over several bars). */
const MAX_BAR_DEVIATION = 0.1;
/** Cost of a bar's tempo deviating from the global one, per 100 % (10 % costs 2, about two clear hits). */
const TEMPO_COST = 20;

/** True when any non-drum part has notes: only then can the chroma alignment find a match. */
export function hasPitchedNotes(song: ScoreSong): boolean {
  return song.parts.some((p) => !p.isDrum && p.notes.length > 0);
}

interface Hit {
  /** Score time (s at the written tempo). */
  sec: number;
  weight: NoteEvent['weight'];
  total: number;
}

function scoreHits(song: ScoreSong): Hit[] {
  return noteEvents(song)
    .map((e) => ({
      sec: beatToSec(song.tempoMap, e.beat),
      weight: e.weight,
      total: e.weight[0] + e.weight[1] + e.weight[2],
    }))
    .filter((h) => h.total > 0);
}

/** Envelope pooled onto the search grid (capped) and widened by `radius` cells, so attacks a little off still count. */
function gridCurve(env: Float32Array, cells: number, radius = 1): Float64Array {
  const pooled = new Float64Array(cells);
  for (let i = 0; i < env.length; i++) {
    const c = Math.floor(i / GRID);
    // capped: the band normalisation blows up the first attacks after silence
    if (c < cells && env[i] > pooled[c]) pooled[c] = Math.min(MAX_ONSET, env[i]);
  }
  return pooled.map((_, c) => {
    let v = 0;
    for (let d = -radius; d <= radius; d++) v = Math.max(v, pooled[c + d] ?? 0);
    return v;
  });
}

/**
 * Global tempo ratio and start of bar 1 in the recording: cross-correlation
 * (via FFT) of the score's attacks, stretched by every ratio from 0.7 to 1.4,
 * with the recording's band onsets. The whole song votes, so a repeated
 * groove finds its place through fills, breaks and the sections around it.
 */
export async function estimateTempoAndStart(
  song: ScoreSong,
  bands: OnsetBands,
  onProgress?: AlignProgress,
): Promise<{ ratio: number; startSec: number } | null> {
  const hits = scoreHits(song);
  if (!hits.length) return null;
  const cellSec = HOP_SEC * GRID;
  const lead = Math.round(LEAD_SEC / cellSec);
  const audioCells = Math.ceil(bands[0].length / GRID);
  const scoreSpan = hits[hits.length - 1].sec;
  const maxScoreCells = Math.ceil((scoreSpan * MAX_RATIO) / cellSec) + 1;
  let n = 1;
  while (n < lead + audioCells + maxScoreCells) n <<= 1;
  const used = ([0, 1, 2] as const).filter((b) => hits.some((h) => h.weight[b] > 0));
  // recording spectra, with the lead of silence in front so bar 1 may start before 0 s
  const audio = used.map((b) => {
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    re.set(gridCurve(bands[b], audioCells), lead);
    fft(re, im);
    return { re, im };
  });
  const ratios: number[] = [];
  for (let r = MIN_RATIO; r <= MAX_RATIO + 1e-9; r *= RATIO_STEP) ratios.push(r);
  let best = { score: -Infinity, ratio: 1, startSec: 0 };
  const sumRe = new Float64Array(n);
  const sumIm = new Float64Array(n);
  for (let ri = 0; ri < ratios.length; ri++) {
    const ratio = ratios[ri];
    sumRe.fill(0);
    sumIm.fill(0);
    used.forEach((b, u) => {
      const re = new Float64Array(n);
      const im = new Float64Array(n);
      for (const h of hits) re[Math.round((h.sec * ratio) / cellSec)] += h.weight[b];
      fft(re, im);
      const a = audio[u];
      // conj(score) * audio, summed over bands: one inverse transform for all
      for (let k = 0; k < n; k++) {
        sumRe[k] += re[k] * a.re[k] + im[k] * a.im[k];
        sumIm[k] += re[k] * a.im[k] - im[k] * a.re[k];
      }
    });
    // inverse FFT through the forward one: real part of fft(conj(Z)) / n
    for (let k = 0; k < n; k++) sumIm[k] = -sumIm[k];
    fft(sumRe, sumIm);
    for (let o = 0; o < lead + audioCells; o++) {
      if (sumRe[o] > best.score) best = { score: sumRe[o], ratio, startSec: (o - lead) * cellSec };
    }
    if (onProgress && ri % 10 === 0) await onProgress('match', ri / ratios.length);
  }
  return { ratio: best.ratio, startSec: best.startSec };
}

/**
 * Bar marks for a score without pitched parts (drums only). The global tempo
 * comes from `estimateTempoAndStart`; then every bar start is placed jointly
 * (Viterbi over bar start positions on the 20 ms grid): each bar earns the
 * band onsets under its own attacks, and a bar may be at most 10 % faster or
 * slower than the global tempo, which costs. The start in the recording is
 * free, bars without attacks (an intro without drums, a break) just follow the
 * tempo. A drift of the band thus accumulates bar by bar, and a groove that
 * repeats all song long is placed by its fills and breaks as a whole.
 * The result is coarse (tens of ms); `fitMarksToNotes` refines it.
 */
export async function marksFromOnsets(
  song: ScoreSong,
  bands: OnsetBands,
  onProgress?: AlignProgress,
): Promise<BarMark[]> {
  const tm = song.tempoMap;
  const starts = song.measureStarts;
  const bars = starts.length;
  const barSec = starts.map((b) => beatToSec(tm, b)).concat(beatToSec(tm, song.end));
  const global = await estimateTempoAndStart(song, bands, onProgress);
  if (!global || !bars) {
    return starts
      .map((beat, k) => ({ beat, sec: barSec[k] }))
      .concat({
        beat: song.end,
        sec: barSec[bars],
      });
  }
  const { ratio } = global;
  const cellSec = HOP_SEC * GRID;
  const lead = Math.round(LEAD_SEC / cellSec);
  const audioCells = Math.ceil(bands[0].length / GRID);
  const cells = lead + audioCells;
  // state s: the bar starts at (s - lead) cells
  const curves = bands.map((env) => {
    const c = new Float64Array(cells);
    c.set(gridCurve(env, audioCells, 2), lead);
    return c;
  });
  const hits = scoreHits(song);
  let h0 = 0;
  const emission = (k: number) => {
    const e = new Float64Array(cells);
    while (h0 < hits.length && hits[h0].sec < barSec[k] - 1e-6) h0++;
    for (let i = h0; i < hits.length && hits[i].sec < barSec[k + 1] - 1e-6; i++) {
      const h = hits[i];
      const off = Math.round((ratio * (h.sec - barSec[k])) / cellSec);
      for (let b = 0; b < 3; b++) {
        const w = h.weight[b];
        if (!w) continue;
        const curve = curves[b];
        for (let s = 0; s + off < cells; s++) e[s] += w * curve[s + off];
      }
    }
    return e;
  };
  let score = emission(0);
  const back: Int32Array[] = [];
  for (let k = 1; k < bars; k++) {
    const span = (ratio * (barSec[k] - barSec[k - 1])) / cellSec;
    const lo = Math.max(1, Math.floor(span * (1 - MAX_BAR_DEVIATION)));
    const hi = Math.ceil(span * (1 + MAX_BAR_DEVIATION));
    const e = emission(k);
    const next = new Float64Array(cells).fill(-Infinity);
    const from = new Int32Array(cells).fill(-1);
    for (let s = lo; s < cells; s++) {
      let best = -Infinity;
      let arg = -1;
      for (let d = lo; d <= Math.min(hi, s); d++) {
        const v = score[s - d] - TEMPO_COST * Math.abs(d / span - 1);
        if (v > best) {
          best = v;
          arg = s - d;
        }
      }
      if (arg >= 0) {
        next[s] = best + e[s];
        from[s] = arg;
      }
    }
    back.push(from);
    score = next;
    if (onProgress && k % 10 === 0) await onProgress('match', k / bars);
  }
  let s = 0;
  for (let i = 1; i < cells; i++) if (score[i] > score[s]) s = i;
  const pos = new Int32Array(bars);
  pos[bars - 1] = s;
  for (let k = bars - 1; k > 0; k--) pos[k - 1] = s = back[k - 1][s];
  const marks = starts.map((beat, k) => ({ beat, sec: (pos[k] - lead) * cellSec }));
  const prev = bars > 1 ? marks[bars - 2] : null;
  const last = marks[bars - 1];
  const local = prev ? (last.sec - prev.sec) / (barSec[bars - 1] - barSec[bars - 2]) : ratio;
  marks.push({ beat: song.end, sec: last.sec + local * (barSec[bars] - barSec[bars - 1]) });
  return marks;
}
