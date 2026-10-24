import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../../types';
import { buildHistoricalRanking, rankSession, type ScoreBoardPlayer } from './scoreBoardRanking';

const player = (
  name: string,
  score: number,
  history: ScoreBoardPlayer['history'] = [],
): ScoreBoardPlayer => ({
  config: { id: name, name, hue: 120 } as UserProfile,
  score,
  history,
  isNewRecord: false,
});

describe('rankSession', () => {
  it('sorts by score without mutating the input', () => {
    const input = [player('a', 10), player('b', 30), player('c', 20)];
    expect(rankSession(input).map((p) => p.config.name)).toEqual(['b', 'c', 'a']);
    expect(input[0].config.name).toBe('a');
  });
});

describe('buildHistoricalRanking', () => {
  it('merges histories and sorts best first', () => {
    const ranking = buildHistoricalRanking([
      player('a', 0, [
        { score: 100, date: '2026-01-01' },
        { score: 300, date: '2026-01-02' },
      ]),
      player('b', 0, [{ score: 200, date: '2026-01-03' }]),
    ]);
    expect(ranking.map((e) => e.score)).toEqual([300, 200, 100]);
  });

  it('uses the current score when a player has no history', () => {
    const now = new Date('2026-05-05T10:00:00Z');
    const ranking = buildHistoricalRanking([player('a', 42)], now);
    expect(ranking).toEqual([{ name: 'a', score: 42, date: now.toISOString(), hue: 120 }]);
  });

  it('caps the list at 50 entries', () => {
    const history = Array.from({ length: 80 }, (_, i) => ({ score: i, date: '2026-01-01' }));
    expect(buildHistoricalRanking([player('a', 0, history)])).toHaveLength(50);
  });
});
