import { describe, it, expect } from 'vitest';
import type { Judgement, StageNote } from '../../logic/charts';
import { advanceSinging } from '../advance';
import type { StagePlayer } from '../types';

const note = (): StageNote => ({
  id: 0,
  t: 0,
  dur: 2,
  pitch: 57,
  lane: 0,
  judged: null,
  acc: 0,
  started: false,
});

/** Sings `pitch` over the whole note in 0.1-beat frames; returns the note and its judgement. */
function sing(pitch: number) {
  const n = note();
  const p = { notes: [n], maxDur: 2, missIdx: 0, history: [], voice: { pitch, singing: true } };
  let judged: Judgement | null = null;
  for (let beat = 0.1; beat <= 2.05; beat += 0.1)
    advanceSinging(p as unknown as StagePlayer, beat, 0.1, null, (_p, _n, kind) => (judged = kind));
  return { n, judged };
}

describe('pitch view in cents', () => {
  it('credits a note sung 30 cents sharp and records +30 cents', () => {
    const { n, judged } = sing(57.3);
    expect(judged).toBe('perfect');
    expect(n.cents).toBe(30);
  });

  it('records a flat deviation as negative cents', () => {
    expect(sing(56.75).n.cents).toBe(-25);
  });

  it('misses a note sung 90 cents off (outside PITCH_TOLERANCE_CENTS)', () => {
    const { n, judged } = sing(57.9);
    expect(judged).toBe('miss');
    expect(n.cents).toBeUndefined();
  });
});
