import type { Note } from '../../parser';
import type { LineGroup } from '../LyricsLineView';

/** Splits a note stream into lyric lines; a `-` note ends the current line. */
export const groupNotesIntoLines = (notes: readonly Note[]): LineGroup[] => {
  const groups: LineGroup[] = [];
  let current: Note[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    groups.push({ notes: current, startBeat: first.start, endBeat: last.start + last.duration });
    current = [];
  };

  for (const note of notes) {
    if (note.type === '-') flush();
    else current.push(note);
  }
  flush();
  return groups;
};

/** The next `count` lines after `activeIndex` (none when no line is active). */
export const upcomingLinesAfter = (
  lines: readonly LineGroup[],
  activeIndex: number,
  count: number,
): LineGroup[] => (activeIndex === -1 ? [] : lines.slice(activeIndex + 1, activeIndex + 1 + count));

export interface LeadInTiming {
  timeUntilStartSec: number;
  totalGapSec: number;
}

/** Seconds until the active line starts and the length of the pause before it. */
export const leadInTiming = (
  lines: readonly LineGroup[],
  activeIndex: number,
  currentBeat: number,
  msPerBeat: number,
): LeadInTiming => {
  if (activeIndex === -1) return { timeUntilStartSec: 0, totalGapSec: 0 };
  const active = lines[activeIndex];
  const gapStartBeat = activeIndex === 0 ? 0 : lines[activeIndex - 1].endBeat;
  return {
    timeUntilStartSec: ((active.startBeat - currentBeat) * msPerBeat) / 1000,
    totalGapSec: ((active.startBeat - gapStartBeat) * msPerBeat) / 1000,
  };
};
