import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanionSong } from '../../../lib/companion/songScoresApi';
import { browserBatchApi } from './batchImportApi';
import { replaceSongRecording, type BatchProgress } from './logic/batchImport';

export type ReplaceRun =
  | { kind: 'idle' }
  | { kind: 'running'; progress: BatchProgress | null }
  | { kind: 'done'; aligned: number }
  | { kind: 'failed'; error: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Downloads another YouTube video as a song folder's mix and aligns its scores again. */
export function useRecordingReplace(
  song: CompanionSong,
  onReplaced: (next: CompanionSong) => void,
) {
  const [run, setRun] = useState<ReplaceRun>({ kind: 'idle' });
  const ctrl = useRef<AbortController | null>(null);

  const start = useCallback(
    async (youtubeUrl: string) => {
      ctrl.current?.abort();
      const controller = new AbortController();
      ctrl.current = controller;
      setRun({ kind: 'running', progress: null });
      try {
        const result = await replaceSongRecording(
          song,
          youtubeUrl,
          browserBatchApi,
          (progress) => {
            if (!controller.signal.aborted) setRun({ kind: 'running', progress });
          },
          controller.signal,
        );
        onReplaced(result.song);
        setRun({ kind: 'done', aligned: result.aligned });
      } catch (e) {
        if (!controller.signal.aborted) setRun({ kind: 'failed', error: errorText(e) });
      }
    },
    [song, onReplaced],
  );

  useEffect(() => () => ctrl.current?.abort(), []);

  return { run, start };
}
