import { beforeEach, describe, expect, it } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../../../lib/storage';
import { newStats } from '../judging';
import {
  leaderboard,
  MAX_RESULTS,
  mergeResults,
  parseResults,
  readResults,
  runResults,
  saveResults,
  type FinishedRun,
  type SongResult,
} from '../songResults';

const song = { key: 'k1', title: 'Ode' };

const result = (over: Partial<SongResult>): SongResult => ({
  songKey: 'k1',
  title: 'Ode',
  player: 'Ann',
  seat: 1,
  partName: 'Piano',
  inst: 'keyboard',
  score: 1000,
  accuracy: 0.8,
  stars: 2,
  maxCombo: 10,
  at: 1,
  ...over,
});

function player(no: number, score: number, opts: { name?: string; remoteId?: string } = {}) {
  const stats = newStats(0);
  stats.score = score;
  stats.judged = score ? 10 : 0;
  stats.weightSum = score ? 9 : 0;
  stats.maxCombo = 5;
  return {
    no,
    ...opts,
    part: { name: `Part ${no}` },
    instrument: { kind: 'guitar' as const },
    stats,
  };
}

const run = (players: FinishedRun['players'], over: Partial<FinishedRun> = {}): FinishedRun => ({
  mode: 'perform',
  speed: 1,
  loop: null,
  players,
  ...over,
});

describe('song results (#699)', () => {
  beforeEach(() => storage.remove(STORAGE_KEYS.MELODIQ_NOTES_RESULTS));

  it('counts only full runs in perform mode at full speed', () => {
    const p = [player(1, 500)];
    expect(runResults(run(p), song, 'Ann', 5)).toHaveLength(1);
    expect(runResults(run(p, { mode: 'practice' }), song, 'Ann', 5)).toEqual([]);
    expect(runResults(run(p, { mode: 'learn' }), song, 'Ann', 5)).toEqual([]);
    expect(runResults(run(p, { speed: 0.75 }), song, 'Ann', 5)).toEqual([]);
    expect(runResults(run(p, { loop: { from: 0, to: 4 } }), song, 'Ann', 5)).toEqual([]);
  });

  it('names pults by their name, a single local player by the device name, else by seat', () => {
    const solo = runResults(
      run([player(1, 500), player(2, 300, { name: 'Bo', remoteId: 'r' })]),
      song,
      'Ann',
      5,
    );
    expect(solo.map((r) => [r.player, r.seat])).toEqual([
      ['Ann', 1],
      ['Bo', 2],
    ]);
    expect(solo[0]).toMatchObject({
      accuracy: 0.9,
      stars: 3,
      score: 500,
      partName: 'Part 1',
      at: 5,
    });
    const shared = runResults(run([player(1, 500), player(2, 300)]), song, 'Ann', 5);
    expect(shared.map((r) => r.player)).toEqual([null, null]);
    const silent = runResults(run([player(1, 500), player(2, 0)]), song, 'Ann', 5);
    expect(silent).toHaveLength(1);
  });

  it('stores the best result per player and song', () => {
    saveResults([result({ score: 1000 })]);
    saveResults([result({ score: 800, at: 2 })]);
    expect(readResults()).toEqual([result({ score: 1000 })]);
    saveResults([result({ score: 1200, at: 3 })]);
    expect(readResults()).toEqual([result({ score: 1200, at: 3 })]);
    // same points, better accuracy wins; names match case-insensitively
    saveResults([result({ score: 1200, accuracy: 0.9, player: 'ann', at: 4 })]);
    expect(readResults()).toHaveLength(1);
    expect(readResults()[0]).toMatchObject({ accuracy: 0.9, at: 4 });
    // another song and another player get their own entries
    saveResults([
      result({ songKey: 'k2' }),
      result({ player: 'Bo' }),
      result({ player: null, seat: 2 }),
    ]);
    expect(readResults()).toHaveLength(4);
  });

  it('drops the oldest results beyond the limit', () => {
    const many = Array.from({ length: MAX_RESULTS + 3 }, (_, i) =>
      result({ player: `P${i}`, at: i }),
    );
    const kept = mergeResults([], many);
    expect(kept).toHaveLength(MAX_RESULTS);
    expect(kept.some((r) => r.at < 3)).toBe(false);
  });

  it('sorts the leaderboard and gives tied scores the same rank', () => {
    const board = leaderboard(
      [
        result({ player: 'C', score: 900, at: 1 }),
        result({ player: 'A', score: 1000, accuracy: 0.7, at: 3 }),
        result({ player: 'B', score: 1000, accuracy: 0.9, at: 4 }),
        result({ player: 'D', score: 1000, accuracy: 0.7, at: 2 }),
        result({ player: 'E', score: 500, songKey: 'other' }),
        result({ player: 'F', score: 100, at: 5 }),
      ],
      'k1',
    );
    expect(board.map((r) => [r.player, r.rank])).toEqual([
      ['B', 1],
      ['D', 1],
      ['A', 1],
      ['C', 4],
      ['F', 5],
    ]);
  });

  it('ignores stored entries it does not understand', () => {
    expect(parseResults('x')).toEqual([]);
    expect(parseResults([result({}), { songKey: 'k' }, null])).toEqual([result({})]);
    storage.setJson(STORAGE_KEYS.MELODIQ_NOTES_RESULTS, { bad: true });
    expect(readResults()).toEqual([]);
  });
});
