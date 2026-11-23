import { type SongMeta } from '../../db';

/** What every song row in the library needs from its parent (#636). */
export interface SongRowActions {
  isFavorite: (songId: string) => boolean;
  onToggleFavorite: (songId: string) => void;
  onSelect: (song: SongMeta) => void;
  /** Opens the song's action menu (queue, playlist, favourite, …). */
  onLongPress: (song: SongMeta) => void;
}
