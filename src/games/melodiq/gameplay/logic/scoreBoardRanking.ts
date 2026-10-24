import type { UserProfile } from '../../types';

export interface ScoreBoardHistoryEntry {
  score: number;
  date: string;
}

export interface ScoreBoardPlayer {
  config: UserProfile;
  score: number;
  history: ScoreBoardHistoryEntry[];
  isNewRecord: boolean;
  loadingHistory?: boolean;
  isRemote?: boolean;
}

export interface HistoricalEntry {
  name: string;
  score: number;
  date: string;
  hue: number;
}

const HISTORY_LIMIT = 50;

/** Current players, best score first. */
export const rankSession = (players: ScoreBoardPlayer[]): ScoreBoardPlayer[] =>
  [...players].sort((a, b) => b.score - a.score);

/**
 * All-time list across every player's stored history. Players without history
 * (remote sync, first play) contribute their current score so they still appear.
 */
export const buildHistoricalRanking = (
  players: ScoreBoardPlayer[],
  now: Date = new Date(),
): HistoricalEntry[] => {
  const entries: HistoricalEntry[] = [];
  for (const p of players) {
    if (p.history && p.history.length > 0) {
      for (const h of p.history) {
        entries.push({ name: p.config.name, score: h.score, date: h.date, hue: p.config.hue });
      }
    } else {
      entries.push({
        name: p.config.name,
        score: p.score,
        date: now.toISOString(),
        hue: p.config.hue,
      });
    }
  }
  return entries.sort((a, b) => b.score - a.score).slice(0, HISTORY_LIMIT);
};
