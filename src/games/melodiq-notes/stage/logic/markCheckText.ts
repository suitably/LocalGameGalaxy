import type { MarkQuality, ScoreSong } from '../../../../modules/music-score';
import { barRanges } from './marksPolicy';

/** What the check text needs of a score. */
export type CheckSong = Pick<ScoreSong, 'measureNumbers' | 'tempoMap'>;

type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** The check of bar marks as one sentence, and whether it asks for a look (`unsure`). */
export function markCheckText(
  k: Translate,
  song: CheckSong,
  quality: MarkQuality,
): { text: string; unsure: boolean } {
  if (quality.suspectBars.length)
    return {
      text: k('quality_unsure', { bars: barRanges(quality.suspectBars, song.measureNumbers) }),
      unsure: true,
    };
  if (quality.verdict === 'unsure')
    return {
      text: k('quality_tempo', { percent: Math.round(100 / quality.fit.ratio) }),
      unsure: true,
    };
  if (quality.steady) {
    const bpm = (song.tempoMap[0]?.bpm ?? 120) / quality.fit.ratio;
    return { text: k('quality_good_steady', { bpm: bpm.toFixed(1) }), unsure: false };
  }
  return { text: k('quality_good'), unsure: false };
}
