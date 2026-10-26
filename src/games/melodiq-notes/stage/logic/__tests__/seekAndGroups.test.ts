import { describe, expect, it } from 'vitest';
import {
  beatFromFraction,
  DEFAULT_LEAD_IN_SEC,
  firstNoteBeat,
  fractionOfBeat,
  leadInBeat,
  noNotesAhead,
  parseLeadIn,
} from '../seek';
import {
  groupSections,
  loopSpan,
  mergeStats,
  pickLoop,
  rowProgress,
  sectionsWithNotes,
  spanProgress,
  stripRows,
  togglePath,
} from '../sectionGroups';
import type { Section } from '../sections';

const sections = (n: number): Section[] =>
  Array.from({ length: n }, (_, i) => ({
    from: i * 4,
    to: (i + 1) * 4,
    firstBar: i + 1,
    lastBar: i + 1,
  }));

describe('seek', () => {
  it('finds the earliest note over all players', () => {
    expect(firstNoteBeat([[{ t: 8 }, { t: 9 }], [], [{ t: 6.5 }]])).toBe(6.5);
    expect(firstNoteBeat([[], []])).toBeNull();
  });

  it('starts the lead-in seconds before the first note, not before the minimum', () => {
    // 0.5 s per beat: 3 s = 6 beats
    expect(leadInBeat(20, 3, 0.5, -4)).toBe(14);
    expect(leadInBeat(2, 3, 0.5, -4)).toBe(-4);
    expect(leadInBeat(20, 0, 0.5, -4)).toBe(20);
    expect(leadInBeat(20, 3, 0, -4)).toBe(20);
  });

  it('maps bar positions to beats and back', () => {
    expect(beatFromFraction(0.25, 80)).toBe(20);
    expect(beatFromFraction(2, 80)).toBe(80);
    expect(fractionOfBeat(-4, 80)).toBe(0);
    expect(fractionOfBeat(40, 80)).toBe(0.5);
    expect(fractionOfBeat(10, 0)).toBe(0);
  });

  it('knows when no player has notes left', () => {
    const notes = [[{ t: 2, dur: 1 }], [{ t: 6, dur: 2 }]];
    expect(noNotesAhead(notes, 7.9)).toBe(false);
    expect(noNotesAhead(notes, 8)).toBe(true);
    expect(noNotesAhead([[], []], 0)).toBe(true);
  });

  it('only accepts offered lead-ins', () => {
    expect(parseLeadIn('5')).toBe(5);
    expect(parseLeadIn(0)).toBe(0);
    expect(parseLeadIn(7)).toBe(DEFAULT_LEAD_IN_SEC);
    expect(parseLeadIn(null)).toBe(DEFAULT_LEAD_IN_SEC);
  });
});

describe('section groups', () => {
  it('keeps short songs as they are and caps long ones at five groups', () => {
    expect(groupSections(sections(3))).toHaveLength(3);
    const g = groupSections(sections(32));
    expect(g).toHaveLength(5);
    expect(g[0]).toMatchObject({ first: 0, last: 5, from: 0, firstBar: 1, lastBar: 6 });
    expect(g[4].last).toBe(31);
    expect(g[4].to).toBe(128);
    g.slice(1).forEach((x, i) => expect(x.first).toBe(g[i].last + 1));
  });

  it('marks sections that hold notes', () => {
    expect(sectionsWithNotes(sections(4), [0, 1, 9, 15.9])).toEqual([true, false, true, true]);
    expect(sectionsWithNotes([], [1])).toEqual([]);
  });

  it('merges stats', () => {
    expect(
      mergeStats([
        { weight: 2, count: 3, errors: 1 },
        undefined,
        { weight: 1, count: 1, errors: 0 },
      ]),
    ).toEqual({ weight: 3, count: 4, errors: 1 });
  });

  it('splits a range of sections', () => {
    const g = groupSections(sections(20), 5, 10, 19);
    expect(g).toHaveLength(5);
    expect(g[0]).toMatchObject({ first: 10, last: 11, firstBar: 11, lastBar: 12 });
    expect(g[4]).toMatchObject({ first: 18, last: 19, to: 80 });
    expect(groupSections(sections(4), 5, 2, 1)).toEqual([]);
  });

  it('opens rows down to single bars, as many as the song needs', () => {
    const all = sections(100);
    expect(stripRows(all, [])).toHaveLength(1);
    const rows = stripRows(all, [1, 2, 3]);
    // 100 bars → groups of 20 → 4 → single bars
    expect(rows.map((r) => r.length)).toEqual([5, 5, 4]);
    expect(rows[1][0]).toMatchObject({ firstBar: 21, lastBar: 24 });
    expect(rows[2][3]).toMatchObject({ first: 31, last: 31 });
    // a short song shows its bars at once; opening a single bar adds nothing
    expect(stripRows(sections(4), [0])).toHaveLength(1);
    expect(stripRows([], [0])).toEqual([]);
  });

  it('toggles an opened cell and closes the rows under it', () => {
    expect(togglePath([], 0, 2)).toEqual([2]);
    expect(togglePath([2, 1], 0, 3)).toEqual([3]);
    expect(togglePath([2, 1], 1, 1)).toEqual([2]);
    expect(togglePath([2, 1], 0, 2)).toEqual([]);
  });

  it('picks a loop with two taps and narrows either end inside its cell', () => {
    let p = pickLoop(null, { first: 20, last: 39 });
    expect(p.end).toBeNull();
    // opening the group down to a bar moves the start there
    p = pickLoop(p, { first: 24, last: 27 });
    p = pickLoop(p, { first: 25, last: 25 });
    expect(p).toEqual({ start: { first: 25, last: 25 }, end: null });
    p = pickLoop(p, { first: 60, last: 79 });
    expect(loopSpan(p)).toEqual({ first: 25, last: 79 });
    // narrowing the end group to a bar
    p = pickLoop(p, { first: 64, last: 67 });
    p = pickLoop(p, { first: 66, last: 66 });
    expect(loopSpan(p)).toEqual({ first: 25, last: 66 });
    // a tap outside both starts a new pick; an end before the start works too
    p = pickLoop(p, { first: 10, last: 10 });
    expect(p.end).toBeNull();
    p = pickLoop(p, { first: 3, last: 3 });
    expect(loopSpan(p)).toEqual({ first: 3, last: 10 });
  });

  it('places the playhead on a row of equal cells', () => {
    const row = groupSections(sections(10), 5);
    expect(rowProgress(row, 0)).toBe(0);
    expect(rowProgress(row, 12)).toBeCloseTo(0.3);
    expect(rowProgress(row, 40)).toBeNull();
    expect(rowProgress(row, -2)).toBeNull();
  });

  it('reports progress inside a span only', () => {
    expect(spanProgress(4, 8, 6)).toBe(0.5);
    expect(spanProgress(4, 8, 8)).toBeNull();
    expect(spanProgress(4, 8, -2)).toBeNull();
  });
});
