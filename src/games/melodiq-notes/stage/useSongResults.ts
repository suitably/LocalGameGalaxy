/**
 * Stores the results of the run that just finished and reads the song's leaderboard (#699).
 * Mount it with the results screen: it saves once per mount. Saving the same run twice (React
 * strict mode calls the initialiser twice) changes nothing, because a run replaces an entry only
 * when it beats it.
 */
import { useState } from 'react';
import { getOrCreatePlayerName } from '../../../features/party/logic/playerName';
import { songKeyOf } from '../pult/logic/pultSong';
import type { StageEngine } from './engine/StageEngine';
import {
  leaderboard,
  playerKey,
  runResults,
  saveResults,
  type RankedResult,
} from './logic/songResults';

export interface SongResultsView {
  /** Whether this run counted (perform mode, full speed, no loop). */
  counted: boolean;
  board: RankedResult[];
  /** `playerKey`s whose stored best is the run that just finished (or ties it). */
  fresh: ReadonlySet<string>;
}

function storeRun(engine: StageEngine): SongResultsView {
  const song = engine.song;
  if (!song) return { counted: false, board: [], fresh: new Set() };
  const key = songKeyOf(song);
  const runs = runResults(engine, { key, title: song.title }, getOrCreatePlayerName(), Date.now());
  const board = leaderboard(saveResults(runs), key);
  const fresh = new Set(
    board
      .filter((b) =>
        runs.some(
          (r) => playerKey(r) === playerKey(b) && r.score === b.score && r.accuracy === b.accuracy,
        ),
      )
      .map(playerKey),
  );
  return { counted: runs.length > 0, board, fresh };
}

export function useSongResults(engine: StageEngine): SongResultsView {
  const [view] = useState(() => storeRun(engine));
  return view;
}
