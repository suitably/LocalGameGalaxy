import { useEffect } from 'react';
import type { ScoreBoardPlayer } from '../logic/scoreBoardRanking';
import { SESSION_RESULTS_EVENT, toTvSessionResults } from '../../logic/tvSessionResults';

interface UseSessionResultsBroadcastProps {
  /** Host with a TV: only then the results leave this session. */
  enabled: boolean;
  isFinished: boolean;
  songId: string;
  results: readonly ScoreBoardPlayer[];
}

/**
 * Hands the finished session's results to `useTVMode` (window event), which streams them to the
 * TV. Re-sent whenever a row changes, e.g. when a phone singer's history arrives later.
 */
export function useSessionResultsBroadcast({
  enabled,
  isFinished,
  songId,
  results,
}: UseSessionResultsBroadcastProps): void {
  useEffect(() => {
    if (!enabled || !isFinished || results.length === 0) return;
    window.dispatchEvent(
      new CustomEvent(SESSION_RESULTS_EVENT, { detail: toTvSessionResults(songId, results) }),
    );
  }, [enabled, isFinished, songId, results]);
}
