import { describe, expect, it } from 'vitest';
import type { YouTubeResult } from '../../../../../lib/companion/songDownloadApi';
import { chooseRecording, durationTolerance, isDurationMatch } from '../recordingMatch';

const hit = (id: string, duration: number) => ({ id, url: `u/${id}`, duration }) as YouTubeResult;

describe('isDurationMatch', () => {
  it('uses at least 8 s, or 10 % of a long score', () => {
    expect(durationTolerance(60)).toBe(8);
    expect(durationTolerance(300)).toBe(30);
    expect(isDurationMatch(180, 195)).toBe(true);
    expect(isDurationMatch(180, 199)).toBe(false);
    expect(isDurationMatch(180, 150)).toBe(false);
    expect(isDurationMatch(60, 67)).toBe(true);
  });
  it('never matches an unknown length', () => {
    expect(isDurationMatch(180, 0)).toBe(false);
    expect(isDurationMatch(0, 180)).toBe(false);
    expect(isDurationMatch(NaN, 180)).toBe(false);
  });
});

describe('chooseRecording', () => {
  it('accepts the best-ranked hit within tolerance', () => {
    const r = chooseRecording([hit('live', 900), hit('a', 185), hit('b', 180)], 180);
    expect(r).toMatchObject({ kind: 'match', hit: { id: 'a' } });
  });
  it('asks when nothing is within tolerance, offering at most 5', () => {
    const r = chooseRecording(
      Array.from({ length: 8 }, (_, i) => hit(`${i}`, 900)),
      180,
    );
    expect(r.kind).toBe('review');
    if (r.kind === 'review') expect(r.candidates).toHaveLength(5);
  });
  it('reports no candidates as none', () => {
    expect(chooseRecording([], 180)).toEqual({ kind: 'none' });
  });
});
