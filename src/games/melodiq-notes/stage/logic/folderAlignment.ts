import {
  ALIGN_VERSION,
  assessMarks,
  defaultMode,
  type BarMark,
  type MarkQuality,
  type ScoreSong,
} from '../../../../modules/music-score';
import type { StoredBarMarks } from '../../../../lib/companion/songScoresApi';
import { storedMarksPlan } from './marksPolicy';

/**
 * Bar marks as one score of a song folder has them: the one place that builds marks to store,
 * whether the stage, the folder view, the batch import or a replaced recording aligned them.
 */

/** Where a score's stored marks stand. */
export type StoredMarksStatus = 'none' | 'current' | 'outdated' | 'edited';

export function storedStatus(
  stored: Pick<StoredBarMarks, 'aligner' | 'edited' | 'offsetSec'> | null,
): StoredMarksStatus {
  const plan = storedMarksPlan(stored, 'notes');
  if (plan === 'align') return 'none';
  if (plan === 'realign') return 'outdated';
  return stored?.edited ? 'edited' : 'current';
}

/** A fresh alignment as it is stored: current version, the mode its check suggests, not edited. */
export function freshMarks(
  song: ScoreSong,
  marks: BarMark[],
  audio: string | null,
): { stored: StoredBarMarks; quality: MarkQuality } {
  const quality = assessMarks(song, marks);
  return {
    quality,
    stored: {
      marks,
      offsetSec: 0,
      audio,
      aligner: ALIGN_VERSION,
      mode: defaultMode(quality),
      edited: false,
    },
  };
}

/** Scores "align all" takes: those without marks or with outdated ones; current and hand-edited stay. */
export const needsAlignment = (status: StoredMarksStatus) =>
  status === 'none' || status === 'outdated';
