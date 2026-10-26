import { useCallback, useEffect, useRef, useState } from 'react';
import { listCompanionSongs, type CompanionSong } from '../../../lib/companion/songScoresApi';
import { importRecording, type ImportProgress } from './logic/youtubeImport';
import type { StageSongState } from './useStageSong';

export type ImportRun =
  | { kind: 'idle' }
  | { kind: 'running'; progress: ImportProgress | null }
  | { kind: 'failed'; error: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Score on stage → recording from YouTube in a Melodiq song folder (server yt-dlp queue) →
 * the score's Notes piece linked to that song, on stage with the song's mix, aligned right away.
 */
export function useYouTubeImport(state: StageSongState) {
  const [run, setRun] = useState<ImportRun>({ kind: 'idle' });
  const [songs, setSongs] = useState<CompanionSong[] | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  /** Song folders on the server, to show where the recording will go. */
  const refreshSongs = useCallback(() => {
    setSongsError(null);
    listCompanionSongs()
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
            fromPiece:
              origin?.kind === 'notes'
                ? { pieceId: origin.pieceId, scoreFile: origin.scoreFile, songId: origin.songId }
                : null,
          },
          (progress) => {
            if (!controller.signal.aborted) setRun({ kind: 'running', progress });
          },
          undefined,
          controller.signal,
        );
        // useStageSong aligns the song's mix once it is on stage, unless it brought marks
        const ok = await state.loadCatalogScore({ file: result.score.file, ...result });
        if (!ok) {
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

  useEffect(() => () => ctrl.current?.abort(), []);

  return { run, songs, songsError, refreshSongs, start, cancel };
}

export type YouTubeImportState = ReturnType<typeof useYouTubeImport>;
