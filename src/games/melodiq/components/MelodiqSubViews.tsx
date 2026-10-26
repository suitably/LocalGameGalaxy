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
  onCloseSubView: () => void;
}

/** Connection and playlist screens; kept mounted and toggled via `display`. */
export const MelodiqSubViews: React.FC<MelodiqSubViewsProps> = ({
  currentView,
  setCurrentView,
  onCloseSubView,
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
        <MelodiqConnection onBack={onCloseSubView} />
      </Box>

      <Box sx={{ display: currentView === 'Playlists' ? 'block' : 'none', height: '100%' }}>
        <MelodiqPlaylists
          onBack={onCloseSubView}
          onSelectPlaylist={(p) => {
            setActivePlaylist(p);
            setCurrentView('PlaylistDetails');
          }}
        />
      </Box>

      <Box sx={{ display: currentView === 'PlaylistDetails' ? 'block' : 'none', height: '100%' }}>
        {activePlaylist && (
          <PlaylistDetails playlist={activePlaylist} onBack={() => setCurrentView('Playlists')} />
        )}
      </Box>
    </>
  );
};
