import { useEffect, useRef } from 'react';
import { isCompanionEnabled } from '../../../lib/companion/songScoresApi';
import type { AlignState, RecordingSource, SongOrigin } from './useStageSong';

interface AutoAlignInput {
  loading: boolean;
  hasSong: boolean;
  recording: RecordingSource | null;
  hasMarks: boolean;
  /** The marks come from an older alignment nobody corrected. */
  stale: boolean;
  align: AlignState;
  origin: SongOrigin | null;
  saved: boolean;
  alignNow: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

/**
 * Aligns a recording on its own as soon as it is on stage without marks, or with marks of an
 * older alignment. A score from a song folder keeps the result there right away, so every
 * device plays it from then on and nothing is aligned twice. A failed alignment is not retried;
 * the recording panel offers it again.
 */
export function useAutoAlign(input: AutoAlignInput) {
  const { loading, hasSong, recording, hasMarks, stale, align, origin, saved } = input;
  const { alignNow, saveToServer } = input;
  const saveWhenDone = useRef(false);

  useEffect(() => {
    if (loading || !hasSong || !recording || align.kind !== 'none') return;
    if (hasMarks && !stale) return;
    // a local recording would be uploaded with the marks: that stays the user's choice
    saveWhenDone.current = origin?.kind === 'notes' && !recording.file && isCompanionEnabled();
    void alignNow();
  }, [loading, hasSong, recording, hasMarks, stale, align.kind, origin, alignNow]);

  useEffect(() => {
    if (!saveWhenDone.current || align.kind === 'running' || align.kind === 'none') return;
    saveWhenDone.current = false;
    if (align.kind === 'done' && !saved) void saveToServer();
  }, [align.kind, saved, saveToServer]);
}
