import React, { useState } from 'react';
import { Box } from '@mui/material';
import { type Playlist } from '../db';
import { MelodiqPlaylists } from './MelodiqPlaylists';
import { PlaylistDetails } from './PlaylistDetails';
import { MelodiqConnection } from '../MelodiqConnection';
import { type MelodiqView } from '../hooks/useMelodiqNavigation';

interface MelodiqSubViewsProps {
  currentView: MelodiqView;
  setCurrentView: (view: MelodiqView) => void;
}

/**
 * Connection and playlist screens; kept mounted and toggled via `display`. They have no own back
 * buttons: the GlobalHeader back arrow (useMelodiqHeader -> useMelodiqNavigation) leads
 * playlist details -> playlists -> home.
 */
export const MelodiqSubViews: React.FC<MelodiqSubViewsProps> = ({
  currentView,
  setCurrentView,
}) => {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

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
        <MelodiqPlaylists
          onSelectPlaylist={(p) => {
            setActivePlaylist(p);
            setCurrentView('PlaylistDetails');
          }}
        />
      </Box>

      <Box sx={{ display: currentView === 'PlaylistDetails' ? 'block' : 'none', height: '100%' }}>
        {activePlaylist && <PlaylistDetails playlist={activePlaylist} />}
      </Box>
    </>
  );
};
