import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScorePart, ScoreSong } from '../../../modules/music-score';
import { saveScoreParts } from '../../../lib/companion/notesLibraryApi';
import { defaultSeats } from './engine/players';
import type { StageEngine } from './engine/StageEngine';
import { readInstrument } from './logic/lastSession';
import {
  keptSeats,
  stageView,
  updatePartSettings,
  type PartChange,
  type ScorePartSettings,
} from './logic/partSettings';

const NONE: ScorePartSettings = {};

/**
 * Hidden and renamed parts of the score on stage (#564). The engine gets the song without hidden
 * parts (seats, pults and the part count follow it), carrying the hidden parts the synth plays; the
 * full score stays with the caller for alignment and export. Settings of a score from a song
 * folder are stored in its `song.json`; other scores keep them until another song is opened.
 */
export function useStageParts(
  engine: StageEngine,
  song: ScoreSong | null,
  stored: { songId: string; scoreFile: string | null } | null,
) {
  // settings belong to one song object, so a new song never shows the previous song's settings
  const [state, setState] = useState<{ song: ScoreSong | null; settings: ScorePartSettings }>({
    song: null,
    settings: NONE,
  });
  const [error, setError] = useState<string | null>(null);
  const settings = song && state.song === song ? state.settings : NONE;
  const view = useMemo(() => (song ? stageView(song, settings) : null), [song, settings]);

  useEffect(() => {
    if (!view || engine.song === view.song) return;
    const seats = keptSeats(engine.seats, view.song) ?? defaultSeats(view.song, readInstrument());
    engine.loadSong(view.song, seats);
  }, [engine, view]);

  /** The settings a song comes with (from its `song.json`), set as it is shown. */
  const seed = useCallback((next: ScoreSong, initial: ScorePartSettings | undefined) => {
    setState({ song: next, settings: initial ?? NONE });
    setError(null);
  }, []);

  const change = useCallback(
    async (part: ScorePart, edit: PartChange) => {
      if (!song) return;
      const next = updatePartSettings(settings, part, edit);
      setState({ song, settings: next });
      if (!stored?.scoreFile) return;
      try {
        await saveScoreParts(stored.songId, stored.scoreFile, next);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [song, settings, stored],
  );

  return {
    settings,
    /** Settings are stored on the server (a score from a song folder). */
    persistent: !!stored?.scoreFile,
    error,
    seed,
    change,
  };
}

export type StageParts = ReturnType<typeof useStageParts>;
