import type { Section } from './sections';
import type { SectionStat } from './judging';

/** The strip shows at most this many cells; each stands for a run of sections. */
export const MAX_SECTION_GROUPS = 5;

export interface SectionGroup {
  /** Index range into the section list (inclusive). */
  first: number;
  last: number;
  from: number;
  to: number;
  firstBar: number;
  lastBar: number;
}

/** Splits the sections into at most `maxGroups` contiguous groups of nearly equal size. */
export function groupSections(
  sections: Section[],
  maxGroups: number = MAX_SECTION_GROUPS,
): SectionGroup[] {
  const n = sections.length;
  const k = Math.min(Math.max(1, maxGroups), n);
  const out: SectionGroup[] = [];
  for (let g = 0; g < k; g++) {
    const first = Math.floor((g * n) / k);
    const last = Math.floor(((g + 1) * n) / k) - 1;
    out.push({
      first,
      last,
      from: sections[first].from,
      to: sections[last].to,
      firstBar: sections[first].firstBar,
      lastBar: sections[last].lastBar,
    });
  }
  return out;
}

/** Which sections contain at least one note start (sections without notes get no rating). */
export function sectionsWithNotes(sections: Section[], noteBeats: number[]): boolean[] {
  const has = sections.map(() => false);
  if (!sections.length) return has;
  for (const t of noteBeats) {
    let lo = 0;
    let hi = sections.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (sections[mid].from <= t) lo = mid;
      else hi = mid - 1;
    }
    has[lo] = true;
  }
  return has;
}

/** Sums the stats of several sections into one (for a group's colour). */
export function mergeStats(stats: (SectionStat | undefined)[]): SectionStat {
  const out: SectionStat = { weight: 0, count: 0, errors: 0 };
  for (const s of stats) {
    if (!s) continue;
    out.weight += s.weight;
    out.count += s.count;
    out.errors += s.errors;
  }
  return out;
}

/** How far `beat` is through a span from `from` to `to`, or null when it lies outside. */
export function spanProgress(from: number, to: number, beat: number): number | null {
  if (beat < from || beat >= to || to <= from) return null;
  return (beat - from) / (to - from);
}

/** Group that holds section `index`. */
export function groupOfSection(groups: SectionGroup[], index: number): number {
  const g = groups.findIndex((x) => index >= x.first && index <= x.last);
  return g < 0 ? 0 : g;
}
