import { useState } from 'react';
import { type SongMeta } from '../db';

/** State of the "add to queue" dialog opened by long-pressing a song (not allowed for singers). */
export function useSongQueueDialog(
  isSinger: boolean,
  setFeedbackMessage: (msg: string | null) => void,
) {
  const [selectedSongForQueue, setSelectedSongForQueue] = useState<SongMeta | null>(null);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);

  const handleSongLongPress = (song: SongMeta) => {
    if (isSinger) {
      setFeedbackMessage('Als Sänger kannst du keine Lieder zur Warteschlange hinzufügen.');
      return;
    }
    setSelectedSongForQueue(song);
    setQueueDialogOpen(true);
  };

  return { selectedSongForQueue, queueDialogOpen, setQueueDialogOpen, handleSongLongPress };
}
