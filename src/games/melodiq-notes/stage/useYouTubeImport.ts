import { useCallback, useEffect, useRef, useState } from 'react';
import { listLibrarySongs, type CompanionSong } from '../../../lib/companion/songScoresApi';
import { importRecording, type ImportProgress } from './logic/youtubeImport';
import type { StageSongState } from './useStageSong';

export type ImportRun =
  | { kind: 'idle' }
  | { kind: 'running'; progress: ImportProgress | null }
  | { kind: 'failed'; error: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Score on stage → recording from YouTube in its song folder (server yt-dlp queue) → the score in
 * that folder, on stage with the song's mix, aligned right away (#568).
 */
export function useYouTubeImport(state: StageSongState) {
  const [run, setRun] = useState<ImportRun>({ kind: 'idle' });
  const [songs, setSongs] = useState<CompanionSong[] | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const alignPending = useRef(false);

  /** Song folders on the server, to show where the recording will go. */
  const refreshSongs = useCallback(() => {
    setSongsError(null);
    listLibrarySongs()
      .then(setSongs)
      .catch((e: unknown) => setSongsError(errorText(e)));
  }, []);

  const start = useCallback(
    async (meta: { title: string; artist: string }, youtubeUrl: string | null) => {
      ctrl.current?.abort();
      const controller = new AbortController();
      ctrl.current = controller;
      setRun({ kind: 'running', progress: null });
      try {
        const origin = state.origin;
        const result = await importRecording(
          {
            ...meta,
            youtubeUrl,
            scoreFile: state.currentScoreFile(),
            fromSong:
              origin?.kind === 'notes'
                ? { songId: origin.songId, scoreFile: origin.scoreFile }
                : null,
          },
          (progress) => {
            if (!controller.signal.aborted) setRun({ kind: 'running', progress });
          },
          undefined,
          controller.signal,
        );
        alignPending.current = true;
        const ok = await state.loadCatalogScore({
          file: result.score.file,
          label: result.score.label ?? null,
          ...result,
        });
        if (!ok) {
          alignPending.current = false;
          throw new Error('the stored score could not be opened');
        }
        setRun({ kind: 'idle' });
        return true;
      } catch (e) {
        if (!controller.signal.aborted) setRun({ kind: 'failed', error: errorText(e) });
        return false;
      }
    },
    [state],
  );

  /** Stops waiting; a download the server already started still finishes there. */
  const cancel = useCallback(() => {
    ctrl.current?.abort();
    setRun({ kind: 'idle' });
  }, []);

  // align once the score and the song's mix are on stage, unless it brought marks
  const { recording, loading, marks, alignNow } = state;
  useEffect(() => {
    if (!alignPending.current || loading || !recording) return;
    alignPending.current = false;
    if (!marks) void alignNow();
  }, [recording, loading, marks, alignNow]);

  useEffect(() => () => ctrl.current?.abort(), []);

  return { run, songs, songsError, refreshSongs, start, cancel };
}

export type YouTubeImportState = ReturnType<typeof useYouTubeImport>;
