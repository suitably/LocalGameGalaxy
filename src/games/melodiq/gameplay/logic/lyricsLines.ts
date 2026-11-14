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

/** Lines shown when the stage holds nothing but lyrics (no pitch lane), per layout. */
const LYRICS_ONLY_LINES = { stackedSolo: 5, stackedDuet: 3, wide: 3 } as const;

/**
 * Line count for a lyrics-only stage: the room a pitch lane would take goes to more upcoming
 * lines, like a lyrics view in a music app. `0` (lyrics hidden) and larger settings are kept.
 */
export const lyricsOnlyLineCount = (setting: number, stacked: boolean, isDuet: boolean): number => {
  if (setting <= 0) return 0;
  const room = !stacked
    ? LYRICS_ONLY_LINES.wide
    : isDuet
      ? LYRICS_ONLY_LINES.stackedDuet
      : LYRICS_ONLY_LINES.stackedSolo;
  return Math.max(setting, room);
};

/** Opacity of the upcoming line at `index` of `count`: fades evenly, the last stays readable. */
export const upcomingLineOpacity = (index: number, count: number): number =>
  Math.max(0.15, 0.65 - index * (0.5 / Math.max(2, count - 1)));
