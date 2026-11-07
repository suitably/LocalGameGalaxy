import { ALIGN_VERSION, type MarksMode } from '../../../../modules/music-score';
import type { StoredBarMarks } from '../../../../lib/companion/songScoresApi';

/**
 * What the stage does with the bar marks a score brings: play them, or align the recording
 * again. Marks from an older alignment are replaced unless someone corrected them by hand;
 * karaoke marks come from the `.txt`, which is timed to the mix, and are always right.
 */
export function storedMarksPlan(
  stored: Pick<StoredBarMarks, 'aligner' | 'edited' | 'offsetSec'> | null,
  origin: 'notes' | 'karaoke',
): 'use' | 'realign' | 'align' {
  if (!stored) return 'align';
  if (origin === 'karaoke' || stored.edited) return 'use';
  if ((stored.aligner ?? 0) >= ALIGN_VERSION) return 'use';
  // stored before the version was kept, with a fine-tune: someone worked on these marks
  if (stored.aligner === undefined && stored.offsetSec !== 0) return 'use';
  return 'realign';
}

/** The mode stored marks play with; marks stored before modes existed played bar by bar. */
export const storedMode = (stored: Pick<StoredBarMarks, 'mode'> | null): MarksMode =>
  stored?.mode ?? 'bars';

/** Bar indices as written bar numbers in runs ("66–75, 87–88"). */
export function barRanges(indices: number[], measureNumbers: number[]): string {
  const runs: [number, number][] = [];
  for (const k of [...indices].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && k === last[1] + 1) last[1] = k;
    else runs.push([k, k]);
  }
  const num = (k: number) => measureNumbers[k] ?? k + 1;
  return runs.map(([a, b]) => (a === b ? `${num(a)}` : `${num(a)}–${num(b)}`)).join(', ');
}
