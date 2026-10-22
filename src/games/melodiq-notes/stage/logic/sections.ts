import type { ScoreSong } from '../../../../modules/music-score';

const MAX_SECTIONS = 32;

export interface Section {
  from: number;
  to: number;
  /** 1-based played bar numbers covered (first and last). */
  firstBar: number;
  lastBar: number;
}

/** Groups the played bars into at most 32 practice sections. */
export function buildSections(song: ScoreSong): Section[] {
  const n = song.measureStarts.length;
  const per = Math.max(1, Math.ceil(n / MAX_SECTIONS));
  const out: Section[] = [];
  for (let i = 0; i < n; i += per) {
    const j = Math.min(n, i + per);
    out.push({
      from: song.measureStarts[i],
      to: j < n ? song.measureStarts[j] : song.end,
      firstBar: i + 1,
      lastBar: j,
    });
  }
  return out;
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
