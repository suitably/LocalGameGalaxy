import type { Section } from './sections';
import type { SectionStat } from './judging';

/** A strip row shows at most this many cells; each stands for a run of bars. */
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

/**
 * Splits sections `first..last` (default: all) into at most `maxGroups` contiguous groups of
 * nearly equal size.
 */
export function groupSections(
  sections: Section[],
  maxGroups: number = MAX_SECTION_GROUPS,
  first = 0,
  last = sections.length - 1,
): SectionGroup[] {
  const n = last - first + 1;
  if (n <= 0) return [];
  const k = Math.min(Math.max(1, maxGroups), n);
  const out: SectionGroup[] = [];
  for (let g = 0; g < k; g++) {
    const a = first + Math.floor((g * n) / k);
    const b = first + Math.floor(((g + 1) * n) / k) - 1;
    out.push({
      first: a,
      last: b,
      from: sections[a].from,
      to: sections[b].to,
      firstBar: sections[a].firstBar,
      lastBar: sections[b].lastBar,
    });
  }
  return out;
}

/**
 * Rows of the strip: the whole song in groups, then for every opened cell (`path` holds its
 * index per row) the next row splits that cell again, down to single bars. So the number of
 * rows grows with the song's length and how deep the player opened it.
 */
export function stripRows(
  sections: Section[],
  path: number[],
  maxGroups: number = MAX_SECTION_GROUPS,
): SectionGroup[][] {
  if (!sections.length) return [];
  const rows = [groupSections(sections, maxGroups)];
  for (const open of path) {
    const cell = rows[rows.length - 1][open];
    if (!cell || cell.first === cell.last) break;
    rows.push(groupSections(sections, maxGroups, cell.first, cell.last));
  }
  return rows;
}

/** Opens cell `index` of row `row`, or closes it (and the rows under it) when it is open. */
export function togglePath(path: number[], row: number, index: number): number[] {
  return path[row] === index ? path.slice(0, row) : [...path.slice(0, row), index];
}

/** A run of sections (bars), as section indices (inclusive). */
export interface BarSpan {
  first: number;
  last: number;
}

/** Loop picked on the strip: a start cell and, once tapped, an end cell. */
export interface LoopPick {
  start: BarSpan;
  end: BarSpan | null;
}

const within = (a: BarSpan, b: BarSpan) => a.first >= b.first && a.last <= b.last;
const overlaps = (a: BarSpan, b: BarSpan) => a.first <= b.last && a.last >= b.first;

/**
 * Tap on a cell while picking a loop. The first tap marks the start; a tap on a cell that
 * overlaps it (opening a group down to a bar) moves the start there; a tap elsewhere marks the
 * end. After that, a tap inside the start or end cell narrows that cell, any other starts anew.
 */
export function pickLoop(prev: LoopPick | null, cell: BarSpan): LoopPick {
  const c = { first: cell.first, last: cell.last };
  if (!prev) return { start: c, end: null };
  if (!prev.end) return overlaps(c, prev.start) ? { start: c, end: null } : { ...prev, end: c };
  if (within(c, prev.end)) return { ...prev, end: c };
  if (within(c, prev.start)) return { ...prev, start: c };
  return { start: c, end: null };
}

/** Bars the pick covers: from the earlier to the later cell. */
export function loopSpan(pick: LoopPick): BarSpan {
  const end = pick.end ?? pick.start;
  return {
    first: Math.min(pick.start.first, end.first),
    last: Math.max(pick.start.last, end.last),
  };
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

/** Where the playhead stands on a row (0..1), or null when it is outside the row's bars. */
export function rowProgress(row: SectionGroup[], beat: number): number | null {
  const i = row.findIndex((g) => beat >= g.from && beat < g.to);
  if (i < 0) return null;
  return (i + (spanProgress(row[i].from, row[i].to, beat) ?? 0)) / row.length;
}
