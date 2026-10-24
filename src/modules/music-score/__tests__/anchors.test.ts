import { describe, it, expect } from 'vitest';
import { nearestBar, pinBar } from '../anchors';
import type { BarMark } from '../types';

/** Eleven bars of 2 s from 1 s, plus the end mark. */
const marks = (): BarMark[] =>
  Array.from({ length: 12 }, (_, k) => ({ beat: k * 4, sec: 1 + 2 * k }));
const secs = (ms: BarMark[]) => ms.map((m) => Math.round(m.sec * 1000) / 1000);

describe('nearestBar', () => {
  it('finds the closest bar start but never the end mark', () => {
    expect(nearestBar(marks(), 6.8)).toBe(3);
    expect(nearestBar(marks(), 100)).toBe(10);
  });
});

describe('pinBar', () => {
  it('fades the move out over the neighbouring bars when nothing is pinned', () => {
    const r = pinBar(marks(), [], 5, 11.4)!;
    expect(r.pins).toEqual([5]);
    expect(secs(r.marks)).toEqual([1, 3, 5.1, 7.2, 9.3, 11.4, 13.3, 15.2, 17.1, 19, 21, 23]);
  });

  it('stretches the bars between two pins', () => {
    const first = pinBar(marks(), [], 2, 5)!;
    const r = pinBar(first.marks, first.pins, 6, 14)!;
    expect(r.pins).toEqual([2, 6]);
    // bars 3–5 now share the 9 s between the pins evenly
    expect(secs(r.marks).slice(2, 7)).toEqual([5, 7.25, 9.5, 11.75, 14]);
    expect(r.marks[2].sec).toBe(5);
  });

  it('refuses to move a bar past a pinned neighbour', () => {
    const first = pinBar(marks(), [], 4, 9)!;
    expect(pinBar(first.marks, first.pins, 5, 8.5)).toBeNull();
  });

  it('keeps the marks increasing after a large move', () => {
    const r = pinBar(marks(), [], 5, 4)!;
    for (let k = 1; k < r.marks.length; k++)
      expect(r.marks[k].sec).toBeGreaterThan(r.marks[k - 1].sec);
  });
});
