import { describe, expect, it } from 'vitest';
import {
  ellipsize,
  fitHeaderSegments,
  HEADER_LEFT_X,
  type HeaderInput,
  type HeaderLayout,
} from './headerFit';

const measure = (text: string) => text.length * 7;
const RIGHT = ['12,345  ×4  Combo 17  93 %', '12,345  ×4  Combo 17', '12,345  ×4', '12,345'];

function input(width: number, over: Partial<HeaderInput> = {}): HeaderInput {
  return {
    width,
    player: 'Player 1',
    instrument: 'Guitar',
    focusMarker: 'Computer keys',
    partName: 'Lead Guitar',
    rightOptions: RIGHT,
    ...over,
  };
}

/** Left end (label or part, whichever is last) plus a gap must not reach the right text. */
function expectNoOverlap(l: HeaderLayout) {
  const leftEnd = l.part !== null ? l.partX + measure(l.part) : HEADER_LEFT_X + measure(l.label);
  expect(leftEnd + 8).toBeLessThanOrEqual(l.rightX - measure(l.right));
}

describe('fitHeaderSegments', () => {
  it('shows everything when wide', () => {
    const l = fitHeaderSegments(input(900), measure);
    expect(l.label).toBe('Player 1 · Guitar · Computer keys');
    expect(l.part).toBe('Lead Guitar');
    expect(l.right).toBe(RIGHT[0]);
    expectNoOverlap(l);
  });

  it('drops the part name first', () => {
    const l = fitHeaderSegments(input(500), measure);
    expect(l.part).toBeNull();
    expect(l.label).toBe('Player 1 · Guitar · Computer keys');
    expect(l.right).toBe(RIGHT[0]);
    expectNoOverlap(l);
  });

  it('then drops the focus marker, then the instrument', () => {
    const mid = fitHeaderSegments(input(400), measure);
    expect(mid.label).toBe('Player 1 · Guitar');
    expect(mid.part).toBeNull();
    expect(mid.right).toBe(RIGHT[0]);
    const narrow = fitHeaderSegments(input(300), measure);
    expect(narrow.label).toBe('Player 1');
    expect(narrow.right).toBe(RIGHT[0]);
    expectNoOverlap(mid);
    expectNoOverlap(narrow);
  });

  it('degrades the right side before overlapping, keeping "Player N"', () => {
    const l = fitHeaderSegments(input(250), measure);
    expect(l.label).toBe('Player 1');
    expect(l.right).not.toBe(RIGHT[0]);
    expectNoOverlap(l);
  });

  it('ellipsizes the player label last and keeps the score', () => {
    const l = fitHeaderSegments(input(130), measure);
    expect(l.right).toBe('12,345');
    expect(l.label.endsWith('…')).toBe(true);
    expectNoOverlap(l);
  });

  it('never overlaps across widths and always keeps the score', () => {
    for (let w = 120; w <= 900; w += 5) {
      const l = fitHeaderSegments(input(w), measure);
      expect(l.right.startsWith('12,345')).toBe(true);
      expectNoOverlap(l);
    }
  });

  it('works for a single player (no player label)', () => {
    const wide = fitHeaderSegments(input(500, { player: null, focusMarker: null }), measure);
    expect(wide.label).toBe('Guitar');
    expect(wide.part).toBe('Lead Guitar');
    const narrow = fitHeaderSegments(input(130, { player: null, focusMarker: null }), measure);
    expect(narrow.part).toBeNull();
    expectNoOverlap(narrow);
  });
});

describe('ellipsize', () => {
  it('returns text that fits and truncates otherwise', () => {
    expect(ellipsize('abc', 100, measure)).toBe('abc');
    expect(ellipsize('abcdefgh', 35, measure)).toBe('abcd…');
    expect(ellipsize('abcdefgh', 3, measure)).toBe('');
  });
});
