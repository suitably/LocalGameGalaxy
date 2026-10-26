import type { ScoreSong } from '../../../../modules/music-score';

export interface Section {
  from: number;
  to: number;
  /** 1-based played bar numbers covered (first and last; equal, one section is one bar). */
  firstBar: number;
  lastBar: number;
}

/** One practice section per played bar (the strip groups them for display). */
export function buildSections(song: ScoreSong): Section[] {
  const n = song.measureStarts.length;
  return song.measureStarts.map((from, i) => ({
    from,
    to: i + 1 < n ? song.measureStarts[i + 1] : song.end,
    firstBar: i + 1,
    lastBar: i + 1,
  }));
}

export function sectionIndexAt(sections: Section[], beat: number): number {
  let lo = 0;
  let hi = sections.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (sections[mid].from <= beat) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(0, lo);
}
