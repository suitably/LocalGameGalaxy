/**
 * Opens the song last on stage again (#635). A demo song is on stage from the first render
 * (`initialExample`); a song from the companion server loads once it answers, unless the
 * player picked another song meanwhile. A song that is gone keeps the demo on stage.
 */
import { useEffect, useRef } from 'react';
import {
  getCompanionSong,
  hasKaraoke,
  isCompanionEnabled,
} from '../../../lib/companion/songScoresApi';
import { DEMO_SONGS } from '../demoSongs';
import { readLastSong } from './logic/lastSession';
import type { StageSongState } from './useStageSong';

/** The demo song to start with: the last one played, else the first. */
export function initialExample() {
  const last = readLastSong();
  const demo =
    (last?.kind === 'example' && DEMO_SONGS.find((d) => d.title === last.title)) || DEMO_SONGS[0];
  return { title: demo.title, xml: demo.xmlContent };
}

export function useResumeLastSong(
  state: Pick<StageSongState, 'origin' | 'loadCatalogScore' | 'loadKaraoke'>,
) {
  const startOrigin = useRef(state.origin);
  const current = useRef(state.origin);
  useEffect(() => {
    current.current = state.origin;
  }, [state.origin]);
  const { loadCatalogScore, loadKaraoke } = state;

  useEffect(() => {
    const last = readLastSong();
    if (!last || last.kind === 'example' || !isCompanionEnabled()) return;
    let cancelled = false;
    getCompanionSong(last.songId)
      .then((song) => {
        // the player chose something else while the server answered
        if (cancelled || current.current !== startOrigin.current) return;
        if (last.kind === 'karaoke') {
          if (hasKaraoke(song)) void loadKaraoke(song);
          return;
        }
        const score = song.scores?.find((s) => s.file === last.scoreFile);
        if (score)
          void loadCatalogScore({ file: score.file, label: score.label ?? null, score, song });
      })
      .catch(() => {
        // server offline or song deleted: the demo stays
      });
    return () => {
      cancelled = true;
    };
  }, [loadCatalogScore, loadKaraoke]);
}
