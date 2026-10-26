import { drumMatchRank, type DrumVoice } from '../../../../modules/music-score';
import { lowerBound, type Judgement, type StageNote } from './charts';

export const PERFECT_SEC = 0.06;
export const GOOD_SEC = 0.14;
/** Learn mode: how early a hit may come, and how long the song runs on past a note before it waits. */
export const LEARN_EARLY_SEC = 0.25;
export const LEARN_LATE_SEC = GOOD_SEC;
const POINTS = { perfect: 100, learn: 100, good: 60, miss: 0 } as const;
const WEIGHT = { perfect: 1, learn: 1, good: 0.6, miss: 0 } as const;
const COMBO_PER_MULTIPLIER = 8;
const MAX_MULTIPLIER = 4;

export interface SectionStat {
  weight: number;
  count: number;
  /** Wrong notes played while learn mode waited. */
  errors: number;
}

export interface PlayerStats {
  score: number;
  combo: number;
  maxCombo: number;
  judged: number;
  weightSum: number;
  sections: SectionStat[];
}

export const newStats = (sectionCount: number): PlayerStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  judged: 0,
  weightSum: 0,
  sections: Array.from({ length: sectionCount }, () => ({ weight: 0, count: 0, errors: 0 })),
});

export const multiplier = (combo: number) =>
  Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / COMBO_PER_MULTIPLIER));

/** Records a judgement for a note in `section`; mutates the stats. */
export function recordJudgement(stats: PlayerStats, section: number, kind: Judgement): void {
  const w = WEIGHT[kind];
  stats.judged++;
  stats.weightSum += w;
  const s = stats.sections[section];
  if (s) {
    s.count++;
    s.weight += w;
  }
  if (w > 0) {
    stats.combo++;
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
    stats.score += POINTS[kind] * multiplier(stats.combo);
  } else stats.combo = 0;
}

export const accuracy = (stats: PlayerStats) => (stats.judged ? stats.weightSum / stats.judged : 0);
export const sectionScore = (s: SectionStat) =>
  s.count ? s.weight / s.count - s.errors * 0.05 : null;
export const stars = (acc: number) => (acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0);

/** Timing judgement for a hit that is `deltaSec` away from the note, or null when outside the window. */
export function timingJudgement(deltaSec: number): 'perfect' | 'good' | null {
  const d = Math.abs(deltaSec);
  if (d <= PERFECT_SEC) return 'perfect';
  if (d <= GOOD_SEC) return 'good';
  return null;
}

/** Sung note: share of its length held on pitch. */
export const pitchJudgement = (fraction: number): Judgement =>
  fraction >= 0.7 ? 'perfect' : fraction >= 0.35 ? 'good' : 'miss';

export interface BeatRange {
  from: number;
  to: number;
}

/** Notes the player still owes at the earliest open position (a chord counts as one position). */
export function pendingNotes(
  notes: StageNote[],
  loop: BeatRange | null,
  needsStart = false,
): StageNote[] {
  const out: StageNote[] = [];
  let t0: number | null = null;
  for (let i = loop ? lowerBound(notes, loop.from) : 0; i < notes.length; i++) {
    const n = notes[i];
    if (loop && n.t >= loop.to) break;
    if (n.judged || (needsStart && n.started)) continue;
    if (t0 === null) t0 = n.t;
    if (n.t > t0 + 1e-6) break;
    out.push(n);
  }
  return out;
}

/** Timing cost in seconds of playing a sibling voice instead of the written one. */
const VOICE_TIE_SEC = 0.02;

/** Closest open note on `lane` around `beat`, with its distance in seconds. */
export function nearestOpenNote(
  notes: StageNote[],
  lane: number,
  beat: number,
  secPerBeat: number,
  played?: DrumVoice,
) {
  let best: StageNote | null = null;
  let bestSec = Infinity;
  let bestScore = Infinity;
  for (let i = lowerBound(notes, beat - 1); i < notes.length && notes[i].t < beat + 1; i++) {
    const n = notes[i];
    if (n.judged || n.lane !== lane) continue;
    const d = Math.abs(n.t - beat) * secPerBeat;
    // The exact drum voice wins over a sibling (open vs closed hi-hat) at near-equal timing.
    const score = d + (played && n.drum ? drumMatchRank(played, n.drum) * VOICE_TIE_SEC : 0);
    if (score < bestScore) {
      bestScore = score;
      bestSec = d;
      best = n;
    }
  }
  return best ? { note: best, deltaSec: bestSec } : null;
}
