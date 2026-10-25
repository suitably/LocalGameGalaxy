import { describe, expect, it } from 'vitest';
import {
  beatFromFraction,
  DEFAULT_LEAD_IN_SEC,
  firstNoteBeat,
  fractionOfBeat,
  leadInBeat,
  parseLeadIn,
} from '../seek';
import {
  groupOfSection,
  groupSections,
  mergeStats,
  sectionsWithNotes,
  spanProgress,
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

  it('merges stats and locates the group of a section', () => {
    expect(
      mergeStats([
        { weight: 2, count: 3, errors: 1 },
        undefined,
        { weight: 1, count: 1, errors: 0 },
      ]),
    ).toEqual({ weight: 3, count: 4, errors: 1 });
    const g = groupSections(sections(10));
    expect(groupOfSection(g, 0)).toBe(0);
    expect(groupOfSection(g, 9)).toBe(4);
  });

  it('reports progress inside a span only', () => {
    expect(spanProgress(4, 8, 6)).toBe(0.5);
    expect(spanProgress(4, 8, 8)).toBeNull();
    expect(spanProgress(4, 8, -2)).toBeNull();
  });
});
