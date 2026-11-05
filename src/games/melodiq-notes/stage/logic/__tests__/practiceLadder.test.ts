import { describe, it, expect } from 'vitest';
import {
  afterPass,
  ladderBar,
  ladderSpeed,
  nextBar,
  passScore,
  PASSES_PER_STEP,
  startLadder,
  weakBars,
  type Ladder,
} from '../practiceLadder';

const passes = (l: Ladder, score: number, n: number) => {
  let cur = l;
  let outcome = '';
  for (let i = 0; i < n; i++) ({ ladder: cur, outcome } = afterPass(cur, score));
  return { ladder: cur, outcome };
};

describe('practice ladder (#638)', () => {
  it('lists weak bars weakest first and starts with the picked one', () => {
    const scores = [1, 0.5, null, 0.8, 0.96, 0.2];
    expect(weakBars(scores)).toEqual([5, 1, 3]);
    const l = startLadder(scores, 3)!;
    expect(l.bars).toEqual([3, 5, 1]);
    expect(ladderBar(l)).toBe(3);
    expect(ladderSpeed(l)).toBe(0.75);
    expect(startLadder([1, 0.99, null])).toBeNull();
  });

  it('moves up after three good passes in a row; a weak pass starts the count again', () => {
    const l = startLadder([0.5])!;
    expect(afterPass(l, 0.95).outcome).toBe('again');
    const broken = passes(afterPass(passes(l, 0.95, 2).ladder, 0.5).ladder, 0.95, 2);
    expect(broken.outcome).toBe('again');
    const faster = passes(l, 0.95, PASSES_PER_STEP);
    expect(faster.outcome).toBe('faster');
    expect(ladderSpeed(faster.ladder)).toBe(1);
    const done = passes(faster.ladder, 0.9, PASSES_PER_STEP);
    expect(done.outcome).toBe('bar_done');
  });

  it('goes on with the next weak bar at the start speed, then ends', () => {
    const l = startLadder([0.5, 0.4])!;
    const second = nextBar({ ...l, step: 2, streak: 3 })!;
    expect(ladderBar(l)).toBe(1); // weakest first
    expect(ladderBar(second)).toBe(0);
    expect(ladderSpeed(second)).toBe(0.75);
    expect(second.streak).toBe(0);
    expect(nextBar(second)).toBeNull();
  });

  it('scores a pass over the looped sections; no notes counts as right', () => {
    const s = (weight: number, count: number) => ({ weight, count, errors: 0 });
    expect(passScore([s(0, 0), s(1, 1), s(0.5, 1)], 1, 2)).toBeCloseTo(0.75);
    expect(passScore([s(0, 0), s(0, 0)], 0, 1)).toBe(1);
  });
});
