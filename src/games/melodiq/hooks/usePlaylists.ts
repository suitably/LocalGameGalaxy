import { useState } from 'react';
import { useSongLibrary } from './useSongLibrary';

/**
 * Playlist view of the song library (#636): own playlists, or (toggle) the ones other users share
 * on the companion. Storage and ownership rules live in `useSongLibrary` / `songLibraryStore`.
 */
export const usePlaylists = () => {
  const library = useSongLibrary();
  const [showGlobalPlaylists, setShowGlobalPlaylists] = useState(false);
  const playlists = library.playlists.filter((p) => p.mine !== showGlobalPlaylists);

  return {
    playlists,
    allPlaylists: library.playlists,
    ownPlaylists: library.playlists.filter((p) => p.mine),
    storeKind: library.storeKind,
    showGlobalPlaylists,
    setShowGlobalPlaylists,
    isSyncing: library.isLoading,
    syncWithServer: library.refresh,
    createPlaylist: library.createPlaylist,
    deletePlaylist: library.deletePlaylist,
    updatePlaylistName: library.renamePlaylist,
    setPlaylistShared: library.setPlaylistShared,
    addSongToPlaylist: (playlistId: string, songId: string) =>
      library.addSongsToPlaylist(playlistId, [songId]),
    addSongsToPlaylist: library.addSongsToPlaylist,
    removeSongFromPlaylist: library.removeSongFromPlaylist,
    moveSongInPlaylist: library.moveSongInPlaylist,
  };
};
