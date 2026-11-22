/**
 * Best result per player and song, kept between visits, and the song's leaderboard (#699)
 * [ID: GAME-MELODIQ-NOTES-SONG-RESULTS]
 *
 * Only a full run counts: perform mode, full speed, no loop. A song is identified by
 * `songKeyOf` (the hash the pult protocol uses), so a changed chart starts a new table. The stage
 * judges every player, pults included, so its device keeps the results of the whole party.
 */
import type { InstrumentKind } from '../../../../modules/music-score';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import type { StageMode } from '../engine/types';
import { accuracy, stars, type PlayerStats } from './judging';

/** Oldest results are dropped beyond this many, so the stored list stays small. */
export const MAX_RESULTS = 500;

export interface SongResult {
  songKey: string;
  title: string;
  /** Who played: a pult's or this device's party name; null for a numbered seat. */
  player: string | null;
  /** Seat number, the label when `player` is null. */
  seat: number;
  partName: string;
  inst: InstrumentKind;
  score: number;
  accuracy: number;
  stars: number;
  maxCombo: number;
  /** When this best result was played (ms since epoch). */
  at: number;
}

export interface RankedResult extends SongResult {
  /** 1-based; players with the same score share a rank (1, 1, 3). */
  rank: number;
}

/** What a leaderboard shows of a ranked result: the stage's table and the pults' (#699). */
export type LeaderboardRow = Pick<RankedResult, 'rank' | 'player' | 'seat' | 'inst' | 'score'>;

export const toLeaderboardRow = ({
  rank,
  player,
  seat,
  inst,
  score,
}: RankedResult): LeaderboardRow => ({
  rank,
  player,
  seat,
  inst,
  score,
});

/** The engine fields a finished run is read from (`StageEngine` fits). */
export interface FinishedRun {
  mode: StageMode;
  speed: number;
  loop: unknown;
  players: {
    no: number;
    name?: string;
    remoteId?: string;
    part: { name: string };
    instrument: { kind: InstrumentKind };
    stats: PlayerStats;
  }[];
}

/** Identity of a player within a song: the name when known, else the seat. */
export const playerKey = (r: Pick<SongResult, 'player' | 'seat'>) =>
  r.player ? `name:${r.player.trim().toLowerCase()}` : `seat:${r.seat}`;

const sameEntry = (a: SongResult, b: SongResult) =>
  a.songKey === b.songKey && playerKey(a) === playerKey(b);

/** Whether a run beats the stored best: more points, or as many with better accuracy. */
export const beats = (run: SongResult, best: SongResult) =>
  run.score > best.score || (run.score === best.score && run.accuracy > best.accuracy);

/**
 * Results of a finished run, one per player who played a note; empty when the run does not
 * count. `localName` names the player on this screen when there is exactly one.
 */
export function runResults(
  run: FinishedRun,
  song: { key: string; title: string },
  localName: string | null,
  at: number,
): SongResult[] {
  if (run.mode !== 'perform' || run.speed !== 1 || run.loop) return [];
  const local = run.players.filter((p) => !p.remoteId);
  return run.players
    .filter((p) => p.stats.judged > 0)
    .map((p) => {
      const acc = accuracy(p.stats);
      const name = p.remoteId ? p.name : local.length === 1 ? localName : null;
      return {
        songKey: song.key,
        title: song.title,
        player: name?.trim() || null,
        seat: p.no,
        partName: p.part.name,
        inst: p.instrument.kind,
        score: p.stats.score,
        accuracy: acc,
        stars: stars(acc),
        maxCombo: p.stats.maxCombo,
        at,
      };
    });
}

/** Stored list with the runs merged in (a run replaces a player's entry only when it beats it). */
export function mergeResults(stored: SongResult[], runs: SongResult[]): SongResult[] {
  let next = stored;
  for (const run of runs) {
    const i = next.findIndex((r) => sameEntry(r, run));
    if (i < 0) next = [...next, run];
    else if (beats(run, next[i])) next = next.map((r, j) => (j === i ? run : r));
  }
  if (next.length <= MAX_RESULTS) return next;
  return [...next].sort((a, b) => b.at - a.at).slice(0, MAX_RESULTS);
}

/** Entries of one song, best first: score, then accuracy, then who got there first. */
export function leaderboard(results: SongResult[], songKey: string): RankedResult[] {
  const sorted = results
    .filter((r) => r.songKey === songKey)
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.at - b.at);
  const ranked: RankedResult[] = [];
  sorted.forEach((r, i) => {
    const prev = ranked[i - 1];
    ranked.push({ ...r, rank: prev && prev.score === r.score ? prev.rank : i + 1 });
  });
  return ranked;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Validates stored JSON (it may come from an older version or be edited by hand). */
export function parseResults(raw: unknown): SongResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is SongResult => {
    if (!v || typeof v !== 'object') return false;
    const r = v as Record<string, unknown>;
    return (
      isText(r.songKey) &&
      typeof r.title === 'string' &&
      (r.player === null || isText(r.player)) &&
      isNum(r.seat) &&
      typeof r.partName === 'string' &&
      isText(r.inst) &&
      isNum(r.score) &&
      isNum(r.accuracy) &&
      isNum(r.stars) &&
      isNum(r.maxCombo) &&
      isNum(r.at)
    );
  });
}

let version = 0;
const listeners = new Set<() => void>();

/** Calls `fn` whenever `saveResults` stored something new; returns the unsubscribe. */
export function subscribeResults(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Grows with every stored change (for `useSyncExternalStore`). */
export const getResultsVersion = () => version;

export const readResults = (): SongResult[] =>
  parseResults(storage.getJson<unknown>(STORAGE_KEYS.MELODIQ_NOTES_RESULTS, []));

/** Stores the runs and returns the new list. */
export function saveResults(runs: SongResult[]): SongResult[] {
  const stored = readResults();
  if (!runs.length) return stored;
  const next = mergeResults(stored, runs);
  if (next !== stored) {
    storage.setJson(STORAGE_KEYS.MELODIQ_NOTES_RESULTS, next);
    version++;
    listeners.forEach((fn) => fn());
  }
  return next;
}
