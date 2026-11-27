import { describe, expect, it } from 'vitest';
import { parseTvSessionResults, toTvSessionResults, TV_HISTORY_LIMIT } from './tvSessionResults';
import type { ScoreBoardPlayer } from '../gameplay/logic/scoreBoardRanking';

const player = (overrides: Partial<ScoreBoardPlayer> = {}): ScoreBoardPlayer => ({
  config: { id: 'p1', name: 'Ana', hue: 120 },
  score: 4200,
  history: [],
  isNewRecord: false,
  ...overrides,
});

describe('toTvSessionResults', () => {
  it('keeps only the fields the scoreboard renders', () => {
    const extra = {
      config: { id: 'p1', name: 'Ana', hue: 120, hidePitch: true, remotePeerId: 'x' },
    };
    const payload = toTvSessionResults('song-1', [
      player({ ...extra, isRemote: true, loadingHistory: true, isNewRecord: true }),
    ]);
    expect(payload).toEqual({
      songId: 'song-1',
      results: [
        {
          config: { id: 'p1', name: 'Ana', hue: 120 },
          score: 4200,
          history: [],
          isNewRecord: true,
          isRemote: true,
          loadingHistory: true,
        },
      ],
    });
  });

  it('sends the best history entries only, best first', () => {
    const history = Array.from({ length: TV_HISTORY_LIMIT + 10 }, (_, i) => ({
      score: i,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const [result] = toTvSessionResults('s', [player({ history })]).results;
    expect(result.history).toHaveLength(TV_HISTORY_LIMIT);
    expect(result.history[0].score).toBe(TV_HISTORY_LIMIT + 9);
  });

  it('survives a JSON round trip unchanged', () => {
    const payload = toTvSessionResults('s', [
      player({ history: [{ score: 10, date: '2026-01-01' }] }),
    ]);
    expect(parseTvSessionResults(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });
});

describe('parseTvSessionResults', () => {
  it('rejects payloads without song id or results', () => {
    expect(parseTvSessionResults(undefined)).toBeNull();
    expect(parseTvSessionResults({ results: [] })).toBeNull();
    expect(parseTvSessionResults({ songId: 's' })).toBeNull();
  });

  it('drops malformed rows and history entries', () => {
    const parsed = parseTvSessionResults({
      songId: 's',
      results: [
        {
          config: { id: 'p1', name: 'Ana', hue: 1 },
          score: 5,
          history: [{ score: 'x' }, { score: 3, date: 'd' }],
        },
        { config: { id: 'p2' }, score: 5 },
        { score: 7 },
      ],
    });
    expect(parsed?.results).toEqual([
      {
        config: { id: 'p1', name: 'Ana', hue: 1 },
        score: 5,
        history: [{ score: 3, date: 'd' }],
        isNewRecord: false,
      },
    ]);
  });
});
