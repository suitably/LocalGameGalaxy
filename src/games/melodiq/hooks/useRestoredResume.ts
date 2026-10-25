import { useCallback, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { resolveInitialPlaybackTime } from '../logic/initialPlaybackTime';
import type { RestoredSong } from '../logic/savedPlayback';

interface Args {
  selectedSong: { id: string } | null;
  restoredSong: RestoredSong | null;
  onClearRestoredSong?: () => void;
  onSelectSong: (song: RestoredSong, forcePlay: boolean) => void;
}

/**
 * Resume handling for the song restored after a page reload / route change: resume continues at
 * the saved position, restart plays it from the beginning. The position is kept in state because
 * `restoredSong` is cleared as soon as the song is selected again.
 */
export function useRestoredResume({
  selectedSong,
  restoredSong,
  onClearRestoredSong,
  onSelectSong,
}: Args) {
  const [resumeFrom, setResumeFrom] = useState<RestoredSong | null>(null);

  const initialTime = useMemo(
    () => resolveInitialPlaybackTime(selectedSong, restoredSong ?? resumeFrom),
    [selectedSong, restoredSong, resumeFrom],
  );

  const handleResume = useCallback(
    (fromStart = false) => {
      if (!restoredSong) return;
      setResumeFrom(fromStart ? null : restoredSong);
      if (fromStart) storage.remove(STORAGE_KEYS.MELODIQ_SAVED_TIME);
      onClearRestoredSong?.();
      onSelectSong(restoredSong, true);
    },
    [restoredSong, onClearRestoredSong, onSelectSong],
  );

  const resetResume = useCallback(() => {
    setResumeFrom(null);
  }, []);

  return { initialTime, handleResume, resetResume };
}
