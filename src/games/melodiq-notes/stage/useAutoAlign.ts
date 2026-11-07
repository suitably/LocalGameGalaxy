import { useEffect } from 'react';
import type { AlignState, RecordingSource } from './useStageSong';

interface AutoAlignInput {
  loading: boolean;
  hasSong: boolean;
  recording: RecordingSource | null;
  hasMarks: boolean;
  align: AlignState;
  alignNow: () => Promise<void>;
}

/**
 * Aligns a recording on its own as soon as it is on stage without any marks, so it plays in time
 * right away. The result stays on this device until the user saves it (stage or folder view).
 * Outdated marks keep playing (the recording panel says so) instead of being replaced while the
 * song plays; a failed alignment is not retried.
 */
export function useAutoAlign(input: AutoAlignInput) {
  const { loading, hasSong, recording, hasMarks, align, alignNow } = input;
  useEffect(() => {
    if (loading || !hasSong || !recording || hasMarks || align.kind !== 'none') return;
    void alignNow();
  }, [loading, hasSong, recording, hasMarks, align.kind, alignNow]);
}
