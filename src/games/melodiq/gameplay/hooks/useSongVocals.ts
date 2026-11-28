import { useEffect, useMemo, useState } from 'react';
import { type Song } from '../../db';
import { songVocals, txtHasNotes, type SongVocals } from '../../logic/songVocals';
import { loadScoreVocals, ScoreVocalsLoadError } from '../../logic/scoreVocals';
import { fetchCompanionFile } from '../../../../lib/companion/songScoresApi';
import { getSongMarks } from '../../../../lib/companion/notesLibraryApi';
import { readScoreBytes } from '../../../../modules/music-score';
import { type SongWithNotes } from '../PitchVisualizer';

interface SongVocalsState {
  parsedSong: SongWithNotes | null;
  contentLoading: boolean;
  /** i18n key of the load error (`melodiq.session.*`). */
  loadError: string | null;
}

const browserXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

const SCORE_DEPS = {
  fetchFile: fetchCompanionFile,
  fetchMarks: getSongMarks,
  readScore: (file: string, data: ArrayBuffer) => readScoreBytes(file, data, browserXml).song,
};

const failed = (key: string): SongVocalsState => ({
  parsedSong: null,
  contentLoading: false,
  loadError: `melodiq.session.${key}`,
});

/** The karaoke `.txt` read synchronously; null when the song has none. */
function txtState(txtContent: string | undefined): SongVocalsState | null {
  if (!txtContent) return null;
  try {
    return { parsedSong: songVocals({ txtContent }), contentLoading: false, loadError: null };
  } catch (e) {
    console.error("Failed to read the song's vocals", e);
    return failed('parse_failed');
  }
}

/**
 * The song's sung view from the shared ScoreSong model (#604): its karaoke `.txt` when it has notes,
 * else the vocal part of its sheet music fetched from the companion server, else the note-less `.txt`.
 */
export function useSongVocals(song: Song): SongVocalsState {
  const { id, txtContent, scores } = song;
  // A `.txt` without notes (the server's minimal one) gives way to sheet music
  const needsScore = !txtHasNotes(txtContent) && !!scores?.length;
  const fromTxt = useMemo(
    () => (needsScore ? null : txtState(txtContent)),
    [needsScore, txtContent],
  );
  const [fromScore, setFromScore] = useState<{ id: string; state: SongVocalsState } | null>(null);

  useEffect(() => {
    if (!needsScore || !scores) return;
    let mounted = true;
    const done = (state: SongVocalsState) => {
      if (mounted) setFromScore({ id, state });
    };
    loadScoreVocals(id, scores, SCORE_DEPS)
      .then((vocals: SongVocals) =>
        done({ parsedSong: vocals, contentLoading: false, loadError: null }),
      )
      .catch((e: unknown) =>
        // Nothing to sing in the sheet music (e.g. an instrumental arrangement): a note-less
        // `.txt` still plays the song, as before #604
        done(
          txtState(txtContent) ??
            failed(e instanceof ScoreVocalsLoadError ? e.reason : 'score_load_failed'),
        ),
      );
    return () => {
      mounted = false;
    };
  }, [id, needsScore, scores, txtContent]);

  if (fromTxt) return fromTxt;
  if (!needsScore) return failed('no_lyrics');
  if (fromScore?.id === id) return fromScore.state;
  return { parsedSong: null, contentLoading: true, loadError: null };
}
