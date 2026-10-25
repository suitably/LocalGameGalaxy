interface SongWithTime {
  id: string;
  currentTime?: unknown;
}

const positiveTime = (song: SongWithTime | null | undefined): number | null =>
  song && typeof song.currentTime === 'number' && song.currentTime > 0 ? song.currentTime : null;

/**
 * Start position of the selected song: its own `currentTime`, else the position of the
 * song restored after a page reload (only if it is the same song), else 0.
 */
export function resolveInitialPlaybackTime(
  selectedSong: SongWithTime | null,
  restoredSong: SongWithTime | null,
): number {
  if (!selectedSong) return 0;
  const own = positiveTime(selectedSong);
  if (own !== null) return own;
  if (restoredSong && restoredSong.id === selectedSong.id) {
    return positiveTime(restoredSong) ?? 0;
  }
  return 0;
}
