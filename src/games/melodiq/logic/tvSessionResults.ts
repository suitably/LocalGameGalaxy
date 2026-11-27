import type { ScoreBoardHistoryEntry, ScoreBoardPlayer } from '../gameplay/logic/scoreBoardRanking';

/**
 * Host → TV: the results of the session that just ended, so a TV (popup window or cast screen)
 * shows the same scoreboard as the host — new records, all-time ranking, phone singers' history.
 * The TV's passive session only knows live scores; stored history lives on the host.
 */
export const SESSION_RESULTS_MESSAGE = 'SESSION_RESULTS';

/** Window event the host session fires; `useTVMode` forwards its detail to the TV. */
export const SESSION_RESULTS_EVENT = 'melodiq_session_results';

/** History entries per player sent to the TV (the scoreboard lists at most 50 overall). */
export const TV_HISTORY_LIMIT = 50;

export interface TvSessionResults {
  songId: string;
  results: ScoreBoardPlayer[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toHistory = (history: readonly ScoreBoardHistoryEntry[]): ScoreBoardHistoryEntry[] =>
  [...history]
    .sort((a, b) => b.score - a.score)
    .slice(0, TV_HISTORY_LIMIT)
    .map(({ score, date }) => ({ score, date }));

/** Strips a result row to what the scoreboard renders (no runtime objects, bounded history). */
const toTvResult = (r: ScoreBoardPlayer): ScoreBoardPlayer => ({
  config: { id: r.config.id, name: r.config.name, hue: r.config.hue },
  score: r.score,
  history: toHistory(r.history ?? []),
  isNewRecord: r.isNewRecord,
  ...(r.isRemote !== undefined ? { isRemote: r.isRemote } : {}),
  ...(r.loadingHistory !== undefined ? { loadingHistory: r.loadingHistory } : {}),
});

/** The JSON-safe payload of a `SESSION_RESULTS` message. */
export const toTvSessionResults = (
  songId: string,
  results: readonly ScoreBoardPlayer[],
): TvSessionResults => ({ songId, results: results.map(toTvResult) });

const parseHistory = (value: unknown): ScoreBoardHistoryEntry[] =>
  Array.isArray(value)
    ? value.filter(
        (h): h is ScoreBoardHistoryEntry =>
          isRecord(h) && typeof h.score === 'number' && typeof h.date === 'string',
      )
    : [];

const parseResult = (value: unknown): ScoreBoardPlayer | null => {
  if (!isRecord(value) || !isRecord(value.config) || typeof value.score !== 'number') return null;
  const { id, name, hue } = value.config;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof hue !== 'number') return null;
  return {
    config: { id, name, hue },
    score: value.score,
    history: parseHistory(value.history),
    isNewRecord: value.isNewRecord === true,
    ...(typeof value.isRemote === 'boolean' ? { isRemote: value.isRemote } : {}),
    ...(value.loadingHistory === true ? { loadingHistory: true } : {}),
  };
};

/** Validates a received `SESSION_RESULTS` payload; `null` when it is unusable. */
export const parseTvSessionResults = (payload: unknown): TvSessionResults | null => {
  if (!isRecord(payload) || typeof payload.songId !== 'string' || !Array.isArray(payload.results)) {
    return null;
  }
  const results = payload.results.map(parseResult).filter((r): r is ScoreBoardPlayer => r !== null);
  return { songId: payload.songId, results };
};
