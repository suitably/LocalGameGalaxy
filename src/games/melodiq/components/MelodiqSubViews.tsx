import React from 'react';
import { Box } from '@mui/material';
import { MelodiqPlaylists } from './MelodiqPlaylists';
import { PlaylistDetails } from './PlaylistDetails';
import { MelodiqConnection } from '../MelodiqConnection';
import { type MelodiqView } from '../hooks/useMelodiqNavigation';

interface MelodiqSubViewsProps {
  currentView: MelodiqView;
  activePlaylistId: string | null;
  /** Shows the playlist details view for this playlist. */
  onOpenPlaylist: (playlistId: string) => void;
}

/**
 * Connection and playlist screens; kept mounted and toggled via `display`. They have no own back
 * buttons: the GlobalHeader back arrow (useMelodiqHeader -> useMelodiqNavigation) leads
 * playlist details -> playlists -> home.
 */
export const MelodiqSubViews: React.FC<MelodiqSubViewsProps> = ({
  currentView,
  activePlaylistId,
  onOpenPlaylist,
}) => {
  return (
    <>
      <Box
        sx={{
          display: currentView === 'Connection' ? 'block' : 'none',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <MelodiqConnection />
      </Box>

      <Box sx={{ display: currentView === 'Playlists' ? 'block' : 'none', height: '100%' }}>
        <MelodiqPlaylists onSelectPlaylist={(p) => onOpenPlaylist(p.id)} />
      </Box>

      <Box sx={{ display: currentView === 'PlaylistDetails' ? 'block' : 'none', height: '100%' }}>
        {activePlaylistId && <PlaylistDetails playlistId={activePlaylistId} />}
      </Box>
    </>
  );
};
